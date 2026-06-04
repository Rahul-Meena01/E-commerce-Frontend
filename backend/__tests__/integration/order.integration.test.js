import request from 'supertest';
import { connectTestDB, disconnectTestDB, clearDatabase, app } from '../helpers/testSetup.js';
import Category from '../../models/Category.js';
import SubCategory from '../../models/SubCategory.js';
import Product from '../../models/Product.js';

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

afterEach(async () => {
  await clearDatabase();
});

describe('Order Integration Tests', () => {
  let token;
  let productId;
  let productInstance;

  beforeEach(async () => {
    // 1. Register and login user to get token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Order User', email: 'order@example.com', password: 'Password1' });
    token = registerRes.body.token;

    // 2. Create seed hierarchy
    const category = await Category.create({ name: 'Fashion', slug: 'fashion' });
    const subCategory = await SubCategory.create({
      parentCategory: category._id,
      name: 'Pants',
      slug: 'pants',
    });
    productInstance = await Product.create({
      subCategory: subCategory._id,
      name: 'Classic Chino Pants',
      brand: 'Loft Classic',
      price: 1200,
      stock: 5,
      image: 'test-pants.jpg',
      slug: 'classic-chino-pants',
      status: 'Active',
    });
    productId = productInstance._id.toString();
  });

  test('POST /api/orders - successfully creates order and decrements stock', async () => {
    // Add to cart first
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddress: {
          address: '123 Test St',
          city: 'Metro',
          postalCode: '10001',
          country: 'Testland',
        },
        paymentMethod: 'COD',
        shippingMethod: 'standard',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.orderItems.length).toBe(1);
    expect(res.body.orderItems[0].qty).toBe(2);

    // Verify stock was decremented in database
    const updatedProduct = await Product.findById(productId);
    expect(updatedProduct.stock).toBe(3); // 5 - 2
  });

  test('POST /api/orders - rejects order creation if stock is insufficient', async () => {
    // Add to cart first (allowed because stock is 5)
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 4 });

    // Manually drop stock to 2 in database to simulate concurrent purchase
    await Product.findByIdAndUpdate(productId, { $set: { stock: 2 } });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddress: {
          address: '123 Test St',
          city: 'Metro',
          postalCode: '10001',
          country: 'Testland',
        },
        paymentMethod: 'COD',
        shippingMethod: 'standard',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient stock for product');

    // Verify stock remained 2
    const finalProduct = await Product.findById(productId);
    expect(finalProduct.stock).toBe(2);
  });
});

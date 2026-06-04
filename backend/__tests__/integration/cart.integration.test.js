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

describe('Cart Integration Tests', () => {
  let token;
  let productId;

  beforeEach(async () => {
    // 1. Register and login a user to get auth token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Cart User', email: 'cart@example.com', password: 'Password1' });
    token = registerRes.body.token;

    // 2. Create seed category, subcategory, and product
    const category = await Category.create({ name: 'Apparel', slug: 'apparel' });
    const subCategory = await SubCategory.create({
      parentCategory: category._id,
      name: 'Shirts',
      slug: 'shirts',
    });
    const product = await Product.create({
      subCategory: subCategory._id,
      name: 'Premium Cotton Shirt',
      brand: 'Loft Classic',
      price: 600,
      stock: 10,
      image: 'test-shirt.jpg',
      slug: 'premium-cotton-shirt',
      status: 'Active',
    });
    productId = product._id.toString();
  });

  test('GET /api/cart - retrieves empty cart initially', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.totals.subtotal).toBe(0);
  });

  test('POST /api/cart/add - adds item to cart', async () => {
    const res = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].product._id || res.body.data.items[0].product).toBe(productId);
    expect(res.body.data.items[0].quantity).toBe(2);
    expect(res.body.data.totals.subtotal).toBe(1200);
  });

  test('PUT /api/cart/update/:productId - updates item quantity', async () => {
    // Add first
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1 });

    const res = await request(app)
      .put(`/api/cart/update/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items[0].quantity).toBe(5);
    expect(res.body.data.totals.subtotal).toBe(3000);
  });

  test('DELETE /api/cart/remove/:productId - removes item from cart', async () => {
    // Add first
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 1 });

    const res = await request(app)
      .delete(`/api/cart/remove/${productId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBe(0);
    expect(res.body.data.totals.subtotal).toBe(0);
  });
});

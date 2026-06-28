# Comprehensive Postman Testing Guide

This guide provides step-by-step instructions and example payloads for testing all major functionalities and APIs in the project using Postman.

## ⚙️ Pre-requisites & Setup

1. **Base URL**: Make sure your backend server is running (e.g., `http://localhost:3000`).
2. **Postman Environment**: Create a new environment in Postman and add these variables:
   - `baseUrl`: `http://localhost:3000`
   - `userToken`: (Leave blank, will be filled later)
   - `adminToken`: (Leave blank, will be filled later)
   - `vendorToken`: (Leave blank, will be filled later)
3. **Authorization**: For any protected route, go to the **Authorization** tab in Postman, select **Bearer Token**, and use the appropriate token variable (e.g., `{{userToken}}`, `{{adminToken}}`, or `{{vendorToken}}`).

---

## 1. Authentication (Users, Admins, Vendors)

### 1.1 Register User
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/register`
- **Body (JSON)**:
  ```json
  {
    "name": "Test User",
    "email": "user@test.com",
    "password": "password123",
    "phone": "1234567890"
  }
  ```

### 1.2 Login User
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/login`
- **Body (JSON)**:
  ```json
  {
    "email": "user@test.com",
    "password": "password123"
  }
  ```
- **Action**: Copy the `token` from the response and save it as `{{userToken}}` in your environment.

### 1.3 Register Vendor
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/auth/register-vendor`
- **Body (JSON)**:
  ```json
  {
    "name": "Test Vendor",
    "email": "vendor@test.com",
    "password": "password123",
    "phone": "1112223333",
    "shopName": "Vendor Store"
  }
  ```
- **Action**: Login as vendor and save the token as `{{vendorToken}}`.

---

## 2. Product Management (Admin)

Ensure you use `{{adminToken}}` for these requests.

### 2.1 Create Category
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/category/create`
- **Body (JSON)**:
  ```json
  {
    "name": "Electronics",
    "slug": "electronics",
    "status": "Active"
  }
  ```
- **Action**: Note the `_id` of the created category to use in the next steps.

### 2.2 Create Subcategory
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/subCategory/create`
- **Body (JSON)**:
  ```json
  {
    "name": "Smartphones",
    "category": "<CATEGORY_ID_FROM_ABOVE>",
    "description": "Mobile phones"
  }
  ```
- **Action**: Note the `_id` of the created subcategory.

### 2.3 Create Admin Product
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/product/create`
- **Body (form-data)**:
  - `name` (text): "iPhone 14"
  - `brand` (text): "Apple"
  - `price` (text): "999"
  - `stock` (text): "50"
  - `subCategory` (text): `<SUBCATEGORY_ID_FROM_ABOVE>`
  - `image` (file): Upload an image file.

---

## 3. Vendor Store Management

Ensure you use `{{vendorToken}}` for these requests.

### 3.1 Create Vendor Product
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/vendor/vendor-slug/products/` *(Replace `vendor-slug` with your vendor's slug)*
- **Body (JSON)**:
  ```json
  {
    "name": "Vendor Custom Shirt",
    "price": 25,
    "salePrice": 20,
    "stock": 100,
    "description": "A high quality custom shirt",
    "images": ["https://example.com/shirt.jpg"]
  }
  ```
- **Action**: Note the `_id` of the created vendor product.

---

## 4. Shopping Experience (User)

Ensure you use `{{userToken}}` for these requests.

### 4.1 Get All Public Products
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/product/public/all`

### 4.2 Add Item to Cart
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/cart/add`
- **Body (JSON)**:
  ```json
  {
    "productId": "<PRODUCT_OR_VENDOR_PRODUCT_ID>",
    "qty": 2
  }
  ```

### 4.3 View Cart
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/cart/`

### 4.4 Add Item to Wishlist
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/wishlist/add`
- **Body (JSON)**:
  ```json
  {
    "productId": "<PRODUCT_ID>"
  }
  ```

---

## 5. Order & Checkout Flow (User)

Ensure you use `{{userToken}}`.

### 5.1 Create Order (Checkout)
This API dynamically fetches item details from both the Admin `Product` and `VendorProduct` collections.
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/orders/`
- **Body (JSON)**:
  ```json
  {
    "orderItems": [
      {
        "product": "<PRODUCT_ID_OR_VENDOR_PRODUCT_ID>",
        "qty": 1
      }
    ],
    "shippingAddress": {
      "address": "123 Main St",
      "city": "New York",
      "postalCode": "10001",
      "country": "USA"
    },
    "paymentMethod": "COD"
  }
  ```
- **Action**: This will atomically deduct stock from the respective catalog (Admin or Vendor). Note the order `_id`.

### 5.2 View My Orders
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/orders/myorders`

### 5.3 Cancel Order
- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/orders/<ORDER_ID>/cancel`
- **Action**: This will cancel the order and automatically restore stock to the correct catalog (Admin or Vendor).

---

## 6. Order Management (Admin)

Ensure you use `{{adminToken}}`.

### 6.1 View All Orders
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/orders/`

### 6.2 Update Order Status
- **Method**: `PUT`
- **URL**: `{{baseUrl}}/api/orders/<ORDER_ID>/status`
- **Body (JSON)**:
  ```json
  {
    "status": "Shipped"
  }
  ```

---

## 7. Coupons & Gift Cards

### 7.1 Admin Creates Coupon
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/coupon/create`
- **Authorization**: `{{adminToken}}`
- **Body (JSON)**:
  ```json
  {
    "code": "SUMMER20",
    "discountType": "percentage",
    "discountValue": 20,
    "maxUsesPerUser": 1,
    "expiresAt": "2027-12-31"
  }
  ```

### 7.2 User Applies Coupon to Cart
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/cart/apply-coupon`
- **Authorization**: `{{userToken}}`
- **Body (JSON)**:
  ```json
  {
    "code": "SUMMER20"
  }
  ```

---

*This guide covers the primary workflows. For a complete list of endpoints, refer to `APIS.md`.*

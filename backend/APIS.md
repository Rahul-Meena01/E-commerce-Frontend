# API Endpoints

Generated: 2026-06-04

**TOTAL 103 API's**

This document lists all Express routes in the project with their HTTP method, full path (including router mounts), and source file.

---

**Auth (/api/auth)**  
- POST /api/auth/register — Register a new user — [backend/routes/auth.js](backend/routes/auth.js)
- POST /api/auth/register-admin — Register a new admin — [backend/routes/auth.js](backend/routes/auth.js)
- POST /api/auth/register-vendor — Register a new vendor — [backend/routes/auth.js](backend/routes/auth.js)
- POST /api/auth/login — Login (user/vendor/admin) — [backend/routes/auth.js](backend/routes/auth.js)
- POST /api/auth/logout — Logout (clear cookie) — [backend/routes/auth.js](backend/routes/auth.js)

**Categories (/api/category)**  
- POST /api/category/create — Create category — [backend/routes/category.js](backend/routes/category.js)
- GET  /api/category/all — List categories (paginated) — [backend/routes/category.js](backend/routes/category.js)
- GET  /api/category/search — Search categories — [backend/routes/category.js](backend/routes/category.js)
- GET  /api/category/public/all — Public list of active categories — [backend/routes/category.js](backend/routes/category.js)
- PUT  /api/category/update/:id — Update category — [backend/routes/category.js](backend/routes/category.js)
- DELETE /api/category/delete/:id — Delete category — [backend/routes/category.js](backend/routes/category.js)

**SubCategories (/api/subCategory)**  
- POST /api/subCategory/create — Create subcategory — [backend/routes/subCategory.js](backend/routes/subCategory.js)
- GET  /api/subCategory/all — List subcategories (paginated) — [backend/routes/subCategory.js](backend/routes/subCategory.js)
- GET  /api/subCategory/search — Search subcategories — [backend/routes/subCategory.js](backend/routes/subCategory.js)
- GET  /api/subCategory/public/all — Public list of active subcategories — [backend/routes/subCategory.js](backend/routes/subCategory.js)
- PUT  /api/subCategory/update/:id — Update subcategory — [backend/routes/subCategory.js](backend/routes/subCategory.js)
- DELETE /api/subCategory/delete/:id — Delete subcategory — [backend/routes/subCategory.js](backend/routes/subCategory.js)

**Products (/api/product)**  
- POST /api/product/create — Create product (with uploads) — [backend/routes/product.js](backend/routes/product.js)
- GET  /api/product/all — Admin: list products — [backend/routes/product.js](backend/routes/product.js)
- GET  /api/product/public/all — Public: list active products — [backend/routes/product.js](backend/routes/product.js)
- GET  /api/product/public/:id — Public: single product — [backend/routes/product.js](backend/routes/product.js)
- PUT  /api/product/update/:id — Update product (with uploads) — [backend/routes/product.js](backend/routes/product.js)
- DELETE /api/product/delete/:id — Delete product — [backend/routes/product.js](backend/routes/product.js)

**Variants (/api/variant)**  
- POST /api/variant/create — Create variant (with uploads) — [backend/routes/variant.js](backend/routes/variant.js)
- GET  /api/variant/all — List variants — [backend/routes/variant.js](backend/routes/variant.js)
- PUT  /api/variant/update/:id — Update variant — [backend/routes/variant.js](backend/routes/variant.js)
- DELETE /api/variant/delete/:id — Delete variant — [backend/routes/variant.js](backend/routes/variant.js)

**Cart (/api/cart)**  
- GET  /api/cart/ — Get cart for logged-in user — [backend/routes/cart.js](backend/routes/cart.js)
- POST /api/cart/add — Add item to cart — [backend/routes/cart.js](backend/routes/cart.js)
- PUT  /api/cart/update/:productId — Update item quantity — [backend/routes/cart.js](backend/routes/cart.js)
- DELETE /api/cart/remove/:productId — Remove item — [backend/routes/cart.js](backend/routes/cart.js)
- DELETE /api/cart/clear — Clear cart — [backend/routes/cart.js](backend/routes/cart.js)
- POST /api/cart/apply-coupon — Apply coupon to cart — [backend/routes/cart.js](backend/routes/cart.js)
- DELETE /api/cart/remove-coupon — Remove coupon from cart — [backend/routes/cart.js](backend/routes/cart.js)

**Wishlist (/api/wishlist)**  
- GET  /api/wishlist/ — Get wishlist for logged-in user — [backend/routes/wishlist.js](backend/routes/wishlist.js)
- POST /api/wishlist/add — Add product to wishlist — [backend/routes/wishlist.js](backend/routes/wishlist.js)
- DELETE /api/wishlist/remove/:productId — Remove product from wishlist — [backend/routes/wishlist.js](backend/routes/wishlist.js)
- DELETE /api/wishlist/clear — Clear wishlist — [backend/routes/wishlist.js](backend/routes/wishlist.js)

**Coupons (public/admin) (/api/coupon)**  
- GET  /api/coupon/products/search — Search products for product-type coupons — [backend/routes/coupon.js](backend/routes/coupon.js)
- POST /api/coupon/apply — Apply coupon (user) — [backend/routes/coupon.js](backend/routes/coupon.js)
- POST /api/coupon/release — Release coupon usage (order cancelled) — [backend/routes/coupon.js](backend/routes/coupon.js)
- POST /api/coupon/confirm-usage — Confirm coupon usage after order placed — [backend/routes/coupon.js](backend/routes/coupon.js)
- GET  /api/coupon/usage-history — Admin: coupon usage history — [backend/routes/coupon.js](backend/routes/coupon.js)
- POST /api/coupon/create — Admin: create coupon — [backend/routes/coupon.js](backend/routes/coupon.js)
- GET  /api/coupon/ — List coupons — [backend/routes/coupon.js](backend/routes/coupon.js)
- GET  /api/coupon/:id — Get single coupon — [backend/routes/coupon.js](backend/routes/coupon.js)
- PUT  /api/coupon/update/:id — Update coupon — [backend/routes/coupon.js](backend/routes/coupon.js)
- DELETE /api/coupon/delete/:id — Delete coupon — [backend/routes/coupon.js](backend/routes/coupon.js)
- PATCH /api/coupon/toggle-status/:id — Toggle coupon active/inactive — [backend/routes/coupon.js](backend/routes/coupon.js)

**Gift Cards (/api/giftCard)**  
- POST /api/giftCard/create — Create gift card — [backend/routes/giftCard.js](backend/routes/giftCard.js)
- GET  /api/giftCard/list — List gift cards — [backend/routes/giftCard.js](backend/routes/giftCard.js)
- GET  /api/giftCard/single/:id — Get single gift card — [backend/routes/giftCard.js](backend/routes/giftCard.js)
- PUT  /api/giftCard/update/:id — Update gift card — [backend/routes/giftCard.js](backend/routes/giftCard.js)
- DELETE /api/giftCard/delete/:id — Delete gift card — [backend/routes/giftCard.js](backend/routes/giftCard.js)

**Profile / Admin profile (mounted under `/api/profile`)**  
- GET  /api/profile/admin/profile — Get admin profile — [backend/routes/profile.js](backend/routes/profile.js)
- PUT  /api/profile/admin/profile — Update admin profile (upload allowed) — [backend/routes/profile.js](backend/routes/profile.js)

**Orders (/api/orders)**  
- POST /api/orders/ — Create order (private, supports both admin and vendor products natively) — [backend/routes/order.js](backend/routes/order.js)
- GET  /api/orders/myorders — Get logged-in user's orders — [backend/routes/order.js](backend/routes/order.js)
- GET  /api/orders/ — Admin: list all orders — [backend/routes/order.js](backend/routes/order.js)
- GET  /api/orders/:id — Get single order (owner or admin) — [backend/routes/order.js](backend/routes/order.js)
- PUT  /api/orders/:id/pay — Mark order as paid (callback) — [backend/routes/order.js](backend/routes/order.js)
- PUT  /api/orders/:id/cancel — User cancels order — [backend/routes/order.js](backend/routes/order.js)
- PUT  /api/orders/:id/status — Admin: update order status — [backend/routes/order.js](backend/routes/order.js)

**Payment (/api/payment)**  
- POST /api/payment/create-order — Create Razorpay order — [backend/routes/payment.js](backend/routes/payment.js)
- POST /api/payment/verify — Verify Razorpay payment signature — [backend/routes/payment.js](backend/routes/payment.js)
- POST /api/payment/webhook — Razorpay webhook handler — [backend/routes/payment.js](backend/routes/payment.js)
- POST /api/payment/test-setup — DEV ONLY: Create dummy user/order for UI testing — [backend/routes/payment.js](backend/routes/payment.js)

**Users (/api/users)**  
- GET  /api/users/stats — Admin dashboard counts (hot/cold/deactive) — [backend/routes/user.js](backend/routes/user.js)
- GET  /api/users/ — Admin: list users — [backend/routes/user.js](backend/routes/user.js)
- GET  /api/users/:id — Admin: get single user profile — [backend/routes/user.js](backend/routes/user.js)
- PUT  /api/users/:id/status — Admin: override user status — [backend/routes/user.js](backend/routes/user.js)
- DELETE /api/users/:id — Admin: delete user — [backend/routes/user.js](backend/routes/user.js)

**Admin Vendors (/api/admin/vendors)**  
- GET  /api/admin/vendors/ — List vendors — [backend/routes/adminVendorRoutes.js](backend/routes/adminVendorRoutes.js)
- GET  /api/admin/vendors/:id — Get vendor by id — [backend/routes/adminVendorRoutes.js](backend/routes/adminVendorRoutes.js)
- PUT  /api/admin/vendors/:id/status — Approve/suspend vendor — [backend/routes/adminVendorRoutes.js](backend/routes/adminVendorRoutes.js)
- PUT  /api/admin/vendors/:id/commission — Set vendor commission — [backend/routes/adminVendorRoutes.js](backend/routes/adminVendorRoutes.js)
- DELETE /api/admin/vendors/:id — Delete vendor — [backend/routes/adminVendorRoutes.js](backend/routes/adminVendorRoutes.js)

**Vendor-scoped routes (mounted at `/api/vendor/:vendorSlug`)**

Vendor profile:
- GET  /api/vendor/:vendorSlug/me — Get vendor's own profile — [backend/routes/vendor/vendorProfileRoutes.js](backend/routes/vendor/vendorProfileRoutes.js)
- PUT  /api/vendor/:vendorSlug/me — Update vendor profile — [backend/routes/vendor/vendorProfileRoutes.js](backend/routes/vendor/vendorProfileRoutes.js)

Vendor categories:
- GET  /api/vendor/:vendorSlug/categories/ — List vendor categories — [backend/routes/vendor/vendorCategoryRoutes.js](backend/routes/vendor/vendorCategoryRoutes.js)
- GET  /api/vendor/:vendorSlug/categories/:id — Get vendor category — [backend/routes/vendor/vendorCategoryRoutes.js](backend/routes/vendor/vendorCategoryRoutes.js)
- POST /api/vendor/:vendorSlug/categories/ — Create vendor category — [backend/routes/vendor/vendorCategoryRoutes.js](backend/routes/vendor/vendorCategoryRoutes.js)
- PUT  /api/vendor/:vendorSlug/categories/:id — Update vendor category — [backend/routes/vendor/vendorCategoryRoutes.js](backend/routes/vendor/vendorCategoryRoutes.js)
- DELETE /api/vendor/:vendorSlug/categories/:id — Delete vendor category — [backend/routes/vendor/vendorCategoryRoutes.js](backend/routes/vendor/vendorCategoryRoutes.js)

Vendor subcategories:
- GET  /api/vendor/:vendorSlug/subcategories/ — List vendor subcategories — [backend/routes/vendor/vendorSubCategoryRoutes.js](backend/routes/vendor/vendorSubCategoryRoutes.js)
- GET  /api/vendor/:vendorSlug/subcategories/:id — Get vendor subcategory — [backend/routes/vendor/vendorSubCategoryRoutes.js](backend/routes/vendor/vendorSubCategoryRoutes.js)
- POST /api/vendor/:vendorSlug/subcategories/ — Create vendor subcategory — [backend/routes/vendor/vendorSubCategoryRoutes.js](backend/routes/vendor/vendorSubCategoryRoutes.js)
- PUT  /api/vendor/:vendorSlug/subcategories/:id — Update vendor subcategory — [backend/routes/vendor/vendorSubCategoryRoutes.js](backend/routes/vendor/vendorSubCategoryRoutes.js)
- DELETE /api/vendor/:vendorSlug/subcategories/:id — Delete vendor subcategory — [backend/routes/vendor/vendorSubCategoryRoutes.js](backend/routes/vendor/vendorSubCategoryRoutes.js)

Vendor products:
- POST /api/vendor/:vendorSlug/products/upload-image — Upload a single image (returns URL) — [backend/routes/vendor/vendorProductRoutes.js](backend/routes/vendor/vendorProductRoutes.js)
- GET  /api/vendor/:vendorSlug/products/ — List vendor products — [backend/routes/vendor/vendorProductRoutes.js](backend/routes/vendor/vendorProductRoutes.js)
- GET  /api/vendor/:vendorSlug/products/:id — Get vendor product — [backend/routes/vendor/vendorProductRoutes.js](backend/routes/vendor/vendorProductRoutes.js)
- POST /api/vendor/:vendorSlug/products/ — Create vendor product — [backend/routes/vendor/vendorProductRoutes.js](backend/routes/vendor/vendorProductRoutes.js)
- PUT  /api/vendor/:vendorSlug/products/:id — Update vendor product — [backend/routes/vendor/vendorProductRoutes.js](backend/routes/vendor/vendorProductRoutes.js)
- DELETE /api/vendor/:vendorSlug/products/:id — Delete vendor product — [backend/routes/vendor/vendorProductRoutes.js](backend/routes/vendor/vendorProductRoutes.js)

Vendor coupons:
- GET  /api/vendor/:vendorSlug/coupons/ — List vendor coupons — [backend/routes/vendor/vendorCouponRoutes.js](backend/routes/vendor/vendorCouponRoutes.js)
- GET  /api/vendor/:vendorSlug/coupons/:id — Get vendor coupon — [backend/routes/vendor/vendorCouponRoutes.js](backend/routes/vendor/vendorCouponRoutes.js)
- POST /api/vendor/:vendorSlug/coupons/ — Create vendor coupon — [backend/routes/vendor/vendorCouponRoutes.js](backend/routes/vendor/vendorCouponRoutes.js)
- PUT  /api/vendor/:vendorSlug/coupons/:id — Update vendor coupon — [backend/routes/vendor/vendorCouponRoutes.js](backend/routes/vendor/vendorCouponRoutes.js)
- DELETE /api/vendor/:vendorSlug/coupons/:id — Delete vendor coupon — [backend/routes/vendor/vendorCouponRoutes.js](backend/routes/vendor/vendorCouponRoutes.js)

Vendor orders:
- GET  /api/vendor/:vendorSlug/orders/ — List orders for vendor — [backend/routes/vendor/vendorOrderRoutes.js](backend/routes/vendor/vendorOrderRoutes.js)

Vendor uploads:
- POST /api/vendor/:vendorSlug/upload/ — Upload image (multer) — [backend/routes/vendor/vendorUploadRoutes.js](backend/routes/vendor/vendorUploadRoutes.js)

**Misc**
- GET / — Root app GET (in `backend/server.js`) — [backend/server.js](backend/server.js)
- GET /test-payment — DEV ONLY: Test Razorpay UI (in `backend/server.js`) — [backend/server.js](backend/server.js)

---

If you want this exported as CSV or a Postman collection, tell me which format and I'll generate it.

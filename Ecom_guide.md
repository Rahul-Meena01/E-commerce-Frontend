# Multi-Vendor E-Commerce Platform Guide

Welcome to the **Multi-Vendor E-Commerce Platform**. This document journals the complete process of the project's development and serves as the definitive reference for its architecture, features, and API endpoints.

---

## 📖 Project Journey & Architecture

### 1. Unified Authentication System
We started by establishing a robust and secure authentication system.
- **Roles:** The platform supports three distinct roles: `user` (customer), `vendor` (seller), and `admin` (manager).
- **Registration:** Users and Vendors have separate registration endpoints to ensure correct database schemas are populated. A unique `VendorProfile` document is strictly tied to a user when they register as a vendor.
- **Login:** A unified login gateway verifies credentials, issues JWTs, and redirects users to their appropriate dashboard based on their role (`/user/home`, `/vendor/:slug/dashboard`, `/admin/dashboard`).

### 2. The Vendor Ecosystem
The core feature of this platform is the multi-vendor architecture.
- **Isolated Data:** Vendors have their own isolated `Products`, `Categories`, `Sub-Categories`, and `Coupons`. A vendor can only ever access or modify their own data, secured by strict backend middleware.
- **Image Uploads:** Dedicated image upload endpoints using Multer allow vendors to seamlessly upload product banners, logos, and carousels.

### 3. The Admin Control Panel
The Admin panel provides top-down visibility and control over the platform.
- **Vendor Management:** Admins can list all vendors, view their complete catalog (products, categories, coupons), and track their sales.
- **Access Control:** Admins have the power to approve pending vendors, suspend active vendors, and adjust per-vendor commission rates dynamically.

### 4. Code & Directory Cleanup
As the project reached maturity, we performed a massive cleanup operation. Dozens of fragmented documentation files, temporary migration scripts (`replaceRoles.cjs`, `cleanup-vendors.js`), and legacy markdown files were safely deleted from the `frontend/` and `backend/` directories to maintain a clean, professional codebase.

---

## 🔌 API Endpoints Reference

All endpoints are prefixed with `http://localhost:5000` (or your production URL).

### Authentication (`/api/auth`)
| Method | Endpoint                    | Description                                              | Access |
| --------| -----------------------------| ----------------------------------------------------------| --------|
| POST   | `/api/auth/register`        | Register a new customer (`user`).                        | Public |
| POST   | `/api/auth/register-vendor` | Register a new seller and create their `Vendor` profile. | Public |
| POST   | `/api/auth/login`           | Authenticate and receive JWT token + role info.          | Public |

### Admin: Vendor Management (`/api/admin/vendors`)
*All routes require `Bearer Token` and `Admin` role.*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/vendors` | List all vendors (supports pagination & status filters). |
| GET | `/api/admin/vendors/:id` | Get comprehensive vendor details including their full catalog. |
| PUT | `/api/admin/vendors/:id/status` | Approve (`active`) or block (`suspended`) a vendor. |
| PUT | `/api/admin/vendors/:id/commission`| Update the platform commission percentage for the vendor. |
| DELETE | `/api/admin/vendors/:id` | Permanently delete a vendor and their associated user account. |

### Vendor: Catalog Management (`/api/vendor/:vendorSlug`)
*All routes require `Bearer Token`, `Vendor` role, and ownership validation against `:vendorSlug`.*

**Products (`/products`)**
| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | List all products owned by the vendor. |
| POST | `/products` | Create a new product. |
| PUT | `/products/:id` | Update an existing product. |
| DELETE | `/products/:id` | Delete a product. |
| POST | `/products/upload-image` | Upload a product image and get its public URL back. |

**Categories & Sub-Categories (`/categories` & `/sub-categories`)**
| Method | Endpoint | Description |
|---|---|---|
| GET | `/categories` | List vendor's custom categories. |
| POST | `/categories` | Create a new category. |
| GET | `/sub-categories` | List vendor's sub-categories. |
| POST | `/sub-categories` | Create a new sub-category linked to a parent category. |

**Coupons (`/coupons`)**
| Method | Endpoint | Description |
|---|---|---|
| GET | `/coupons` | List all vendor promotional codes. |
| POST | `/coupons` | Create a new coupon (flat or percentage discount). |
| PUT | `/coupons/:id/status` | Toggle a coupon on/off. |

### General Catalog & Cart
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/products` | Fetch all active products globally for the storefront. | Public |
| GET | `/api/category` | Fetch all active global categories. | Public |
| POST | `/api/cart/add` | Add a product to the user's cart. | User |
| GET | `/api/cart` | View current cart items and totals. | User |

### Orders & Checkout
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST   | `/api/orders`               | Place a new order from cart items.              | User   |
| GET    | `/api/orders/myorders`      | View user's order history.                      | User   |
| GET    | `/api/orders`               | View ALL orders with pagination (Admin).        | Admin  |
| GET    | `/api/orders/:id`           | View specific order details.                    | User / Admin |
| PUT    | `/api/orders/:id/pay`       | Mark order as paid.                             | User   |
| PUT    | `/api/orders/:id/cancel`    | Cancel an order.                                | User   |
| PUT    | `/api/orders/:id/status`    | Update order status (Admin).                    | Admin  |

---
*Generated upon the successful structural completion and cleanup of the Multi-Vendor E-Commerce Platform.*

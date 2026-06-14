# LOFT E-Commerce Monorepo

LOFT is a full-stack e-commerce platform with a customer storefront (LOFT), an operations portal (admin and vendor dashboard), and a Node.js API backend. The project is organized as a monorepo so the storefront, operations portal, and backend services can be developed and deployed together while keeping their dependencies and build commands separate.

## Features

- **Customer Storefront (LOFT)**: Sleek, responsive shopping experience for browsing categories, product details, cart management, checkout flows, wishlists, customer profiles, and order success tracking.
- **Admin Dashboard**: Comprehensive control center for products, categories, subcategories, variants, coupons, gift cards, orders, users, and vendor management.
- **Vendor Portal**: Vendor onboarding, store profile, products, categories, subcategories, coupons, orders, and sales dashboard workflows.
- **REST API**: Secure backend for authentication, products, carts, orders, coupons, payments, vendors, profiles, wishlist, and upload handling.
- **Payment Gateways**: Integration points for Razorpay and Stripe.
- **Notification Services**: Email service integration through SMTP-compatible providers.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Customer Storefront | React, Vite, React Router, TanStack Query, Axios, Framer Motion |
| Operations Portal (Admin/Vendor) | React, Vite, React Router, Axios, jsPDF, jsPDF AutoTable |
| Backend API | Node.js, Express, MongoDB, Mongoose, JWT, Multer |
| Security | Helmet, express-rate-limit, express-mongo-sanitize, bcryptjs, HTTP-only cookies |
| Payments & Email | Razorpay, Stripe, Nodemailer |

## Folder Structure

```text
E-commerce/
├── backend/         # Node.js/Express API and MongoDB models
├── frontend/        # React/Vite admin and vendor dashboard (Operations Portal)
├── User frontend/   # React/Vite customer storefront (LOFT)
├── .gitignore       # Root ignore rules for generated and sensitive files
└── README.md        # Project monorepo documentation
```

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB database, either local or hosted
- Razorpay, Stripe, and SMTP credentials (only if those integrations are enabled)

## Environment Variables

Each application has its own example environment file. Copy the relevant templates before running local development:

```bash
# Copy environment configurations
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp "User frontend/.env.example" "User frontend/.env"
```

Never commit real `.env` files. They are intentionally ignored by git.

### Backend (`backend/.env`)

Required variables:
- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_SECRET`

Common optional variables:
- `PORT`
- `NODE_ENV`
- `CLIENT_URL`
- `PAYMENT_CURRENCY`
- `CURRENCY_SYMBOL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### Customer Storefront (`User frontend/.env`)

- `VITE_API_URL`
- `VITE_ADMIN_PORTAL_URL`
- `VITE_RAZORPAY_KEY_ID`

### Operations Portal (`frontend/.env`)

- `VITE_API_BASE_URL`

## Local Setup

Install dependencies separately in each folder.

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The backend defaults to `http://localhost:3000` when `PORT=3000`.

### Customer Storefront Setup

```bash
cd "User frontend"
npm install
cp .env.example .env
npm run dev
```

The storefront runs on the Vite dev server, commonly `http://localhost:5173`.

### Operations Portal Setup (Admin & Vendor)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The operations portal runs on the Vite dev server, commonly `http://localhost:5174`.

## Build Commands

```bash
# Customer Storefront production build
cd "User frontend"
npm run build

# Operations Portal production build
cd frontend
npm run build

# Backend production start
cd backend
npm start
```

Vite builds output to their local `dist/` folders. Those folders are generated artifacts and should not be committed.

## Deployment Notes

- Deploy `User frontend/` and `frontend/` as separate Vite static applications on platforms such as Vercel, Netlify, or any static asset hosting.
- For detailed storefront deployment instructions, environment variables configuration, and a production checklist, see the [Production Deployment Guide](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/docs/deploy.md).
- Deploy `backend/` as a Node.js service on Render, Railway, Heroku, or a VPS.
- Configure production environment variables in the hosting provider dashboard, not in source control.
- Set `CLIENT_URL` to the deployed storefront and admin origins so CORS and cookie behavior work correctly.
- Ensure production payment webhook secrets are configured before enabling live payments.
- Keep uploaded media outside the git repository, preferably in object storage (like AWS S3 or Google Cloud Storage) or a managed media service.

## Project Structure

For a detailed breakdown of the storefront's modular folder organization and naming conventions, refer to the [Project Structure Overview](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/docs/project_structure.md).

## GitHub Readiness

The repository is configured as a clean monorepo containing `backend/`, `frontend/`, and `User frontend/`. Generated folders such as `node_modules/`, `dist/`, `build/`, local `.env` files, logs, uploads, and temporary scratch files are ignored by the root `.gitignore`.

An audit has been performed on the `User frontend` to remove all unused code, dead components, and obsolete assets, making it fully ready for publication.


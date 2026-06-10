# LOFT E-Commerce Monorepo

LOFT is a full-stack e-commerce platform with a customer storefront, an admin and vendor dashboard, and a Node.js API backend. The project is organized as a monorepo so the storefront, operations portal, and backend services can be developed and deployed together while keeping their dependencies and build commands separate.

## Features

- Customer storefront for browsing categories, product details, cart, checkout, wishlist, profile, and order success flows.
- Admin dashboard for products, categories, subcategories, variants, coupons, gift cards, orders, users, and vendor management.
- Vendor portal for vendor profile, products, categories, subcategories, coupons, orders, and dashboard workflows.
- REST API for authentication, products, carts, orders, coupons, payments, vendors, profiles, wishlist, and upload handling.
- Payment integration points for Razorpay and Stripe.
- Email service integration through SMTP-compatible providers.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, React Router, TanStack Query, Axios, Framer Motion |
| Admin | React, Vite, React Router, Axios, jsPDF, jsPDF AutoTable |
| Backend | Node.js, Express, MongoDB, Mongoose, JWT, Multer |
| Security | Helmet, express-rate-limit, express-mongo-sanitize, bcryptjs, HTTP-only cookies |
| Payments and Email | Razorpay, Stripe, Nodemailer |

## Folder Structure

```text
E-commerce/
├── admin/       # React/Vite admin and vendor dashboard
├── backend/     # Node.js/Express API and MongoDB models
├── frontend/    # React/Vite customer storefront
├── .gitignore   # Root ignore rules for generated and sensitive files
└── README.md    # Project documentation
```

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB database, either local or hosted
- Razorpay, Stripe, and SMTP credentials only if those integrations are enabled

## Environment Variables

Each app has its own example environment file. Copy the relevant template before running local development:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env
```

Never commit real `.env` files. They are intentionally ignored by git.

### Backend

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

### Frontend

- `VITE_API_URL`
- `VITE_ADMIN_PORTAL_URL`

### Admin

- `VITE_API_URL`
- `VITE_API_BASE_URL`

## Local Setup

Install dependencies separately in each app folder.

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The backend defaults to `http://localhost:3000` when `PORT=3000`.

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The storefront runs on the Vite dev server, commonly `http://localhost:5173`.

### Admin Setup

```bash
cd admin
npm install
cp .env.example .env
npm run dev
```

The admin portal runs on the Vite dev server, commonly `http://localhost:5174`.

## Build Commands

```bash
# Frontend production build
cd frontend
npm run build

# Admin production build
cd admin
npm run build

# Backend production start
cd backend
npm start
```

Frontend and admin builds output to their local `dist/` folders. Those folders are generated artifacts and should not be committed.

## Deployment Notes

- Deploy `frontend/` and `admin/` as separate Vite static applications on hosts such as Vercel, Netlify, or any static asset platform.
- Deploy `backend/` as a Node.js service on a platform such as Render, Railway, Heroku, or a VPS.
- Configure production environment variables in the hosting provider dashboard, not in source control.
- Set `CLIENT_URL` to the deployed storefront and admin origins so CORS and cookie behavior work correctly.
- Ensure production payment webhook secrets are configured before enabling live payments.
- Keep uploaded media outside the git repository, preferably in object storage or a managed media service.

## GitHub Readiness

The repository is intended to be pushed as a monorepo containing `frontend/`, `admin/`, and `backend/`. Generated folders such as `node_modules/`, `dist/`, `build/`, local `.env` files, logs, uploads, and temporary scratch files are ignored by the root `.gitignore`.

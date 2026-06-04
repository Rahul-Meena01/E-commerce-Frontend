# LOFT E-Commerce Platform

A premium full-stack e-commerce application consisting of a customer-facing storefront, a comprehensive administrative and vendor dashboard, and a robust RESTful API backend.

## Project Structure

This repository is organized as a monorepo containing three core packages:

```text
E-commerce/
├── admin/             # React/Vite Admin & Vendor Dashboard Portal
├── backend/           # Node.js/Express.js Backend API
└── frontend/          # React/Vite Customer-facing E-Commerce Store
```

---

## Tech Stack

### Frontend & Admin
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS, PostCSS
- **State/Data Fetching**: Axios, React Query (TanStack Query)
- **Routing**: React Router DOM (v7)
- **Icons**: Lucide React, React Icons
- **PDF Generation**: jsPDF, jsPDF AutoTable

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT (JSON Web Tokens) with Secure Cookie Session management
- **Security**: Helmet, Express Mongo Sanitize, Express Rate Limit, BcryptJS
- **FileUpload**: Multer
- **Integrations**: Stripe, Razorpay, Nodemailer (SMTP)

---

## Installation & Setup

Before setting up each component, ensure you have [Node.js](https://nodejs.org/) (v18 or higher) and [npm](https://www.npmjs.com/) installed.

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Create your local environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your credentials (see [Environment Variables](#environment-variables) below).
5. Start the development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Storefront Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install the storefront dependencies:
   ```bash
   npm install
   ```
3. Create your local environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with the URL of your local running backend.
5. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Admin Portal Setup
1. Navigate to the admin directory:
   ```bash
   cd ../admin
   ```
2. Install the admin portal dependencies:
   ```bash
   npm install
   ```
3. Create your local environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Update `.env` with the URL of your local running backend.
5. Start the development server:
   ```bash
   npm run dev
   ```

---

## Environment Variables

### Backend (`backend/.env`)
The backend requires several key configurations for authentication and integrations:
- `MONGO_URI`: Your MongoDB Atlas or local MongoDB connection string.
- `JWT_SECRET` & `ADMIN_SECRET`: Strong secret keys used for signing session tokens.
- `PORT`: Server port (defaults to `3000`).
- `CLIENT_URL`: Allowed cross-origin URLs (comma-separated list of frontends).
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` (Optional): Credentials for processing payments via Razorpay.
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` (Optional): Credentials for processing payments via Stripe.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (Optional): Configurations for sending transactional emails.

### Frontend (`frontend/.env`)
- `VITE_API_URL`: Backend server base API endpoint (e.g., `http://localhost:3000`).
- `VITE_ADMIN_PORTAL_URL`: The URL where the admin portal is hosted locally (e.g., `http://localhost:5174`).

### Admin (`admin/.env`)
- `VITE_API_URL`: Backend server API endpoint (e.g., `http://localhost:3000`).
- `VITE_API_BASE_URL`: Base backend URL for serving files or static assets.

---

## Development Workflow & Scripts

Each project folder manages its own build and run pipelines.

### Backend Scripts
- `npm run dev`: Starts the backend server with `nodemon` for auto-reloads.
- `npm start`: Starts the production backend server.
- `npm test`: Runs the backend test suite using Jest.

### Frontend Scripts
- `npm run dev`: Boots the local Vite dev server.
- `npm run build`: Bundles the React application for production into the `dist/` directory.
- `npm run preview`: Previews the production bundle locally.

### Admin Dashboard Scripts
- `npm run dev`: Boots the local Vite dev server.
- `npm run build`: Bundles the React application for production into the `dist/` directory.

---

## Build and Deployment Notes

### Building for Production
To prepare the storefront and admin portals for production hosting, execute the build scripts in their respective folders:
```bash
# In frontend/
npm run build

# In admin/
npm run build
```
This generates optimized static HTML/CSS/JS assets inside their respective `dist/` folders, which can be deployed to static hosting providers (such as Vercel, Netlify, or AWS S3).

### Backend Deployment
Deploy the backend Node/Express application to services like Render, Heroku, or AWS EC2. Ensure that:
1. Production environment variables are correctly mapped on the hosting provider.
2. `NODE_ENV` is set to `production`.
3. The port matches the host configuration.

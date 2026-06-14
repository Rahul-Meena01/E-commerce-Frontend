# LOFT Customer Storefront - Production Deployment Guide

This guide details the steps and considerations for building and deploying the LOFT Customer Storefront (`User frontend`) to production.

---

## 1. Environment Configuration

The storefront application relies on the following environment variables. In production, these should be set in your hosting provider's dashboard (e.g., Vercel Environment Variables). **Do not upload or commit actual `.env` files to source control.**

| Variable Name | Description | Example / Default |
| --- | --- | --- |
| `VITE_API_URL` | URL of the running backend API service | `https://api.loft-ecommerce.com` |
| `VITE_ADMIN_PORTAL_URL` | URL of the Admin/Vendor Portal | `https://admin.loft-ecommerce.com` |
| `VITE_RAZORPAY_KEY_ID` | Public API Key ID for Razorpay Checkout | `rzp_live_xxxxxxxxxxxxxx` |

---

## 2. Local Production Build Validation

Before deploying to your hosting provider, always validate that the production build succeeds locally:

```bash
# Navigate to the storefront directory
cd "User frontend"

# Install production dependencies (if not already done)
npm install

# Build the project
npm run build

# Preview the built application locally
npm run preview
```

The build output will be compiled into the `dist/` directory as highly optimized, minified HTML, CSS, and JS chunks.

---

## 3. Deployment Options

The Customer Storefront is a Single Page Application (SPA) built with Vite. It can be deployed to any static site hosting provider.

### Option A: Vercel (Recommended)

1. Connect your GitHub repository to Vercel.
2. Add a new project and select the root directory (or configure the root to point to `/User frontend`).
3. Set the **Framework Preset** to **Vite**.
4. Configure the build settings:
   - **Root Directory**: `User frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add the production environment variables listed in Section 1.
6. Click **Deploy**.

### Option B: Netlify

1. Create a new site on Netlify from Git.
2. Select your repository and set the following build settings:
   - **Base directory**: `User frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `User frontend/dist`
3. Under **Environment variables**, define `VITE_API_URL`, `VITE_ADMIN_PORTAL_URL`, and `VITE_RAZORPAY_KEY_ID`.
4. To support React Router client-side routing on page refresh, add a `_redirects` file to your `public/` directory (or use a `netlify.toml` file) with the following content:
   ```text
   /*   /index.html   200
   ```
5. Click **Deploy site**.

---

## 4. Production Readiness Checklist

Before publishing your deployment live, verify the following:

- [ ] **HTTPS Enforced**: All requests to the API and storefront are over HTTPS.
- [ ] **Razorpay Keys**: The `VITE_RAZORPAY_KEY_ID` env variable is set to the live/production credentials instead of test keys.
- [ ] **API URL**: The `VITE_API_URL` variable correctly points to the deployed production backend API.
- [ ] **Error Handling**: Try simulating offline mode or backend failure to verify that the `ErrorBoundary` displays a clean fallback UI instead of crashing.
- [ ] **Images & Placeholders**: Ensure that there are no broken images or missing alt tags on the home and product detail pages.
- [ ] **SEO**: Confirm the title and meta tags are present in `index.html`.

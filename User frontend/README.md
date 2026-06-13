# LOFT Customer Storefront

This is the customer-facing frontend storefront of the LOFT e-commerce platform, built with **React**, **Vite**, **React Router**, and **TanStack Query**. It provides a premium, responsive shopping experience with a highly polished design system, smooth animations, and rich user interactions.

## Features

- **Dynamic Homepage**: Hero section with background video support, category grids, and animated sliders.
- **Product Discovery**: Search discovery overlay with instant suggestions, search results, and category/subcategory filtering.
- **Interactive Product Details**: Size guide modal, sticky purchase bar, variants selector, and media gallery.
- **Cart & Wishlist**: Real-time sliding cart drawer, item count badge, wishlist integration, and state management.
- **User Authentication & Profiles**: Secure login/registration, profile management (saved addresses, order history, wishlist).
- **Checkout & Payments**: Complete checkout flow with Razorpay payment gateway integration, coupon codes, and gift card redemption.
- **Design & Animations**: Custom modern vanilla CSS design tokens, HSL color system, dark mode options, and Framer Motion micro-animations.

## Technology Stack

- **Framework**: React 19 (Vite 8)
- **Routing**: React Router 7
- **Data Fetching & State**: TanStack React Query 5 & Axios
- **Animations**: Framer Motion 12 & Custom CSS transitions
- **Icons**: Lucide React 1
- **Styling**: Vanilla CSS (TailwindCSS not used for the storefront to maintain high customization control)

## Getting Started

### Prerequisites

1. Ensure the backend API server is running (defaults to `http://localhost:3000`).
2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```
3. Set the necessary environment variables in `.env`:
   - `VITE_API_URL`: Backend API URL (e.g., `http://localhost:3000`)
   - `VITE_ADMIN_PORTAL_URL`: Operations Portal URL (e.g., `http://localhost:5174`)
   - `VITE_RAZORPAY_KEY_ID`: Your Razorpay Key ID for processing payments

### Installation & Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

The app will run locally at `http://localhost:5173`.

### Production Build

```bash
# Compile and build production assets
npm run build

# Preview production build locally
npm run preview
```
The production bundle will be generated in the `dist/` directory.

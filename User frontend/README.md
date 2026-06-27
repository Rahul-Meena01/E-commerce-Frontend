# LOFT Customer Storefront

This is the customer-facing frontend storefront of the LOFT e-commerce platform. Built with **React**, **Vite**, **React Router**, and **TanStack Query**, it provides a premium, responsive shopping experience for circular, pre-loved fashion.

---

## 🖤 LOFT Brand Identity
**LOFT** stands for **List Of Favourite Thrift**.

LOFT is not simply another fashion marketplace or traditional e-commerce catalog. It is a carefully curated destination for premium pre-loved and vintage fashion. Every garment is hand-selected, verified for quality, and given a second life.

Our core brand philosophy:
> **LOFT isn't simply another thrift marketplace—it's a carefully curated collection of premium pre-loved fashion where every piece earns its place.**

Every piece has a story, a previous character, and a design that is worth keeping.

---

## ✨ Features

- **Dynamic Curated Homepage:** Features background video support, category navigation grids, and animated product sliders.
- **Pre-Loved Discovery:** Search discovery overlays with instant autocomplete, recent search memory, and category/subcategory filter combinations.
- **Product Spotlight Details:** Integrated size guide modal, stock indicator alerts, a sticky checkout bar, and a high-resolution media gallery.
- **Sliding Cart Drawer:** A real-time cart drawer with quantity managers and instant updates.
- **Account & Wishlist:** Custom saved wishlists, customer order histories, address configuration forms, and member level indicators.
- **Secure Checkout Integration:** A streamlined single-page checkout supporting Razorpay gateway integration, coupon codes, and gift card redemption.
- **Zero-Border Styling:** A minimal, high-editorial flat layout utilizing custom vanilla CSS tokens and smooth Framer Motion micro-animations.

---

## 🛠️ Technology Stack

- **Framework:** React 19
- **Build Tool:** Vite 8
- **Routing:** React Router 7
- **Data Access:** TanStack Query 5 (React Query) & Axios
- **Animations:** Framer Motion 12 & CSS Transitions
- **Icons:** Lucide React
- **Styling:** Vanilla CSS (Zero-border minimal styling)

---

## 📂 Project Structure

```
User frontend/
├── public/                 # Static assets (favicons, videos, fallback images)
├── src/
│   ├── app/                # App initialization, routes, and context providers
│   ├── config/             # Brand description and site content configuration
│   ├── constants/          # App constants (currency details, assets)
│   ├── context/            # React context definitions (dialogs, toasts)
│   ├── features/           # Feature-centric modules
│   │   ├── auth/           # Login, registration, profile forms, and wishlist tabs
│   │   ├── cart/           # Cart sidebar and state managers
│   │   ├── checkout/       # Address validators, summaries, and payment integrations
│   │   ├── orders/         # Order cards and details
│   │   ├── products/       # Category listings, sliders, details, and variant grids
│   │   └── search/         # Discovery popups, overlays, and search bars
│   ├── pages/              # High-level route pages (Home, Shop, Checkout, Info)
│   ├── services/           # Backend API clients (products, orders, auth)
│   ├── shared/             # Reusable UI primitives and utilities
│   └── styles/             # CSS sheets, styling variables, and design tokens
└── package.json            # Configuration and script definitions
```

---

## 🚀 Getting Started

### 📋 Prerequisites

1. Install **Node.js** (v18+ recommended)
2. Ensure the backend API server is running (defaults to `http://localhost:3000`).

### ⚙️ Environment Configuration

1. Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
2. Configure variables in the newly created `.env` file:
   - `VITE_API_URL`: The URL of the API gateway (e.g., `http://localhost:3000`)
   - `VITE_ADMIN_PORTAL_URL`: Operations admin console URL (e.g., `http://localhost:5174`)
   - `VITE_RAZORPAY_KEY_ID`: Razorpay public API key for payments

---

### 🔧 Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Run the local development server
npm run dev
```

The application will run locally at `http://localhost:5173`.

---

## 📦 Production Builds

```bash
# 1. Compile production bundle assets
npm run build

# 2. Preview the production build locally
npm run preview
```

The production assets compile into the `dist/` directory.

---

## 📝 Code Quality & Guidelines

Before committing changes, ensure code is checked:

```bash
# Run ESLint validation
npm run lint
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/curation`)
3. Commit your changes (`git commit -m 'Add curated detail section'`)
4. Push to the branch (`git push origin feature/curation`)
5. Open a Pull Request

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE placeholder for details.

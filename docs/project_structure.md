# LOFT Customer Storefront - Project Structure

This document outlines the architecture and directory organization of the LOFT Customer Storefront (`User frontend`).

---

## 1. Directory Structure

```text
User frontend/
├── public/                 # Static public assets (images, logos, icons)
├── src/
│   ├── app/                # Application-level providers and routes configuration
│   │   ├── providers/      # React context providers wrapper (QueryClient, Auth, Cart, etc.)
│   │   └── routes/         # Router declarations and lazy component mappings
│   ├── config/             # Environment-specific or global configuration constants
│   ├── constants/          # Application constants (e.g. image URLs, static labels)
│   ├── context/            # React Contexts (Toast, Cart, Wishlist, Dialogs)
│   ├── features/           # Domain-specific modules (auth, cart, checkout, products, etc.)
│   │   ├── auth/           # Login/Signup forms, profile views
│   │   ├── cart/           # Cart hook and state helpers
│   │   ├── checkout/       # Checkout summaries, order forms, Razorpay modals
│   │   ├── products/       # Product grids, gallery, Variant selectors, stock indicators
│   │   ├── search/         # Keyboard navigation, navbar search overlay
│   │   └── wishlist/       # Wishlist item listings and buttons
│   ├── pages/              # High-level page components mapped to routes
│   │   ├── auth/           # Auth page entry points
│   │   ├── info/           # Informational pages (FAQ, Policies, About, Careers)
│   │   ├── shop/           # Home, product details, shop grids, categories
│   │   └── user/           # User dashboard, profile settings, checkout pages
│   ├── services/           # API fetch wrappers and services (auth, product, cart, orders)
│   ├── shared/             # Shared reusable layouts, utilities, and UI components
│   │   ├── components/     # Layout templates (Navbar, Footer, CartDrawer)
│   │   ├── hooks/          # Shared hooks (useDropdown, useFocusTrap, useEscapeKey)
│   │   ├── services/       # Common apiClient configurations
│   │   ├── ui/             # Unified design system elements (Button, Badge, Modal, Input)
│   │   └── utils/          # Utility functions (logger, auth storage, pricing)
│   ├── styles/             # Global CSS files and Design System tokens
│   │   ├── design-system.css # Core design system styles and utilities
│   │   ├── design-tokens.css # Design system color, typography, spacing variables
│   │   ├── global.css      # Core HTML tags styles reset
│   │   └── [feature].css   # Feature-specific styles
│   ├── App.jsx             # Root application shell (wraps page transitions & progress bar)
│   └── main.jsx            # React root mount point and routing bootstrapping
├── .env.example            # Environment template configuration
├── .gitignore              # Project-specific git ignore file
├── index.html              # Core HTML file (includes SEO metadata)
├── package.json            # Node.js dependencies and run scripts
└── vite.config.js          # Vite build and resolution aliases configuration
```

---

## 2. Design System & Naming Conventions

The project follows a component-based structure where styles are driven by the Design System:
- **Design Tokens**: Defined as custom properties in `src/styles/design-tokens.css` prefixed with `--ds-`.
- **CSS classes**: Reusable design system classes in `src/styles/design-system.css` are prefixed with `ds-` (e.g., `ds-button`, `ds-input`, `ds-badge`).
- **File Naming**: 
  - JSX component files are PascalCase (e.g., `ProductDetail.jsx`, `VariantSelector.jsx`).
  - Context and hook files are camelCase (e.g., `useCart.js`, `CartContext.jsx`).
  - Stylesheets are PascalCase if tied to a page/component (e.g., `CheckoutPage.css`), or lowercase if global (e.g., `global.css`, `design-system.css`).

/*
 * App.jsx
 * Central route map for the entire frontend.
 *
 * ─── Route groups ──────────────────────────────────────────────────────────────
 *
 *  PUBLIC
 *    /                          → redirect to /login
 *    /login                     → Login page (user / vendor / admin tabs)
 *
 *  USER  (role: "user")
 *    /user/home                 → UserHome
 *
 *  ADMIN  (role: "admin")
 *    /admin/dashboard           → Dashboard
 *    /admin/orders              → OrderDetails (list)
 *    /admin/order-details/:id   → OrderDetailPage (single order)
 *    /admin/users               → UserManagementPage
 *    /admin/vendors             → VendorManagementPage (list of all vendors)
 *    /admin/vendors/:id         → VendorProfilePage (single vendor detail)
 *    /admin/category            → Category
 *    /admin/subcategory         → SubCategory
 *    /admin/products            → Product
 *    /admin/products/variants   → VariantProducts
 *    /admin/coupons             → Coupons
 *    /admin/giftcards           → GiftCards
 *    /admin/profile             → Profile
 *
 *  VENDOR  (role: "vendor")
 *    /vendor/:vendorSlug/dashboard      → VendorDashboard
 *    /vendor/:vendorSlug/categories     → VendorCategories
 *    /vendor/:vendorSlug/subcategories  → VendorSubCategories
 *    /vendor/:vendorSlug/products       → VendorProducts
 *    /vendor/:vendorSlug/coupons        → VendorCoupons
 *    /vendor/:vendorSlug/orders         → VendorOrders
 *    /vendor/:vendorSlug/profile        → VendorProfile
 *
 * ─── Layout wrappers ──────────────────────────────────────────────────────────
 *
 *  AdminLayout   → ProtectedRoute(role="admin") + admin Sidebar
 *  VendorLayout  → ProtectedRoute(role="vendor") + VendorSidebar
 *
 * ─── Catch-all ────────────────────────────────────────────────────────────────
 *  Any unknown path → redirect to /login
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ── Shared / layout components ─────────────────────────────────────────────────
import Sidebar from "./components/Sidebar";
import VendorSidebar from "./components/vendorSidebar"; //Case sensitive problem 
import ProtectedRoute from "./components/ProtectedRoute";


// ── Public pages ───────────────────────────────────────────────────────────────
import Login from "./pages/Login";
import UserHome from "./pages/UserHome";



// ── Admin pages ────────────────────────────────────────────────────────────────
import Dashboard from "./pages/admin/Dashboard";
import OrderDetails from "./pages/admin/Orderdetail";        // orders list
import OrderDetailPage from "./pages/admin/OrderDetailPage";     // single order
import UserManagementPage from "./pages/admin/usermanagmentPage";   // users list
import VendorManagementPage from "./pages/admin/VendorManagementPage"; // vendors list
import VendorProfilePage from "./pages/admin/VendorProfilePage";   // single vendor
import Category from "./pages/admin/Category";
import SubCategory from "./pages/admin/SubCategory";
import Product from "./pages/admin/Product";
import VariantProducts from "./pages/admin/VariantProducts";
import Coupons from "./pages/admin/Coupons";
import GiftCards from "./pages/admin/GiftCards";
import Profile from "./pages/admin/Profile";

// ── Vendor pages ───────────────────────────────────────────────────────────────
import VendorDashboard from "./pages/vendor/vendorDashboard";
import VendorCategories from "./pages/vendor/vendorCategories";
import VendorSubCategories from "./pages/vendor/vendorSubCategories";
import VendorProducts from "./pages/vendor/vendorProducts";
import VendorCoupons from "./pages/vendor/vendorCoupons";
import VendorOrders from "./pages/vendor/vendorOrders";
import VendorProfile from "./pages/vendor/vendorProfile";

// ─────────────────────────────────────────────────────────────────────────────
// AdminLayout
// Every admin page is wrapped in this component.
// It enforces the "admin" role guard and renders the fixed sidebar + main area.
// ─────────────────────────────────────────────────────────────────────────────
function AdminLayout({ children }) {
  return (
    <ProtectedRoute role="admin">
      <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9" }}>
        <Sidebar />
        <main
          style={{
            marginLeft: "250px",
            flex: 1,
            padding: "24px",
            minHeight: "100vh",
            overflowX: "hidden",
          }}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VendorLayout
// Every vendor page is wrapped in this component.
// It enforces the "vendor" role guard and renders the vendor sidebar + main area.
// ─────────────────────────────────────────────────────────────────────────────
function VendorLayout({ children }) {
  return (
    <ProtectedRoute role="vendor">
      <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9" }}>
        <VendorSidebar />
        <main
          style={{
            marginLeft: "250px",
            flex: 1,
            padding: "24px",
            minHeight: "100vh",
            overflowX: "hidden",
          }}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App — all route definitions live here
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ══════════════════════════════════════════
            PUBLIC ROUTES
        ══════════════════════════════════════════ */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* ══════════════════════════════════════════
            USER ROUTE
            Simple protected page, no sidebar needed.
        ══════════════════════════════════════════ */}
        <Route
          path="/user/home"
          element={
            <ProtectedRoute role="user">
              <UserHome />
            </ProtectedRoute>
          }
        />

        {/* ══════════════════════════════════════════
            ADMIN ROUTES
            All wrapped in AdminLayout which handles
            the role guard + sidebar.
        ══════════════════════════════════════════ */}

        {/* Main dashboard */}
        <Route
          path="/admin/dashboard"
          element={<AdminLayout><Dashboard /></AdminLayout>}
        />

        {/* Orders — list view */}
        <Route
          path="/admin/orders"
          element={<AdminLayout><OrderDetails /></AdminLayout>}
        />

        {/* Orders — single order detail (navigated to from the list) */}
        <Route
          path="/admin/order-details/:id"
          element={<AdminLayout><OrderDetailPage /></AdminLayout>}
        />

        {/* Users management */}
        <Route
          path="/admin/users"
          element={<AdminLayout><UserManagementPage /></AdminLayout>}
        />

        {/* Vendors — list of all vendors */}
        <Route
          path="/admin/vendors"
          element={<AdminLayout><VendorManagementPage /></AdminLayout>}
        />

        {/* Vendors — single vendor profile (navigated to from the list via /admin/vendors/:id) */}
        <Route
          path="/admin/vendors/:id"
          element={<AdminLayout><VendorProfilePage /></AdminLayout>}
        />

        {/* Catalogue management */}
        <Route
          path="/admin/category"
          element={<AdminLayout><Category /></AdminLayout>}
        />
        <Route
          path="/admin/subcategory"
          element={<AdminLayout><SubCategory /></AdminLayout>}
        />
        <Route
          path="/admin/products"
          element={<AdminLayout><Product /></AdminLayout>}
        />
        <Route
          path="/admin/products/variants"
          element={<AdminLayout><VariantProducts /></AdminLayout>}
        />

        {/* Promotions */}
        <Route
          path="/admin/coupons"
          element={<AdminLayout><Coupons /></AdminLayout>}
        />
        <Route
          path="/admin/giftcards"
          element={<AdminLayout><GiftCards /></AdminLayout>}
        />

        {/* Admin profile */}
        <Route
          path="/admin/profile"
          element={<AdminLayout><Profile /></AdminLayout>}
        />

        {/* ══════════════════════════════════════════
            VENDOR ROUTES
            All scoped under /vendor/:vendorSlug/
            Each page reads vendorSlug via useParams().
        ══════════════════════════════════════════ */}
        <Route
          path="/vendor/:vendorSlug/dashboard"
          element={<VendorLayout><VendorDashboard /></VendorLayout>}
        />
        <Route
          path="/vendor/:vendorSlug/categories"
          element={<VendorLayout><VendorCategories /></VendorLayout>}
        />
        <Route
          path="/vendor/:vendorSlug/subcategories"
          element={<VendorLayout><VendorSubCategories /></VendorLayout>}
        />
        <Route
          path="/vendor/:vendorSlug/products"
          element={<VendorLayout><VendorProducts /></VendorLayout>}
        />
        <Route
          path="/vendor/:vendorSlug/coupons"
          element={<VendorLayout><VendorCoupons /></VendorLayout>}
        />
        <Route
          path="/vendor/:vendorSlug/orders"
          element={<VendorLayout><VendorOrders /></VendorLayout>}
        />
        <Route
          path="/vendor/:vendorSlug/profile"
          element={<VendorLayout><VendorProfile /></VendorLayout>}
        />

        {/* ══════════════════════════════════════════
            CATCH-ALL
            Any unmatched path redirects to /login.
        ══════════════════════════════════════════ */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;

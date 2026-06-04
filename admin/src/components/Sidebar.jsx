/*
 * Handover note: Admin navigation sidebar.
 * Links the dashboard modules, highlights the current route, and clears localStorage on logout.
 *
 * CHANGE: Added Orders nav item (path: /admin/orders) with an OrderIcon.
 * CHANGE: Added Users nav item (path: /admin/users) with a UsersIcon.
 */
import { Link, useLocation, useNavigate } from "react-router-dom";

// ── Icon Components ───────────────────────────────────────────────────────────

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const OrderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
    <rect x="9" y="3" width="6" height="4" rx="1"></rect>
    <line x1="9" y1="12" x2="15" y2="12"></line>
    <line x1="9" y1="16" x2="13" y2="16"></line>
  </svg>
);

// ← ADDED: Users icon
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const VendorsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const CategoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const SubCategoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    <path d="M9 14l2 2 4-4"></path>
  </svg>
);

const ProductIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
    <line x1="7" y1="7" x2="7.01" y2="7"></line>
  </svg>
);

const VariantProductIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
    <line x1="7" y1="7" x2="7.01" y2="7"></line>
    <circle cx="16" cy="8" r="2"></circle>
  </svg>
);

const CouponIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2l16 20"></path>
    <path d="M2 6h20"></path>
    <path d="M2 18h20"></path>
  </svg>
);

const GiftCardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <rect x="7" y="7" width="10" height="10"></rect>
    <line x1="12" y1="7" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="17"></line>
    <line x1="7" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="17" y2="12"></line>
  </svg>
);

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const menuItems = [
    { path: "/admin/dashboard",        label: "Dashboard",       icon: <DashboardIcon /> },
    { path: "/admin/orders",           label: "Orders",          icon: <OrderIcon /> },
    { path: "/admin/users",            label: "Users",           icon: <UsersIcon /> }, // ← ADDED
    { path: "/admin/vendors",          label: "Vendors",         icon: <VendorsIcon /> }, // ← ADDED
    { path: "/admin/category",         label: "Categories",      icon: <CategoryIcon /> },
    { path: "/admin/subcategory",      label: "SubCategories",   icon: <SubCategoryIcon /> },
    { path: "/admin/products",         label: "Products",        icon: <ProductIcon /> },
    { path: "/admin/products/variants",label: "Variant Products",icon: <VariantProductIcon /> },
    { path: "/admin/coupons",          label: "Coupons",         icon: <CouponIcon /> },
    { path: "/admin/giftcards",        label: "Gift Cards",      icon: <GiftCardIcon /> },
    { path: "/admin/profile",          label: "Profile",         icon: <ProfileIcon /> },
  ];

  // Highlight the active nav item.
  // Users page also stays highlighted when the drawer is open (same route).
  const isActive = (path) =>
    location.pathname === path ||
    (path === "/admin/orders" && location.pathname.startsWith("/admin/order-details")) ||
    (path === "/admin/users"  && location.pathname.startsWith("/admin/users")) ||
    (path === "/admin/vendors"  && location.pathname.startsWith("/admin/vendors"));

  return (
    <div
      style={{
        width: "250px",
        height: "100vh",
        backgroundColor: "#1a1a1a",
        color: "white",
        padding: "20px",
        position: "fixed",
        left: 0,
        top: 0,
        overflowY: "auto",
      }}
    >
      <h2 style={{ marginBottom: "20px", color: "#fff" }}>Admin Panel</h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100% - 60px)",
        }}
      >
        <ul style={{ listStyle: "none", padding: 0, flex: 1, margin: 0 }}>
          {menuItems.map((item) => (
            <li key={item.path} style={{ marginBottom: "10px" }}>
              <Link
                to={item.path}
                style={{
                  color: isActive(item.path) ? "#4CAF50" : "#ccc",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px",
                  borderRadius: "4px",
                  backgroundColor: isActive(item.path) ? "#333" : "transparent",
                  transition: "background-color 0.2s, color 0.2s",
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginTop: "16px",
            padding: "12px 14px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#e94560",
            color: "white",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          <LogoutIcon />
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
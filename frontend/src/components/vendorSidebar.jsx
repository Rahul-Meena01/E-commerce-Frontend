import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  GitBranch,
  Package,
  Tag,
  ShoppingBag,
  UserCircle,
  LogOut,
  Store,
  ChevronRight,
} from "lucide-react";

import "../styles/vendor.css"; // Ensure standard styles are applied



// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: (s) => `/vendor/${s}/dashboard`,
    icon: LayoutDashboard,
  },
  { label: "Categories", path: (s) => `/vendor/${s}/categories`, icon: Layers },
  {
    label: "Sub-Categories",
    path: (s) => `/vendor/${s}/subcategories`,
    icon: GitBranch,
  },
  { label: "Products", path: (s) => `/vendor/${s}/products`, icon: Package },
  { label: "Coupons", path: (s) => `/vendor/${s}/coupons`, icon: Tag },
  { label: "Orders", path: (s) => `/vendor/${s}/orders`, icon: ShoppingBag },
  { label: "Profile", path: (s) => `/vendor/${s}/profile`, icon: UserCircle },
];

// ─── Component ────────────────────────────────────────────────────────────────
function VendorSidebar() {
  const navigate = useNavigate();

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {}

  const slug = user?.vendorSlug || "";
  const shopName = user?.shopName || "My Store";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <aside className="vendor-sidebar">
      {/* ── Brand / Store header ── */}
      <div className="sidebar-header">
        <div className="store-logo">
          <Store size={22} />
        </div>
        <div className="store-info">
          <h2 className="store-name" title={shopName}>
            {shopName}
          </h2>
          <span className="store-role">Vendor Portal</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Menu</div>

        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={label}
            to={path(slug)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span className="sidebar-icon">
              <Icon size={18} strokeWidth={2} />
            </span>
            <span>{label}</span>
            <ChevronRight size={14} className="sidebar-chevron" />
          </NavLink>
        ))}
      </nav>

      {/* ── Footer / Logout ── */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default VendorSidebar;

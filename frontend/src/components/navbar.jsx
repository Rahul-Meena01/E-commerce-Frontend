/*
 * Handover note: User-facing navbar.
 * Provides basic navigation and logout behavior for non-admin pages.
 */
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav>
      <ul
        style={{
          display: "flex",
          gap: "20px",
          listStyle: "none",
          alignItems: "center",
        }}
      >
        <li>
          <Link to="/admin/dashboard">Dashboard</Link>
        </li>
        <li>
          <Link to="/admin/category">Categories</Link>
        </li>
        <li>
          <Link to="/admin/subcategory">SubCategories</Link>
        </li>
        <li>
          <Link to="/admin/products">Products</Link>
        </li>
        <li style={{ marginLeft: "auto" }}>
          <button
            onClick={handleLogout}
            style={{
              background: "#e94560",
              color: "white",
              border: "none",
              padding: "8px 18px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;

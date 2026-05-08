import "../styles/Navbar.css";
import { Search, User, ShoppingCart, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        STYLE
      </Link>

      <ul className="navbar-links">
        <li className="shop-dropdown">
          <div className="shop-link">
            Shop <ChevronDown size={15} strokeWidth={2} />
          </div>

          <div className="dropdown-menu">
            <Link to="/shop/men">Men</Link>

            <Link to="/shop/women">Women</Link>

            <Link to="/shop/children">Children</Link>
          </div>
        </li>

        <li>About</li>
        <li>Contact</li>
        <li>Blog</li>
      </ul>

      <div className="navbar-icons">
        <Search size={20} strokeWidth={2} />
        <User size={20} strokeWidth={2} />

        <div className="cart-icon">
          <ShoppingCart size={20} strokeWidth={2} />
          <span className="cart-badge">3</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

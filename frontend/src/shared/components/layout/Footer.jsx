import "../../../styles/Footer.css";
import { Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useCategories } from "../../../features/products/hooks/useCategories";

const Footer = () => {
  const { categories } = useCategories();

  return (
    <footer className="footer">
      <div className="footer-main">
        <div className="footer-column footer-brand">
          <div className="footer-logo">Loft</div>
          <p className="footer-brand-description">
            Curated collections of premium fashion for the discerning eye.
          </p>

          <div className="footer-socials">
            <a
              href="#instagram"
              className="social-icon"
              aria-label="Follow us on Instagram"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a
              href="#twitter"
              className="social-icon"
              aria-label="Follow us on Twitter"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="#facebook"
              className="social-icon"
              aria-label="Follow us on Facebook"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
            <a
              href="#youtube"
              className="social-icon"
              aria-label="Follow us on Youtube"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
              </svg>
            </a>
          </div>
        </div>

        <div className="footer-column">
          <h3 className="footer-column-title">SHOP</h3>
          <ul className="footer-links">
            {categories && categories.length > 0 ? (
              categories.slice(0, 5).map((cat) => (
                <li key={cat._id}>
                  <Link to={`/shop/${cat.slug}`}>{cat.name}</Link>
                </li>
              ))
            ) : (
              <li>
                <Link to="/shop">Shop All</Link>
              </li>
            )}
            <li>
              <a href="#collections">New Arrivals</a>
            </li>
            <li>
              <a href="#bestsellers">Best Sellers</a>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <h3 className="footer-column-title">COMPANY</h3>
          <ul className="footer-links">
            <li>
              <a href="#about">About</a>
            </li>

            <li>
              <a href="#careers">Careers</a>
            </li>
            <li>
              <a href="#sustainability">Sustainability</a>
            </li>
            <li>
              <a href="#contact">Contact</a>
            </li>
          </ul>
        </div>

        <div className="footer-column">
          <h3 className="footer-column-title">SUPPORT</h3>
          <ul className="footer-links">
            <li>
              <a href="#help">Help Center</a>
            </li>
            <li>
              <a href="#shipping">Shipping & Returns</a>
            </li>
            <li>
              <a href="#tracking">Order Tracking</a>
            </li>
            <li>
              <a href="#faq">FAQs</a>
            </li>
            <li>
              <a href="#privacy">Privacy Policy</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-divider"></div>

      <div className="footer-bottom">
        <div className="footer-bottom-left">
          <p>&copy; 2026 Loft. All rights reserved.</p>
        </div>

        <div className="footer-bottom-right">
          <p className="footer-secure">
            <Mail size={14} />
            Secure Payments
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { X, User, Heart, ShoppingCart } from "lucide-react";

const NavbarMobileMenu = ({
  mobileMenuOpen,
  setMobileMenuOpen,
  mobileMenuRef,
  categories,
  handleMobileNav,
  isAuthenticated,
  user,
  wishlistCount,
  cartCount,
  logout,
}) => {
  if (!mobileMenuOpen) return null;

  return (
    <div
      className="mobile-menu-overlay"
      onClick={() => setMobileMenuOpen(false)}
    >
      <div
        ref={mobileMenuRef}
        className="mobile-menu"
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-menu-header">
          <span className="mobile-menu-logo">Loft</span>
          <button
            className="mobile-menu-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} strokeWidth={2} />
          </button>
        </div>

        <div className="mobile-menu-links">
          <div className="mobile-menu-group">
            <span className="mobile-menu-label">Shop</span>
            {categories && categories.length > 0 ? (
              categories.map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => handleMobileNav(`/shop/${cat.slug}`)}
                >
                  {cat.name}
                </button>
              ))
            ) : (
              <button onClick={() => handleMobileNav("/shop")}>Shop All</button>
            )}
          </div>

          <button onClick={() => handleMobileNav("footer")}>About</button>
          <button onClick={() => handleMobileNav("footer")}>Contact</button>

        </div>

        <div className="mobile-menu-bottom">
          {isAuthenticated ? (
            <>
              <div className="mobile-menu-user-greeting">
                Hello, {user?.name || "User"}
              </div>
              <button onClick={() => handleMobileNav("/profile")}>
                <User size={18} /> Profile
              </button>
            </>
          ) : (
            <button onClick={() => handleMobileNav("/login")}>
              <User size={18} /> Login / Register
            </button>
          )}
          <button onClick={() => handleMobileNav("/profile?tab=Wishlist")}>
            <Heart size={18} /> Wishlist
            {wishlistCount > 0 && (
              <span className="mobile-badge">{wishlistCount}</span>
            )}
          </button>
          <button onClick={() => handleMobileNav("/checkout")}>
            <ShoppingCart size={18} /> Cart
            {cartCount > 0 && <span className="mobile-badge">{cartCount}</span>}
          </button>
          {isAuthenticated && (
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="mobile-logout-btn"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavbarMobileMenu;

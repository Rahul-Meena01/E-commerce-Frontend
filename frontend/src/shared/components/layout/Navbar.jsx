import "../../../styles/Navbar.css";
import {
  Search,
  User,
  ShoppingCart,
  ChevronDown,
  Menu,
  Heart,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useWishlistState } from "@/features/wishlist/hooks/useWishlist";
import { useCartState } from "@/features/cart/hooks/useCart";
import {
  useAuthState,
  useAuthActions,
} from "@/features/auth/context/AuthContext";
import { useCategories } from "../../../features/products/hooks/useCategories";
import { useSubCategories } from "../../../features/products/hooks/useSubCategories";
import { formatPrice } from "@/utils/pricing";
import SearchOverlay from "../../../features/search/components/SearchOverlay";
import NavbarMobileMenu from "./NavbarMobileMenu";
import NavbarDesktopMenu from "./NavbarDesktopMenu";
import CartDrawer from "./CartDrawer";

const Navbar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shopMenuOpen, setShopMenuOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeShopKey, setActiveShopKey] = useState("men");
  const navigate = useNavigate();
  const location = useLocation();
  const searchTriggerRef = useRef(null);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const mobileMenuRef = useRef(null);
  const shopMenuCloseTimerRef = useRef(null);
  const { wishlistCount } = useWishlistState();
  const { cartCount } = useCartState();
  const { isAuthenticated, user } = useAuthState();
  const { logout } = useAuthActions();
  const { categories } = useCategories();
  const { subcategories: allSubCategories = [] } = useSubCategories();
  const shopMenuItems = categories.map((cat) => {
    const catKey = cat.slug || normalizeMenuKey(cat.name);
    const catSubCats = allSubCategories.filter(
      (sub) =>
        sub.parentCategory?._id === cat._id ||
        sub.parentCategory === cat._id
    );
    return {
      key: catKey,
      label: cat.name,
      route: `/shop/${cat.slug}`,
      note: "",
      description: cat.description || `Explore our dynamic ${cat.name} collection.`,
      subCategories: catSubCats.map((sub) => ({
        label: sub.name,
        slug: sub.slug,
        route: `/shop/${cat.slug}/${sub.slug}`,
      })),
    };
  });
  const activeShopItem =
    shopMenuItems.find((item) => item.key === activeShopKey) ||
    shopMenuItems[0];
  const activeShopSubCategories = activeShopItem?.subCategories || [];

  const openShopMenu = (
    itemKey = activeShopItem?.key || shopMenuItems[0]?.key,
  ) => {
    if (shopMenuCloseTimerRef.current) {
      clearTimeout(shopMenuCloseTimerRef.current);
      shopMenuCloseTimerRef.current = null;
    }

    setActiveShopKey(itemKey);
    setShopMenuOpen(true);
  };

  const closeShopMenu = () => {
    if (shopMenuCloseTimerRef.current) {
      clearTimeout(shopMenuCloseTimerRef.current);
    }

    shopMenuCloseTimerRef.current = setTimeout(() => {
      setShopMenuOpen(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (shopMenuCloseTimerRef.current) {
        clearTimeout(shopMenuCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setMobileMenuOpen(false);
          return;
        }

        if (e.key === "Tab") {
          const container = mobileMenuRef.current;
          if (!container) return;
          const focusables = container.querySelectorAll(
            'button, a, [tabindex="0"]',
          );
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (shopMenuCloseTimerRef.current) {
      clearTimeout(shopMenuCloseTimerRef.current);
      shopMenuCloseTimerRef.current = null;
    }
    setSearchOpen(false);
    setSearchQuery("");
    setMobileMenuOpen(false);
    setShopMenuOpen(false);
  }, [location.pathname]);

  function closeSearch() {
    searchTriggerRef.current?.focus({ preventScroll: true });
    setSearchOpen(false);
    setSearchQuery("");
  }

  const handleMobileNav = (path) => {
    setMobileMenuOpen(false);
    if (path === "footer") {
      scrollToFooter();
    } else {
      navigate(path);
    }
  };

  const scrollToFooter = () => {
    document.querySelector(".footer")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className="announcement-bar">
        <p>Free standard shipping on orders over {formatPrice(1000)} • 30-day premium return policy</p>
      </div>
      <nav className={`navbar ${isScrolled ? "scrolled" : ""}`} aria-label="Main navigation">
        <Link to="/" className="navbar-logo">
          Loft
        </Link>

      <ul className="navbar-links">
        <li
          className={`shop-dropdown ${shopMenuOpen ? "open" : ""}`}
          onMouseEnter={() => openShopMenu(activeShopItem?.key)}
          onMouseLeave={closeShopMenu}
          onFocusCapture={() => openShopMenu(activeShopItem?.key)}
          onBlurCapture={closeShopMenu}
        >
          <button
            className="shop-link"
            aria-haspopup="menu"
            aria-expanded={shopMenuOpen}
            aria-label="Shop categories"
            onMouseEnter={() => openShopMenu(activeShopItem?.key)}
            onFocus={() => openShopMenu(activeShopItem?.key)}
          >
            Shop <ChevronDown size={15} strokeWidth={2} />
          </button>

          <NavbarDesktopMenu
            shopMenuItems={shopMenuItems}
            activeShopKey={activeShopKey}
            setActiveShopKey={setActiveShopKey}
            activeShopItem={activeShopItem}
            activeShopSubCategories={activeShopSubCategories}
            setShopMenuOpen={setShopMenuOpen}
            navigate={navigate}
          />
        </li>

        <li
          onClick={scrollToFooter}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && scrollToFooter()
          }
        >
          About
        </li>
        <li
          onClick={scrollToFooter}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && scrollToFooter()
          }
        >
          Contact
        </li>

      </ul>

      <div className="navbar-icons">
        <button
          ref={searchTriggerRef}
          className="navbar-icon-link"
          onClick={() => setSearchOpen(true)}
          aria-label="Search products"
          aria-expanded={searchOpen}
          aria-controls="search-overlay"
        >
          <Search size={20} strokeWidth={2} />
        </button>
        <Link
          to="/profile?tab=Wishlist"
          className="navbar-icon-link"
          aria-label="View wishlist"
        >
          <Heart size={20} strokeWidth={2} />
          {wishlistCount > 0 && (
            <span className="wishlist-badge">{wishlistCount}</span>
          )}
        </Link>
        {isAuthenticated ? (
          <div className="user-dropdown-container">
            <Link
              to="/profile"
              className="navbar-icon-link"
              aria-label="View profile"
            >
              <User size={20} strokeWidth={2} />
            </Link>
            <div className="user-dropdown-menu" role="menu">
              <div className="user-dropdown-header">
                <span className="user-dropdown-name">{user?.name}</span>
                <span className="user-dropdown-email">{user?.email}</span>
              </div>
              <div className="user-dropdown-divider" />
              <Link
                to="/profile"
                className="user-dropdown-item"
                role="menuitem"
              >
                My Profile
              </Link>

              <Link
                to="/profile?tab=Orders"
                className="user-dropdown-item"
                role="menuitem"
              >
                My Orders
              </Link>
              <button
                onClick={logout}
                className="user-dropdown-item logout-btn"
                role="menuitem"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            className="navbar-icon-link"
            aria-label="Open login"
          >
            <User size={20} strokeWidth={2} />
          </Link>
        )}

        <button
          className="cart-icon"
          onClick={() => setCartDrawerOpen(true)}
          aria-label="Open cart drawer"
        >
          <ShoppingCart size={20} strokeWidth={2} />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>

        <button
          className="hamburger-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          <Menu size={22} strokeWidth={2} />
        </button>
      </div>

      <SearchOverlay
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        closeSearch={closeSearch}
        navigate={navigate}
      />

      <NavbarMobileMenu
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        mobileMenuRef={mobileMenuRef}
        categories={categories}
        handleMobileNav={handleMobileNav}
        isAuthenticated={isAuthenticated}
        user={user}
        wishlistCount={wishlistCount}
        cartCount={cartCount}
        logout={logout}
      />
      </nav>
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </>
  );
};

export default Navbar;

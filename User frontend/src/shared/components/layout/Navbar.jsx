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
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useWishlistState } from "@/features/wishlist/hooks/useWishlist";
import { useCartState } from "@/features/cart/hooks/useCart";
import {
  useAuthState,
  useAuthActions,
} from "@/features/auth/context/AuthContext";
import { useCategories } from "../../../features/products/hooks/useCategories";
import { useSubCategories } from "../../../features/products/hooks/useSubCategories";
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
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const shopMenuCloseTimerRef = useRef(null);
  const { wishlistCount } = useWishlistState();
  const { cartCount } = useCartState();
  const { isAuthenticated, user } = useAuthState();
  const { logout } = useAuthActions();
  const { categories } = useCategories();
  const { subcategories: allSubCategories = [] } = useSubCategories();
  const shopMenuItems = useMemo(() => categories.map((cat) => {
    const catKey =
      cat.slug ||
      cat.name
        ?.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "") ||
      cat._id;

    const catSubCats = allSubCategories.filter(
      (sub) =>
        sub.parentCategory?._id === cat._id || sub.parentCategory === cat._id,
    );

    return {
      key: catKey,
      label: cat.name,
      route: `/shop/${cat.slug}`,
      note: "",
      description:
        cat.description || `Explore our carefully selected list of pre-loved ${cat.name} finds.`,
      subCategories: catSubCats.map((sub) => ({
        label: sub.name,
        slug: sub.slug,
        route: `/shop/${cat.slug}/${sub.slug}`,
      })),
    };
  }), [categories, allSubCategories]);

  const activeShopItem = useMemo(
    () => shopMenuItems.find((item) => item.key === activeShopKey) || shopMenuItems[0],
    [shopMenuItems, activeShopKey],
  );
  const activeShopSubCategories = useMemo(
    () => activeShopItem?.subCategories || [],
    [activeShopItem],
  );

  const openShopMenu = useCallback((
    itemKey = activeShopItem?.key || shopMenuItems[0]?.key,
  ) => {
    if (shopMenuCloseTimerRef.current) {
      clearTimeout(shopMenuCloseTimerRef.current);
      shopMenuCloseTimerRef.current = null;
    }

    setActiveShopKey(itemKey);
    setShopMenuOpen(true);
  }, [activeShopItem, shopMenuItems]);

  const closeShopMenu = useCallback(() => {
    if (shopMenuCloseTimerRef.current) {
      clearTimeout(shopMenuCloseTimerRef.current);
    }

    shopMenuCloseTimerRef.current = setTimeout(() => {
      setShopMenuOpen(false);
    }, 120);
  }, []);

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

  const closeSearch = useCallback(() => {
    searchTriggerRef.current?.focus({ preventScroll: true });
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const scrollToFooter = useCallback(() => {
    document.querySelector(".footer")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleMobileNav = useCallback((path) => {
    setMobileMenuOpen(false);
    if (path === "footer") {
      scrollToFooter();
    } else {
      navigate(path);
    }
  }, [navigate, scrollToFooter]);

  useEffect(() => {
    const handleCartItemAdded = () => {
      setCartDrawerOpen(true);
    };
    window.addEventListener("cart-item-added", handleCartItemAdded);
    return () => {
      window.removeEventListener("cart-item-added", handleCartItemAdded);
    };
  }, []);

  const handleDropdownKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      setShopMenuOpen(false);
      e.currentTarget.querySelector(".shop-link")?.focus();
    }
  }, []);

  const handleShopLinkKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openShopMenu(activeShopItem?.key || (shopMenuItems[0] && shopMenuItems[0].key));
      setTimeout(() => {
        const firstBtn = document.querySelector(".mega-menu-category");
        if (firstBtn) firstBtn.focus();
      }, 50);
    }
  }, [openShopMenu, activeShopItem, shopMenuItems]);

  return (
    <>
      <div className="announcement-bar">
        <p>
          Newly Curated: Summer Thrift Finds Worth Discovering • 30-day returns
        </p>
      </div>
      <nav
        className={`navbar ${isScrolled ? "scrolled" : ""}`}
        aria-label="Main navigation"
      >
        <Link to="/" className="navbar-logo">
          LOFT
        </Link>

        <ul className="navbar-links">
          <li
            className={`shop-dropdown ${shopMenuOpen ? "open" : ""}`}
            onMouseEnter={() => openShopMenu(activeShopItem?.key)}
            onMouseLeave={closeShopMenu}
            onFocusCapture={() => openShopMenu(activeShopItem?.key)}
            onBlurCapture={closeShopMenu}
            onKeyDown={handleDropdownKeyDown}
          >
            <button
              className="shop-link"
              aria-haspopup="menu"
              aria-expanded={shopMenuOpen}
              aria-label="Shop categories"
              onMouseEnter={() => openShopMenu(activeShopItem?.key)}
              onFocus={() => openShopMenu(activeShopItem?.key)}
              onKeyDown={handleShopLinkKeyDown}
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

          <li>
            <Link to="/about">About</Link>
          </li>
          <li>
            <Link to="/contact">Contact</Link>
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
          categories={categories}
          handleMobileNav={handleMobileNav}
          isAuthenticated={isAuthenticated}
          user={user}
          wishlistCount={wishlistCount}
          cartCount={cartCount}
          logout={logout}
        />
      </nav>
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />
    </>
  );
};

export default Navbar;

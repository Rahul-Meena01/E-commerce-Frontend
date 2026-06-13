import { Link } from "react-router-dom";
import OptimizedImage from "../ui/OptimizedImage";

const NavbarDesktopMenu = ({
  shopMenuItems,
  activeShopKey,
  setActiveShopKey,
  activeShopItem,
  activeShopSubCategories,
  setShopMenuOpen,
  navigate,
}) => {
  return (
    <div className="mega-menu" role="menu">
      <div className="mega-menu-shell">
        <div className="mega-menu-grid">
          <div className="mega-menu-left">
            <p className="mega-menu-kicker">Shop the edit</p>
            <div className="mega-menu-category-list" role="presentation">
              {shopMenuItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`mega-menu-category ${
                    activeShopKey === item.key ? "active" : ""
                  }`}
                  onMouseEnter={() => setActiveShopKey(item.key)}
                  onFocus={() => setActiveShopKey(item.key)}
                  onClick={() => {
                    setShopMenuOpen(false);
                    navigate(item.route);
                  }}
                >
                  <span className="mega-menu-category-label">
                    {item.label}
                  </span>
                  <span className="mega-menu-category-note">
                    {item.note}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mega-menu-center" key={activeShopKey}>
            <div className="mega-menu-section-heading">
              <span className="mega-menu-section-eyebrow">
                Selected category
              </span>
              <h3>{activeShopItem?.label}</h3>
              <p>{activeShopItem?.description}</p>
            </div>

            <div className="mega-menu-subcategories">
              {activeShopSubCategories.map((subCategory) => (
                <Link
                  key={subCategory.slug}
                  to={subCategory.route}
                  className="mega-menu-subcategory"
                  role="menuitem"
                  onClick={() => setShopMenuOpen(false)}
                >
                  <span>{subCategory.label}</span>
                </Link>
              ))}
              <Link
                to={activeShopItem?.route || "/shop"}
                className="mega-menu-subcategory mega-menu-view-all"
                role="menuitem"
                onClick={() => setShopMenuOpen(false)}
              >
                <span>View all {activeShopItem?.label}</span>
              </Link>
            </div>
          </div>

          <Link
            to="/shop/collections"
            className="mega-menu-promo"
            onClick={() => setShopMenuOpen(false)}
          >
            <div className="mega-menu-promo-image-wrap">
              <OptimizedImage
                src="/heroSection.png"
                alt="Luxury Fashion Campaign"
                className="mega-menu-promo-image"
              />
            </div>

            <div className="mega-menu-promo-content">
              <span className="mega-menu-promo-kicker">
                Luxury Fashion Campaign
              </span>
              <h3>Curated silhouettes for the modern wardrobe</h3>
              <p>
                Discover elevated tailoring, seasonal layers, and refined
                essentials selected for the Loft edit.
              </p>
              <span className="mega-menu-promo-cta">
                Discover campaign
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NavbarDesktopMenu;

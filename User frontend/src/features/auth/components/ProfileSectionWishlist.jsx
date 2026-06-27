import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import { formatPrice } from "../../../utils/pricing";
import { useToast } from "@/context/ToastContext";
import { isOutOfStock } from "../../../shared/utils/productUtils";

const ProfileSectionWishlist = ({ wishlistCount, wishlistItems, removeFromWishlist, addToCart, navigate }) => {
  const toast = useToast();
  return (
    <div className="profile-section-wishlist">
      <div className="profile-section-header">
        <h2 className="profile-section-title">My Wishlist</h2>
        <p className="profile-section-subtitle">{wishlistCount} items saved</p>
      </div>

      {wishlistItems.length > 0 ? (
        <div className="profile-wishlist-grid">
          {wishlistItems.map((item) => (
            <div key={item.id} className="profile-wishlist-card">
              <div className="profile-wishlist-image">
                <Link to={`/product/${item.id}`} className="profile-wishlist-image-link">
                  <OptimizedImage src={item.image} alt={item.name} />
                </Link>
                <button
                  className="profile-wishlist-remove"
                  aria-label="Remove from wishlist"
                  onClick={() => removeFromWishlist(item.id)}
                >
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>
              <div className="profile-wishlist-content">
                <Link to={`/product/${item.id}`} className="profile-wishlist-name-link">
                  <h3 className="profile-wishlist-name">{item.name}</h3>
                </Link>
                <p className="profile-wishlist-price">{formatPrice(item.price)}</p>
                <button
                  className={`profile-wishlist-add-btn${isOutOfStock(item) ? " profile-wishlist-add-btn--disabled" : ""}`}
                  disabled={isOutOfStock(item)}
                  onClick={() => {
                    if (isOutOfStock(item)) {
                      toast.error(`${item.name} is currently out of stock.`);
                      return;
                    }
                    addToCart({
                      product: {
                        productId: item.id,
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        image: item.image,
                        brand: item.brand,
                        stock: item.stock,
                      },
                      size: "",
                      color: "",
                      quantity: 1,
                    });
                    toast.success(`${item.name} added to bag!`);
                  }}
                >
                  {isOutOfStock(item) ? "Out of Stock" : "Add to Bag"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="profile-empty-state">
          <Heart size={48} color="#d0d0d0" />
          <h3>Your wishlist is empty</h3>
          <p>Browse our curated finds and heart the items you wish to save.</p>
          <button
            className="profile-cta-btn"
            onClick={() => navigate("/shop")}
          >
            Explore the Collection
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileSectionWishlist;

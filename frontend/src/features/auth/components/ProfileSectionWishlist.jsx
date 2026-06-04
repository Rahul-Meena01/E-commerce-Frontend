import { Heart } from "lucide-react";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";

const ProfileSectionWishlist = ({ wishlistCount, wishlistItems, removeFromWishlist, addToCart, navigate }) => {
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
                <OptimizedImage src={item.image} alt={item.name} />
                <button
                  className="profile-wishlist-remove"
                  aria-label="Remove from wishlist"
                  onClick={() => removeFromWishlist(item.id)}
                >
                  <Heart size={18} fill="currentColor" />
                </button>
              </div>
              <div className="profile-wishlist-content">
                <h3 className="profile-wishlist-name">{item.name}</h3>
                <p className="profile-wishlist-price">${item.price}</p>
                <button
                  className="profile-wishlist-add-btn"
                  onClick={() =>
                    addToCart({ ...item, productId: item.id }, "", "", 1)
                  }
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="profile-empty-state">
          <Heart size={48} color="#d0d0d0" />
          <h3>Your wishlist is empty</h3>
          <p>Browse our collections and heart the items you love.</p>
          <button
            className="profile-cta-btn"
            onClick={() => navigate("/shop/men")}
          >
            Start Shopping
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileSectionWishlist;

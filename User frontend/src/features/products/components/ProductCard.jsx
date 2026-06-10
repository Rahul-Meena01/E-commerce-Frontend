import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import "@/styles/ProductCard.css";
import { useWishlist } from '@/features/wishlist/hooks/useWishlist';
import { useCart } from '@/features/cart/hooks/useCart';
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import { formatPrice } from "@/utils/pricing";

const ProductCard = ({ product }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  const productId = product._id || product.id;
  const wishlisted = isInWishlist(productId);
  const primaryImage =
    product.image ||
    product.image1 ||
    product.image2 ||
    product.image3 ||
    product.image4 ||
    product.images?.[0] ||
    "";

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      id: productId,
      name: product.name,
      price: product.price,
      image: primaryImage,
      brand: product.brand,
      category: product.category,
    });
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      product: {
        productId,
        id: productId,
        name: product.name,
        price: product.price,
        image: primaryImage,
        brand: product.brand,
      },
      size: "",
      color: "",
      quantity: 1,
    });
  };

  return (
    <div className="pc-card">
      <Link to={`/product/${productId}`} className="pc-link">
        <div className="pc-media">
          <OptimizedImage
            src={primaryImage}
            alt={product.name}
          />
        </div>
      </Link>

      <div className="pc-body">
        <div className="pc-meta">
          <span className="pc-brand">{product.brand}</span>
          <button
            className={`pc-wishlist ${wishlisted ? "active" : ""}`}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            onClick={handleWishlistToggle}
          >
            <Heart
              size={16}
              fill={wishlisted ? "#c0392b" : "none"}
              color={wishlisted ? "#c0392b" : "currentColor"}
            />
          </button>
        </div>
        <h4 className="pc-title">{product.name}</h4>
        <div className="pc-price-row">
          <span className="pc-price">
            {formatPrice(product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price)}
          </span>
          {product.discountPrice && product.discountPrice < product.price && (
            <span className="pc-old-price">
              {formatPrice(product.price)}
            </span>
          )}
          {(product.discountPercent || product.discount) && (
            <span className="pc-discount">-{product.discountPercent || product.discount}%</span>
          )}
        </div>
        <button
          className="pc-add"
          type="button"
          onClick={handleAddToCart}
          aria-label={`Add ${product.name} to cart`}
        >
          Add to cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;

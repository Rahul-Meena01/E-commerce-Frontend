import { memo } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import "@/styles/ProductCard.css";
import { useWishlist } from "@/features/wishlist/hooks/useWishlist";
import { useCart } from "@/features/cart/hooks/useCart";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import { formatPrice } from "@/utils/pricing";
import { useToast } from "@/context/ToastContext";
import { isOutOfStock, getProductStock } from "@/shared/utils/productUtils";

const ProductCard = ({ product }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  const toast = useToast();

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

  const effectivePrice =
    product.discountPrice != null &&
    Number(product.discountPrice) < Number(product.price)
      ? Number(product.discountPrice)
      : Number(product.price);

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();

    toggleWishlist({
      id: productId,
      name: product.name,
      price: effectivePrice,
      image: primaryImage,
      brand: product.brand,
      category: product.category,
    });

    if (wishlisted) {
      toast.success(`${product.name} removed from wishlist`);
    } else {
      toast.success(`${product.name} added to wishlist!`);
    }
  };

  const outOfStock = isOutOfStock(product);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (outOfStock) {
      toast.error(`${product.name} is currently out of stock.`);
      return;
    }

    addToCart({
      product: {
        productId,
        id: productId,
        name: product.name,
        price: effectivePrice,
        image: primaryImage,
        brand: product.brand,
        stock: getProductStock(product),
      },
      size: "",
      color: "",
      quantity: 1,
    });
    toast.success(`${product.name} added to bag!`);
  };

  return (
    <div className="pc-card">
      <Link to={`/product/${productId}`} className="pc-link">
        {" "}
        <div className="pc-media">
          {" "}
          <OptimizedImage src={primaryImage} alt={product.name} />{" "}
        </div>{" "}
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
          <span className="pc-price">{formatPrice(effectivePrice)}</span>

          {product.discountPrice &&
            Number(product.discountPrice) < Number(product.price) && (
              <span className="pc-old-price">{formatPrice(product.price)}</span>
            )}

          {(product.discountPercent || product.discount) && (
            <span className="pc-discount">
              -{product.discountPercent || product.discount}%
            </span>
          )}
        </div>

        <button
          className={`pc-add${outOfStock ? " pc-add--disabled" : ""}`}
          type="button"
          onClick={handleAddToCart}
          aria-label={outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to bag`}
          disabled={outOfStock}
        >
          {outOfStock ? "Out of Stock" : "Add to bag"}
        </button>
      </div>
    </div>
  );
};

export default memo(ProductCard);

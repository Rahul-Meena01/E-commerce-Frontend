import { Link } from "react-router-dom";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import { formatPrice } from "@/utils/pricing";

export default function SearchDiscoveryProductCard({
  product,
  onSelect,
  badge,
}) {
  const productId = product?._id || product?.id || product?.productId;
  const primaryImage =
    product?.image ||
    product?.image1 ||
    product?.image2 ||
    product?.image3 ||
    product?.image4 ||
    product?.images?.[0] ||
    "";

  const price = Number(product?.price) || 0;
  const discountPrice = Number(product?.discountPrice || product?.salePrice) || 0;
  const hasDiscount = discountPrice > 0 && discountPrice < price;

  return (
    <Link
      to={`/product/${productId}`}
      className="search-discovery-product-card"
      onClick={onSelect}
    >
      <div className="search-discovery-product-card__media">
        <OptimizedImage src={primaryImage} alt={product?.name || "Product"} />
        {badge ? (
          <span className="search-discovery-product-card__badge">{badge}</span>
        ) : null}
      </div>

      <div className="search-discovery-product-card__body">
        <p className="search-discovery-product-card__brand">
          {product?.brand || "Loft"}
        </p>
        <h4 className="search-discovery-product-card__title">
          {product?.name || "Product"}
        </h4>
        {/* <p className="search-discovery-product-card__meta">{categoryLabel}</p> */}
        <div className="search-discovery-product-card__footer">
          {hasDiscount ? (
            <>
              <span className="search-discovery-product-card__price sale">
                {formatPrice(discountPrice)}
              </span>
              <span className="search-discovery-product-card__original-price struck" style={{ textDecoration: "line-through", opacity: 0.6, fontSize: "0.9em", marginLeft: "8px" }}>
                {formatPrice(price)}
              </span>
            </>
          ) : (
            <span className="search-discovery-product-card__price">
              {formatPrice(price)}
            </span>
          )}
          {product?.discount || product?.discountPercent ? (
            <span className="search-discovery-product-card__discount" style={{ color: "#d9534f", fontSize: "0.85em", marginLeft: "8px", fontWeight: "bold" }}>
              -{product.discount || product.discountPercent}%
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

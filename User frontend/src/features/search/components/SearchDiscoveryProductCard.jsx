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

  if (!productId) return null;

  const price = Number(product?.price) || 0;
  const categoryLabel =
    product?.categoryName || product?.category || "Featured";
  console.log(categoryLabel)
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
          <span className="search-discovery-product-card__price">
            {formatPrice(price)}
          </span>
          {product?.discount ? (
            <span className="search-discovery-product-card__discount">
              -{product.discount}%
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

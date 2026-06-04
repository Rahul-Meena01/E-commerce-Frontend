import { Link } from "react-router-dom";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";

export default function SearchDiscoveryProductCard({
  product,
  onSelect,
  badge,
}) {
  const productId =
    product?.productId ||
    product?.slug ||
    (product?.id ? `${product.category}_${product.id}` : product?._id) ||
    "";

  if (!productId) return null;

  const price = Number(product?.price) || 0;
  const categoryLabel =
    product?.categoryName || product?.category || "Featured";

  return (
    <Link
      to={`/product/${productId}`}
      className="search-discovery-product-card"
      onClick={onSelect}
    >
      <div className="search-discovery-product-card__media">
        <OptimizedImage src={product?.image} alt={product?.name || "Product"} />
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
        <p className="search-discovery-product-card__meta">{categoryLabel}</p>
        <div className="search-discovery-product-card__footer">
          <span className="search-discovery-product-card__price">
            ${price}.00
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

import { Link } from "react-router-dom";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import { formatPrice } from "@/utils/pricing";

export default function SearchResultProductCard({ product, onSelect }) {
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
  const categoryLabel =
    product?.categoryName || product?.category || "Featured";
  const inStock =
    product?.stock > 0 || product?.inventory > 0 || product?.inStock;

  return (
    <Link
      to={`/product/${productId}`}
      className="search-result-card"
      onClick={onSelect}
    >
      <div className="search-result-card__media">
        <OptimizedImage src={primaryImage} alt={product?.name || "Product"} />
      </div>

      <div className="search-result-card__body">
        <p className="search-result-card__brand">{product?.brand || "Loft"}</p>
        <h4 className="search-result-card__title">
          {product?.name || "Product"}
        </h4>
        <p className="search-result-card__meta">{categoryLabel}</p>

        <div className="search-result-card__meta-row">
          <div
            className={`search-result-card__stock ${inStock ? "in" : "out"}`}
          >
            {inStock ? "In stock" : "Out of stock"}
          </div>
        </div>

        <div className="search-result-card__footer">
          <span className="search-result-card__price">{formatPrice(price)}</span>
        </div>
      </div>
    </Link>
  );
}

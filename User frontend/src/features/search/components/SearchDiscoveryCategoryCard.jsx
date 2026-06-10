import { Link } from "react-router-dom";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";

export default function SearchDiscoveryCategoryCard({
  category,
  image,
  count,
  onSelect,
}) {
  if (!category?.slug) return null;

  return (
    <Link
      to={`/shop/${category.slug}`}
      className="search-discovery-category-card"
      onClick={onSelect}
    >
      <div className="search-discovery-category-card__media">
        {image ? (
          <OptimizedImage src={image} alt={category.name} />
        ) : (
          <div className="search-discovery-category-card__fallback">
            {category.name?.slice(0, 1) || "#"}
          </div>
        )}
      </div>

      <div className="search-discovery-category-card__body">
        <p className="search-discovery-category-card__eyebrow">
          Popular category
        </p>
        <h4 className="search-discovery-category-card__title">
          {category.name}
        </h4>
        <p className="search-discovery-category-card__meta">
          {count > 0 ? `${count} featured products` : "Explore the collection"}
        </p>
      </div>
    </Link>
  );
}

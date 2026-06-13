import { useMemo } from "react";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useRecentlyViewedProducts } from "../hooks/useRecentlyViewedProducts";
import SearchDiscoveryCategoryCard from "./SearchDiscoveryCategoryCard";
import SearchDiscoveryProductCard from "./SearchDiscoveryProductCard";
import { IMAGE_FALLBACK } from "@/constants/images";

const CATEGORY_VISUALS = {
  men: IMAGE_FALLBACK,
  women: IMAGE_FALLBACK,
  kids: IMAGE_FALLBACK,
  accessories: IMAGE_FALLBACK,
  footwear: IMAGE_FALLBACK,
};

const DEFAULT_CATEGORY_VISUALS = [
  IMAGE_FALLBACK,
];

function getCategoryKey(category) {
  return (category?.slug || category?.name || "").toLowerCase();
}

function getCategoryVisual(category, index) {
  return (
    CATEGORY_VISUALS[getCategoryKey(category)] ||
    DEFAULT_CATEGORY_VISUALS[index % DEFAULT_CATEGORY_VISUALS.length]
  );
}

function getProductCategoryLabel(product) {
  return (
    product?.subCategory?.parentCategory?.name ||
    product?.categoryName ||
    product?.category ||
    "Featured"
  );
}

export default function SearchDiscovery({ onSelect }) {
  const { products: trendingSource, loading: trendingLoading } = useProducts({
    limit: 24,
  });
  const { categories, loading: categoriesLoading } = useCategories();
  const { recentlyViewedProducts } = useRecentlyViewedProducts();

  const trendingProducts = useMemo(
    () => trendingSource.slice(0, 8),
    [trendingSource],
  );

  const categoryCounts = useMemo(() => {
    return trendingSource.reduce((accumulator, product) => {
      const categoryLabel = getProductCategoryLabel(product);
      accumulator[categoryLabel] = (accumulator[categoryLabel] || 0) + 1;
      return accumulator;
    }, {});
  }, [trendingSource]);

  const popularCategories = useMemo(() => {
    const orderedCategories = [...(categories || [])].sort((left, right) => {
      const rightCount = categoryCounts[right.name] || 0;
      const leftCount = categoryCounts[left.name] || 0;

      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }

      return left.name.localeCompare(right.name);
    });

    return orderedCategories.slice(0, 5);
  }, [categories, categoryCounts]);

  const trendingRail = trendingLoading
    ? Array.from({ length: 4 })
    : trendingProducts;
  const categoryRail = categoriesLoading
    ? Array.from({ length: 4 })
    : popularCategories;
  const recentlyViewedRail = recentlyViewedProducts.slice(0, 4);

  return (
    <div className="search-discovery" aria-label="Shop discovery">
      <section className="search-discovery__section">
        <div className="search-discovery__section-header">
          <div>
            <p className="search-discovery__eyebrow">Shop now</p>
            <h3 className="search-discovery__title">Trending Products</h3>
          </div>
          <p className="search-discovery__summary">
            Fresh picks from the current catalog.
          </p>
        </div>

        <div className="search-discovery__rail search-discovery__rail--products">
          {trendingRail.map((product, index) => (
            <div
              className="search-discovery__item"
              key={product?.productId || product?._id || index}
            >
              {trendingLoading ? (
                <div
                  className="search-discovery__skeleton-card"
                  aria-hidden="true"
                >
                  <div className="search-discovery__skeleton-media" />
                  <div className="search-discovery__skeleton-body">
                    <div className="search-discovery__skeleton-line search-discovery__skeleton-line--short" />
                    <div className="search-discovery__skeleton-line" />
                    <div className="search-discovery__skeleton-line search-discovery__skeleton-line--tiny" />
                  </div>
                </div>
              ) : (
                <SearchDiscoveryProductCard
                  product={product}
                  onSelect={onSelect}
                  badge="Trending"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="search-discovery__section">
        <div className="search-discovery__section-header">
          <div>
            <p className="search-discovery__eyebrow">Browse by edit</p>
            <h3 className="search-discovery__title">Popular Categories</h3>
          </div>
          <p className="search-discovery__summary">
            Shop the collections customers reach for most.
          </p>
        </div>

        <div className="search-discovery__rail search-discovery__rail--categories">
          {categoryRail.map((category, index) => {
            if (!category) {
              return (
                <div
                  className="search-discovery__skeleton-category"
                  key={`category-skeleton-${index}`}
                  aria-hidden="true"
                />
              );
            }

            return (
              <div
                className="search-discovery__item"
                key={category._id || category.slug || index}
              >
                <SearchDiscoveryCategoryCard
                  category={category}
                  image={getCategoryVisual(category, index)}
                  count={categoryCounts[category.name] || 0}
                  onSelect={onSelect}
                />
              </div>
            );
          })}
        </div>
      </section>

      {recentlyViewedRail.length > 0 ? (
        <section className="search-discovery__section">
          <div className="search-discovery__section-header">
            <div>
              <p className="search-discovery__eyebrow">Return to browsing</p>
              <h3 className="search-discovery__title">
                Recently Viewed Products
              </h3>
            </div>
            <p className="search-discovery__summary">
              Pick up where you left off.
            </p>
          </div>

          <div className="search-discovery__rail search-discovery__rail--products">
            {recentlyViewedRail.map((product, index) => (
              <div
                className="search-discovery__item"
                key={product.productId || index}
              >
                <SearchDiscoveryProductCard
                  product={product}
                  onSelect={onSelect}
                  badge="Recently viewed"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

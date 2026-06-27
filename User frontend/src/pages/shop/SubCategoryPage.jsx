import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import Breadcrumb from "@/features/products/components/Breadcrumb";
import ProductCard from "@/features/products/components/ProductCard";
import ProductCardSkeleton from "@/features/products/components/ProductCardSkeleton";

import "../../styles/SubCategory.css";

import { useProductsQuery } from "@/features/products/hooks/useProductsQuery";

const Filters = lazy(() => import("@/features/products/components/Filters"));

const ITEMS_PER_PAGE = 20;

const SubCategoryPage = () => {
  const { category, subCategory } = useParams();

  const [searchParams, setSearchParams] = useSearchParams();

  const readFiltersFromURL = () => ({
    brands: searchParams.getAll("brand"),
    colors: searchParams.getAll("color"),
    sizes: searchParams.getAll("size"),
    tags: searchParams.getAll("tag"),
    priceMin: searchParams.get("priceMin") || "",
    priceMax: searchParams.get("priceMax") || "",
    rating: searchParams.get("rating") || "",
    stock: searchParams.get("stock") || "all",
    sort: searchParams.get("sort") || "newest",
  });

  const [filters, setFilters] = useState(() => readFiltersFromURL());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    setFilters(readFiltersFromURL());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: queryData, isLoading } = useProductsQuery({
    category,
    subCategory,
  });
  const products = useMemo(() => queryData?.data || [], [queryData]);

  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [category, subCategory]);

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, visible.length));
  };

  const availableFilters = useMemo(() => {
    const brands = new Set();
    const colors = new Set();
    const sizes = new Set();
    const tags = new Set();

    products.forEach((p) => {
      if (p.brand) brands.add(p.brand);
      if (p.color) colors.add(p.color);

      if (p.sizes) {
        p.sizes.forEach((s) => sizes.add(s));
      }

      if (p.tags) {
        p.tags.forEach((t) => tags.add(t));
      }
    });

    return {
      brands: Array.from(brands).sort(),
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort(),
      tags: Array.from(tags).sort(),
    };
  }, [products]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);

    const params = new URLSearchParams(searchParams);

    ["brand", "color", "size", "tag"].forEach((key) => params.delete(key));

    params.delete("priceMin");
    params.delete("priceMax");
    params.delete("rating");
    params.delete("stock");
    params.delete("sort");

    newFilters.brands?.forEach((b) => params.append("brand", b));

    newFilters.colors?.forEach((c) => params.append("color", c));

    newFilters.sizes?.forEach((s) => params.append("size", s));

    newFilters.tags?.forEach((t) => params.append("tag", t));

    if (newFilters.priceMin) {
      params.set("priceMin", newFilters.priceMin);
    }

    if (newFilters.priceMax) {
      params.set("priceMax", newFilters.priceMax);
    }

    if (newFilters.rating) {
      params.set("rating", newFilters.rating);
    }

    if (newFilters.stock && newFilters.stock !== "all") {
      params.set("stock", newFilters.stock);
    }

    if (newFilters.sort && newFilters.sort !== "newest") {
      params.set("sort", newFilters.sort);
    }

    setSearchParams(params, { replace: true });
  };

  const visible = useMemo(() => {
    const filtered = products.filter((p) => {
      if (filters.brands?.length && !filters.brands.includes(p.brand)) {
        return false;
      }

      if (filters.colors?.length && !filters.colors.includes(p.color)) {
        return false;
      }

      if (
        filters.sizes?.length &&
        !p.sizes?.some((s) => filters.sizes.includes(s))
      ) {
        return false;
      }

      if (
        filters.tags?.length &&
        !p.tags?.some((t) => filters.tags.includes(t))
      ) {
        return false;
      }

      const finalPrice =
        p.discountPrice && p.discountPrice < p.price
          ? p.discountPrice
          : p.salePrice && p.salePrice < p.price
            ? p.salePrice
            : p.price;

      if (filters.priceMin && finalPrice < Number(filters.priceMin)) {
        return false;
      }

      if (filters.priceMax && finalPrice > Number(filters.priceMax)) {
        return false;
      }

      if (filters.stock === "in") {
        if ((p.stock ?? 0) <= 0) return false;
      } else if (filters.stock === "out") {
        if ((p.stock ?? 0) > 0) return false;
      }

      if (filters.rating) {
        const threshold = Number(filters.rating);
        const ratingVal = Number(p.averageRating ?? p.rating ?? 0);
        if (ratingVal < threshold) return false;
      }

      return true;
    });

    const mapped = filtered.map((item, index) => ({ item, index }));

    mapped.sort((a, b) => {
      const sortVal = filters.sort || "newest";
      let comparison;

      if (sortVal === "price-asc") {
        const priceA = a.item.discountPrice || a.item.salePrice || a.item.price || 0;
        const priceB = b.item.discountPrice || b.item.salePrice || b.item.price || 0;
        comparison = priceA - priceB;
      } else if (sortVal === "price-desc") {
        const priceA = a.item.discountPrice || a.item.salePrice || a.item.price || 0;
        const priceB = b.item.discountPrice || b.item.salePrice || b.item.price || 0;
        comparison = priceB - priceA;
      } else if (sortVal === "rating") {
        const ratingA = Number(a.item.averageRating ?? a.item.rating ?? 0);
        const ratingB = Number(b.item.averageRating ?? b.item.rating ?? 0);
        comparison = ratingB - ratingA;
      } else if (sortVal === "popularity") {
        const popA = Number(a.item.soldCount ?? a.item.sales ?? a.item.views ?? 0);
        const popB = Number(b.item.soldCount ?? b.item.sales ?? b.item.views ?? 0);
        comparison = popB - popA;
      } else {
        const dateA = new Date(a.item.createdAt || 0).getTime();
        const dateB = new Date(b.item.createdAt || 0).getTime();
        comparison = dateB - dateA;
      }

      if (comparison === 0) {
        return a.index - b.index;
      }
      return comparison;
    });

    return mapped.map((x) => x.item);
  }, [products, filters]);

  const formatSlug = (slug = "") =>
    slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const displayTitle = formatSlug(subCategory);
  const categoryTitle = formatSlug(category);

  return (
    <div className="subcat-page">
      <div className="subcat-breadcrumb">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            {
              label: categoryTitle,
              to: `/shop/${category}`,
            },
            {
              label: displayTitle,
            },
          ]}
        />
      </div>

      <header className="subcat-editorial-header">
        <span className="subcat-eyebrow">Carefully Selected</span>

        <h1 className="subcat-title-editorial">{displayTitle}</h1>
      </header>

      <div className="subcat-main">
        <button
          className="mobile-filters-btn"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal size={14} />
          Filter & Sort
        </button>

        <aside className={`subcat-left ${filtersOpen ? "open" : ""}`}>
          <div className="mobile-filters-header">
            <h3>Filter & Sort</h3>

            <button
              className="mobile-filters-close"
              onClick={() => setFiltersOpen(false)}
              aria-label="Close filters"
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="subcat-filters-scroll-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense fallback={<div className="loft-filter-sidebar" />}>
              <Filters
                key={`${category}-${subCategory}`}
                filters={availableFilters}
                initialBrands={filters.brands}
                initialColors={filters.colors}
                initialSizes={filters.sizes}
                initialTags={filters.tags}
                initialPriceMin={filters.priceMin}
                initialPriceMax={filters.priceMax}
                initialRating={filters.rating}
                initialStock={filters.stock}
                initialSort={filters.sort}
                onChange={handleFilterChange}
              />
            </Suspense>
          </div>
        </aside>

        {filtersOpen && (
          <div
            className="filters-backdrop"
            onClick={() => setFiltersOpen(false)}
          />
        )}

        <section className="subcat-grid">
          <header className="subcat-header">
            <span className="subcat-count">
              {isLoading ? "Loading..." : `${visible.length} pieces curated`}
            </span>
          </header>

          <div className="subcat-products">
            {isLoading &&
              [...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}

            {!isLoading &&
              visible.slice(0, displayCount).map((prod) => (
                <ProductCard key={prod._id || prod.id} product={prod} />
              ))}

            {!isLoading && visible.length === 0 && (
              <div
                className="empty-search-state"
                style={{
                  padding: "40px 0",
                  gridColumn: "1 / -1",
                  textAlign: "center",
                }}
              >
                <p>No curated pieces match your filters.</p>
              </div>
            )}
          </div>

          {!isLoading && displayCount < visible.length && (
            <div className="subcat-load-more">
              <button
                className="loft-price-btn"
                onClick={handleLoadMore}
                type="button"
              >
                Explore More ({visible.length - displayCount} remaining)
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SubCategoryPage;

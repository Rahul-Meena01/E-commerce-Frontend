import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import Breadcrumb from "@/features/products/components/Breadcrumb";
import Filters from "@/features/products/components/Filters";
import ProductCard from "@/features/products/components/ProductCard";
import ProductCardSkeleton from "@/features/products/components/ProductCardSkeleton";

import "../../styles/SubCategory.css";

import { productsApi } from "@/features/products/services/products.service";
import logger from "@/shared/utils/logger";

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
  });

  const [filters, setFilters] = useState(() => readFiltersFromURL());
  const [allProducts, setAllProducts] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(readFiltersFromURL());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        setLoading(true);

        const res = await productsApi.getProducts(
          `/product/public/all?category=${category}&subCategory=${subCategory}`,
        );

        if (!res.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await res.json();

        if (!cancelled) {
          setAllProducts(data?.data || []);
        }
      } catch (error) {
        logger.error(error);

        if (!cancelled) {
          setAllProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [category, subCategory]);

  const products = allProducts;

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

    setSearchParams(params, { replace: true });
  };

  const visible = useMemo(() => {
    return products.filter((p) => {
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

      return true;
    });
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
        <span className="subcat-eyebrow">Curated Collection</span>

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
            <Filters
              key={`${category}-${subCategory}`}
              filters={availableFilters}
              initialBrands={filters.brands}
              initialColors={filters.colors}
              initialSizes={filters.sizes}
              initialTags={filters.tags}
              initialPriceMin={filters.priceMin}
              initialPriceMax={filters.priceMax}
              onChange={handleFilterChange}
            />
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
              {loading ? "Loading..." : `${visible.length} items found`}
            </span>
          </header>

          <div className="subcat-products">
            {loading &&
              [...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}

            {!loading &&
              visible.map((prod) => (
                <ProductCard key={prod._id || prod.id} product={prod} />
              ))}

            {!loading && visible.length === 0 && (
              <div
                className="empty-search-state"
                style={{
                  padding: "40px 0",
                  gridColumn: "1 / -1",
                  textAlign: "center",
                }}
              >
                <p>No products matched your filters.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SubCategoryPage;

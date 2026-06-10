import { useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import Breadcrumb from "@/features/products/components/Breadcrumb";
import Filters from "@/features/products/components/Filters";
import ProductCard from "@/features/products/components/ProductCard";
import "../../styles/SubCategory.css"; // Reuse SubCategory styles for consistency
import { productsApi } from '@/features/products/services/products.service';

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get("search") || searchParams.get("q") || "";
  
  const [filters, setFilters] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        setLoading(true);
        const url = searchParam
          ? `/product/public/all?search=${encodeURIComponent(searchParam)}`
          : `/product/public/all`;
        const res = await productsApi.getProducts(url);
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        if (!cancelled) setAllProducts(data?.data || []);
      } catch (err) {
        console.error("Shop page products fetch error:", err);
        if (!cancelled) setAllProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [searchParam]);

  const availableFilters = useMemo(() => {
    const brands = new Set();
    const colors = new Set();
    const sizes = new Set();
    const tags = new Set();

    allProducts.forEach((p) => {
      if (p.brand) brands.add(p.brand);
      if (p.color) colors.add(p.color);
      if (p.sizes) p.sizes.forEach((s) => sizes.add(s));
      if (p.tags) p.tags.forEach((t) => tags.add(t));
    });

    return {
      brands: Array.from(brands).sort(),
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort(),
      tags: Array.from(tags).sort(),
    };
  }, [allProducts]);

  const visible = useMemo(() => {
    return allProducts.filter((p) => {
      if (filters.brands && filters.brands.length && !filters.brands.includes(p.brand)) return false;
      if (filters.colors && filters.colors.length && !filters.colors.includes(p.color)) return false;
      if (filters.sizes && filters.sizes.length && !p.sizes?.some(s => filters.sizes.includes(s))) return false;
      if (filters.tags && filters.tags.length && !p.tags?.some(t => filters.tags.includes(t))) return false;
      
      const finalPrice = p.discountPrice && p.discountPrice < p.price 
        ? p.discountPrice 
        : (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price);

      if (filters.priceMin && finalPrice < Number(filters.priceMin)) return false;
      if (filters.priceMax && finalPrice > Number(filters.priceMax)) return false;
      return true;
    });
  }, [allProducts, filters]);

  const displayTitle = searchParam ? `Search Results for "${searchParam}"` : "All Products";

  return (
    <div className="subcat-page">
      <div className="subcat-breadcrumb">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Shop" },
          ]}
        />
      </div>

      <header className="subcat-editorial-header">
        <span className="subcat-eyebrow">Loft Catalog</span>
        <h1 className="subcat-title-editorial">{displayTitle}</h1>
      </header>

      <div className="subcat-main">
        {/* Mobile Filters Trigger */}
        <button className="mobile-filters-btn" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={14} /> Filter & Sort
        </button>

        <aside className={`subcat-left ${filtersOpen ? "open" : ""}`}>
          <div className="mobile-filters-header">
            <h3>Filter & Sort</h3>
            <button className="mobile-filters-close" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
              <X size={20} />
            </button>
          </div>
          <div className="subcat-filters-scroll-wrap" onClick={(e) => e.stopPropagation()}>
            <Filters filters={availableFilters} onChange={(newFilters) => {
              setFilters(newFilters);
            }} />
          </div>
        </aside>

        {filtersOpen && <div className="filters-backdrop" onClick={() => setFiltersOpen(false)} />}

        <section className="subcat-grid">
          <header className="subcat-header">
            <span className="subcat-count">
              {loading ? "Loading products..." : `${visible.length} items found`}
            </span>
          </header>

          <div className="subcat-products">
            {!loading && visible.map((prod) => (
              <ProductCard key={prod._id || prod.id} product={prod} />
            ))}
            {!loading && visible.length === 0 && (
              <div className="empty-search-state" style={{ padding: "40px 0", gridColumn: "1 / -1", textAlign: "center" }}>
                <p>No products matched your search or filters.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ShopPage;

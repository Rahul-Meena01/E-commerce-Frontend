import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import Breadcrumb from "@/features/products/components/Breadcrumb";
import Filters from "@/features/products/components/Filters";
import ProductCard from "@/features/products/components/ProductCard";
import "../../styles/SubCategory.css";
import { productsApi } from '@/features/products/services/products.service';

const SubCategoryPage = () => {
  const { category, subCategory } = useParams();
  const [filters, setFilters] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        const res = await productsApi.getProducts(`/api/products?category=${category}&subCategory=${subCategory}`);
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        if (!cancelled) setAllProducts(data?.data || []);
      } catch {
        if (!cancelled) setAllProducts([]);
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
      if (p.sizes) p.sizes.forEach((s) => sizes.add(s));
      if (p.tags) p.tags.forEach((t) => tags.add(t));
    });

    return {
      brands: Array.from(brands).sort(),
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort(),
      tags: Array.from(tags).sort(),
    };
  }, [products]);

  const visible = useMemo(() => {
    return products.filter((p) => {
      if (filters.brands && filters.brands.length && !filters.brands.includes(p.brand)) return false;
      if (filters.colors && filters.colors.length && !filters.colors.includes(p.color)) return false;
      if (filters.sizes && filters.sizes.length && !p.sizes?.some(s => filters.sizes.includes(s))) return false;
      if (filters.tags && filters.tags.length && !p.tags?.some(t => filters.tags.includes(t))) return false;
      if (filters.priceMin && p.price < Number(filters.priceMin)) return false;
      if (filters.priceMax && p.price > Number(filters.priceMax)) return false;
      return true;
    });
  }, [products, filters]);

  // Clean title
  const displayTitle = subCategory.charAt(0).toUpperCase() + subCategory.slice(1);

  return (
    <div className="subcat-page">
      <div className="subcat-breadcrumb">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: category, to: `/shop/${category}` },
            { label: subCategory },
          ]}
        />
      </div>

      <header className="subcat-editorial-header">
        <span className="subcat-eyebrow">Curated Collection</span>
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
              // Do not auto-close filters drawer to allow multiple selections, let user dismiss
            }} />
          </div>
        </aside>

        {filtersOpen && <div className="filters-backdrop" onClick={() => setFiltersOpen(false)} />}

        <section className="subcat-grid">
          <header className="subcat-header">
            <span className="subcat-count">{visible.length} items found</span>
          </header>

          <div className="subcat-products">
            {visible.map((prod) => (
              <ProductCard key={`${prod.category}_${prod.id}`} product={prod} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SubCategoryPage;

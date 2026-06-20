import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "./ProductCard";
import { productsApi } from '@/features/products/services/products.service';
import "@/styles/ProductSlider.css";

const ProductSliderSkeleton = ({ title }) => {
  const containerRef = useRef(null);
  const [count, setCount] = useState(4);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        // card size is 280px + gap (~300px per card)
        const visibleCount = Math.max(1, Math.floor(width / 300));
        setCount(visibleCount);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="product-slider-section">
      <div className="slider-header">
        <h2 className="slider-title">{title}</h2>
      </div>
      <div ref={containerRef} className="slider-grid" style={{ overflow: "hidden" }}>
        {[...Array(count)].map((_, i) => (
          <div className="pc-card" key={i} style={{ minWidth: "280px", opacity: 0.7 }}>
            <div className="pc-media ds-skeleton" style={{ height: "320px", width: "100%" }}></div>
            <div className="pc-body" style={{ gap: "12px" }}>
              <div className="ds-skeleton" style={{ height: "14px", width: "40%" }}></div>
              <div className="ds-skeleton" style={{ height: "20px", width: "80%" }}></div>
              <div className="ds-skeleton" style={{ height: "16px", width: "30%" }}></div>
              <div className="ds-skeleton" style={{ height: "36px", width: "100%", marginTop: "8px" }}></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ProductSlider = ({ title, fetchUrl, viewAllLink }) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const sliderRef = useRef(null);

  const { data: rawProducts = [], isLoading } = useQuery({
    queryKey: ["products", "slider", fetchUrl],
    queryFn: async () => {
      const res = await productsApi.getProducts(fetchUrl);
      if (!res.ok) throw new Error(`Failed to load products for ${title}`);
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const products = useMemo(() => {
    if (!rawProducts || rawProducts.length === 0) return [];
    
    // Parse URL params
    let sortVal = "";
    let limitVal = null;
    try {
      const url = new URL(fetchUrl, window.location.origin);
      sortVal = url.searchParams.get("sort") || "";
      const limitStr = url.searchParams.get("limit");
      if (limitStr) {
        limitVal = parseInt(limitStr, 10);
      }
    } catch {
      // Fallback manual regex parse if URL creation fails
      const sortMatch = fetchUrl.match(/[?&]sort=([^&]+)/);
      if (sortMatch) sortVal = sortMatch[1];
      const limitMatch = fetchUrl.match(/[?&]limit=([0-9]+)/);
      if (limitMatch) limitVal = parseInt(limitMatch[1], 10);
    }

    let items = [...rawProducts];

    // Apply client-side sorting
    if (sortVal === "newest") {
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortVal === "rating") {
      items.sort((a, b) => (b.rating || b.averageRating || 0) - (a.rating || a.averageRating || 0));
    } else if (sortVal === "popularity") {
      items.sort((a, b) => (b.popularity || b.numReviews || b.salesCount || 0) - (a.popularity || a.numReviews || a.salesCount || 0));
    }

    // Apply client-side limit
    if (limitVal && !isNaN(limitVal)) {
      items = items.slice(0, limitVal);
    }

    return items;
  }, [rawProducts, fetchUrl]);

  const updateScrollButtons = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  };

  useEffect(() => {
    const grid = sliderRef.current;
    if (grid) {
      grid.addEventListener("scroll", updateScrollButtons);
      updateScrollButtons();
      const resizeObserver = new ResizeObserver(() => updateScrollButtons());
      resizeObserver.observe(grid);
      return () => {
        grid.removeEventListener("scroll", updateScrollButtons);
        resizeObserver.disconnect();
      };
    }
  }, [products]);

  const scroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = 320;
      sliderRef.current.scrollBy({
         left: direction === "left" ? -scrollAmount : scrollAmount,
         behavior: "smooth",
      });
    }
  };

  if (isLoading) {
    return <ProductSliderSkeleton title={title} />;
  }

  if (!products || products.length === 0) return null;

  return (
    <section className="product-slider-section">
      <div className="slider-header">
        <h2 className="slider-title">{title}</h2>
        <div className="slider-controls">
          {viewAllLink && (
            <Link to={viewAllLink} className="view-all-link">
              View All
            </Link>
          )}
          <button
            className="arrow-btn"
            aria-label="Previous"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <button
            className="arrow-btn"
            aria-label="Next"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div ref={sliderRef} className="slider-grid">
        {products.map((item) => (
          <ProductCard key={item._id} product={item} />
        ))}
      </div>
    </section>
  );
};

export default ProductSlider;

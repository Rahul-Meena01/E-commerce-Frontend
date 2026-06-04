import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "./ProductCard";
import { productsApi } from '@/features/products/services/products.service';
import "@/styles/ProductSlider.css";

const ProductSliderSkeleton = ({ title }) => (
  <section className="product-slider-section">
    <div className="slider-header">
      <h2 className="slider-title">{title}</h2>
    </div>
    <div className="slider-grid" style={{ overflow: "hidden" }}>
      {[1, 2, 3, 4].map((i) => (
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

const ProductSlider = ({ title, fetchUrl, viewAllLink }) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const sliderRef = useRef(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", "slider", fetchUrl],
    queryFn: async () => {
      const res = await productsApi.getProducts(fetchUrl);
      if (!res.ok) throw new Error(`Failed to load products for ${title}`);
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

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

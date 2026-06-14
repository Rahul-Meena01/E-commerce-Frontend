import { useEffect, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { ZoomIn } from "lucide-react";
import { IMAGE_FALLBACK } from "@/constants/images";
import "./ProductGallery.css";

/**
 * LOFT Premium Fashion Editorial Product Gallery
 * 
 * Desktop: Single Hero Preview + Sidebar Hover Navigation
 * - Left sidebar: Sticky thumbnail list with custom borders.
 * - Right: Single Hero Image preview with fixed dimensions and elegant fade-in transition on swap.
 * - Interaction: Hovering over sidebar thumbnails updates the active hero preview image.
 * 
 * Mobile: Native swipeable slider with dot thumbnails.
 */
const ProductGallery = ({ images = [], alt = "Product image", isMobile = false, openLightbox }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const heroImgRef = useRef(null);
  const thumbRefs = useRef([]);

  // Trust parent input to be unique and pre-sliced to max 5
  const uniqueImages = useMemo(() => images, [images]);
  const uniqueIndices = useMemo(() => images.map((_, i) => i), [images]);

  const imageCount = uniqueImages.length;

  // Reset active index if images change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0);
  }, [imageCount]);

  const handleMouseMove = (e) => {
    if (isMobile) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    if (heroImgRef.current) {
      heroImgRef.current.style.transformOrigin = `${x}% ${y}%`;
      heroImgRef.current.style.transform = "scale(1.08)";
    }
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    if (heroImgRef.current) {
      heroImgRef.current.style.transformOrigin = "center center";
      heroImgRef.current.style.transform = "scale(1)";
    }
  };

  const handleKeyDown = (e, index) => {
    if (imageCount <= 1) return;
    let nextIndex = index;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (index - 1 + imageCount) % imageCount;
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (index + 1) % imageCount;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = imageCount - 1;
    }

    if (nextIndex !== index) {
      selectImage(nextIndex);
      thumbRefs.current[nextIndex]?.focus();
    }
  };

  // Mobile: Scroll listener to track visible image in CSS snap container
  const handleMobileScroll = (e) => {
    if (!isMobile || imageCount <= 1) return;
    const container = e.currentTarget;
    const width = container.offsetWidth;
    if (width > 0) {
      const newIndex = Math.round(container.scrollLeft / width);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < imageCount) {
        setActiveIndex(newIndex);
      }
    }
  };

  // Smooth scroll helper for mobile indicators / desktop selection
  const selectImage = (index) => {
    if (index < 0 || index >= imageCount) return;
    setActiveIndex(index);
    if (isMobile) {
      const container = containerRef.current;
      if (container) {
        container.scrollTo({
          left: container.offsetWidth * index,
          behavior: "smooth",
        });
      }
    }
  };

  const handleImageError = (e) => {
    e.target.src = IMAGE_FALLBACK;
    e.target.onerror = null;
  };

  if (imageCount === 0) {
    return (
      <div className="pg-empty">
        <div className="pg-empty-msg">No images available</div>
      </div>
    );
  }

  return (
    <div
      className={`pg-editorial ${isMobile ? "pg-editorial--mobile" : "pg-editorial--desktop"}`}
      aria-label="Product image gallery"
      role="region"
    >
      {/* ════════════ DESKTOP LAYOUT (Hover Sidebar + Hero Preview) ════════════ */}
      {!isMobile && (
        <div className={`pg-desktop-layout ${imageCount <= 1 ? "pg-single-image" : ""}`}>
          {/* Sticky Side Thumbnails Sidebar */}
          {imageCount > 1 && (
            <div className="pg-desktop-anchors" role="tablist" aria-label="Product image thumbnails">
              {uniqueImages.map((img, i) => (
                <button
                  key={i}
                  className={`pg-desktop-anchor-btn ${i === activeIndex ? "active" : ""}`}
                  onMouseEnter={() => selectImage(i)}
                  onClick={() => selectImage(i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-selected={i === activeIndex}
                  ref={(el) => (thumbRefs.current[i] = el)}
                  role="tab"
                  type="button"
                >
                  <img
                    src={img.thumb || img.src}
                    alt={`${alt} thumbnail ${i + 1}`}
                    onError={handleImageError}
                    className="pg-anchor-thumb-img"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Hero Preview Container */}
          <div className="pg-desktop-hero-container">
            <div
              className="pg-desktop-hero-item"
              onClick={() => openLightbox && openLightbox(uniqueIndices[activeIndex])}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  openLightbox && openLightbox(uniqueIndices[activeIndex]);
                }
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: "zoom-in" }}
              tabIndex={0}
              role="button"
              aria-label="View large image"
            >
              <img
                key={activeIndex} // Force re-mount to trigger fade-in transition
                src={uniqueImages[activeIndex].src}
                alt={uniqueImages[activeIndex].alt || `${alt} - view ${activeIndex + 1}`}
                onError={handleImageError}
                ref={heroImgRef}
                loading="eager"
              />
              <div className="pg-hover-zoom-badge">
                <ZoomIn size={16} strokeWidth={2} />
                <span>Zoom</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ MOBILE LAYOUT (CSS Snap Slider) ════════════ */}
      {isMobile && (
        <div className="pg-mobile-layout">
          {/* Horizontal Snap Scroll Container */}
          <div
            ref={containerRef}
            className="pg-mobile-slider-container"
            onScroll={handleMobileScroll}
          >
            {uniqueImages.map((img, i) => (
              <div
                key={i}
                className="pg-mobile-slide"
                onClick={() => openLightbox && openLightbox(uniqueIndices[i])}
              >
                <img
                  src={img.src}
                  alt={img.alt || `${alt} - view ${i + 1}`}
                  onError={handleImageError}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>

          {/* Counter pill overlay */}
          {imageCount > 1 && (
            <div className="pg-mobile-counter" aria-hidden="true">
              {activeIndex + 1} / {imageCount}
            </div>
          )}

          {/* Navigation Thumbnail Strip below */}
          {imageCount > 1 && (
            <div className="pg-mobile-thumbs-strip" role="tablist" aria-label="Product image dots">
              {uniqueImages.map((img, i) => (
                <button
                  key={i}
                  className={`pg-mobile-thumb-dot-btn ${i === activeIndex ? "active" : ""}`}
                  onClick={() => selectImage(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-selected={i === activeIndex}
                  role="tab"
                  type="button"
                >
                  <img
                    src={img.thumb || img.src}
                    alt={`${alt} thumbnail ${i + 1}`}
                    onError={handleImageError}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

ProductGallery.propTypes = {
  images: PropTypes.array,
  alt: PropTypes.string,
  isMobile: PropTypes.bool,
  openLightbox: PropTypes.func,
};

export default ProductGallery;

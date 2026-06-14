import { useCallback, useEffect, useRef, useState } from "react";
import ResponsiveImage from "@/shared/components/ui/ResponsiveImage";
import "./LightboxModal.css";

/**
 * LOFT Premium Lightbox
 *
 * Minimal luxury lightbox with:
 * - Backdrop blur + dark overlay
 * - Smooth scale-in animation
 * - Arrow key, mouse wheel, click, swipe navigation
 * - Mobile pinch-zoom ready (via CSS touch-action)
 * - Focus trap for accessibility
 * - Thumbnail strip for quick navigation
 */
const LightboxModal = ({
  images = [],
  startIndex = 0,
  onClose,
  onNavigate,
}) => {
  const [index, setIndex] = useState(startIndex || 0);
  const [transitioning, setTransitioning] = useState(false);
  const modalRef = useRef(null);
  const previouslyFocused = useRef(null);

  // Touch refs for mobile swipe
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // ── Navigate to a specific index with animation ──
  const navigateTo = useCallback(
    (newIndex) => {
      if (newIndex < 0 || newIndex >= images.length || newIndex === index) return;
      setTransitioning(true);
      setTimeout(() => {
        setIndex(newIndex);
        setTransitioning(false);
      }, 150);
    },
    [images.length, index]
  );

  const goNext = useCallback(() => {
    navigateTo(Math.min(images.length - 1, index + 1));
  }, [navigateTo, images.length, index]);

  const goPrev = useCallback(() => {
    navigateTo(Math.max(0, index - 1));
  }, [navigateTo, index]);

  // ── Focus management & keyboard ──
  useEffect(() => {
    previouslyFocused.current = document.activeElement;

    const focusable = modalRef.current?.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    if (focusable) focusable.focus();

    const onKey = (e) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          goNext();
          break;
        case "Tab": {
          // Focus trap
          const focusableEls = modalRef.current?.querySelectorAll(
            "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
          );
          if (!focusableEls || focusableEls.length === 0) break;
          const firstEl = focusableEls[0];
          const lastEl = focusableEls[focusableEls.length - 1];
          if (!e.shiftKey && document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
          if (e.shiftKey && document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (previouslyFocused.current?.focus) previouslyFocused.current.focus();
    };
  }, [onClose, goNext, goPrev]);

  // ── Mouse wheel navigation ──
  useEffect(() => {
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > 30) {
        e.preventDefault();
        if (e.deltaY > 0) goNext();
        else goPrev();
      }
    };

    const modal = modalRef.current;
    if (modal) {
      modal.addEventListener("wheel", onWheel, { passive: false });
      return () => modal.removeEventListener("wheel", onWheel);
    }
  }, [goNext, goPrev]);

  // ── Sync with parent ──
  useEffect(() => {
    if (onNavigate) onNavigate(index);
  }, [index, onNavigate]);

  // ── Mobile swipe ──
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const onTouchEnd = () => {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const dx = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (dx > threshold) goNext();
    else if (dx < -threshold) goPrev();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // ── Click overlay to close ──
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!images || images.length === 0) return null;

  return (
    <div
      className="lb-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      ref={modalRef}
      onClick={handleOverlayClick}
    >
      <div className="lb-inner">
        {/* Close */}
        <button
          className="lb-close"
          aria-label="Close preview"
          onClick={onClose}
          type="button"
        >
          ×
        </button>

        {/* Previous */}
        <button
          className="lb-prev"
          aria-label="Previous image"
          onClick={goPrev}
          disabled={index === 0}
          type="button"
        >
          ‹
        </button>

        {/* Image */}
        <div
          className={`lb-image-wrap ${transitioning ? "lb-image-transitioning" : ""}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <ResponsiveImage
            sources={images[index]?.sources || []}
            src={images[index]?.src}
            sizes={images[index]?.sizes}
            alt={images[index]?.alt || `Image ${index + 1}`}
            loading="eager"
          />
        </div>

        {/* Next */}
        <button
          className="lb-next"
          aria-label="Next image"
          onClick={goNext}
          disabled={index === images.length - 1}
          type="button"
        >
          ›
        </button>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="lb-thumbs" role="tablist" aria-label="Image thumbnails">
            {images.map((img, i) => (
              <button
                key={i}
                className={`lb-thumb ${i === index ? "lb-thumb-active" : ""}`}
                onClick={() => navigateTo(i)}
                aria-label={`View image ${i + 1}`}
                aria-selected={i === index}
                role="tab"
                type="button"
              >
                <ResponsiveImage
                  sources={img.sources || []}
                  src={img.thumb || img.src}
                  alt={`Thumbnail ${i + 1}`}
                  loading="eager"
                />
              </button>
            ))}
          </div>
        )}

        {/* Counter */}
        <div className="lb-footer">
          <div className="lb-counter">
            {index + 1} / {images.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LightboxModal;

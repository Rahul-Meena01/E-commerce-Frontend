import React, { useEffect, useRef, useState } from "react";
import ResponsiveImage from "@/shared/components/ui/ResponsiveImage";
import "./StyleInspiration.css";

/**
 * LOFT Fashion Storytelling Section
 *
 * Displays editorial campaign images below the product gallery:
 * - Lifestyle photography
 * - Close-up fabric/detail shots
 * - Campaign imagery
 *
 * Reinforces premium perception with editorial layout.
 */
const StyleInspiration = ({ images = [], productName = "Product" }) => {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  // Reveal on scroll
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Build editorial images from product images
  // Use the images we have, labeling them with editorial context
  const editorialItems = [
    {
      src: images[0]?.src || images[0],
      alt: `${productName} — campaign editorial`,
      label: "Campaign",
    },
    {
      src: images[1]?.src || images[1],
      alt: `${productName} — fabric detail`,
      label: "Detail",
    },
    {
      src: images[2]?.src || images[2],
      alt: `${productName} — styled look`,
      label: "Styled",
    },
  ].filter((item) => item.src);

  if (editorialItems.length === 0) return null;

  return (
    <section
      className={`si-section ${visible ? "si-visible" : ""}`}
      ref={sectionRef}
      aria-label="Style Inspiration"
    >
      <div className="si-header">
        <span className="si-eyebrow">Style Inspiration</span>
        <h2 className="si-title">Styled For The Modern Wardrobe</h2>
        <p className="si-subtitle">
          Explore how this piece comes alive — from campaign editorials to
          everyday styling.
        </p>
      </div>

      <div className="si-grid">
        {editorialItems.map((item, i) => (
          <div
            key={i}
            className={`si-card si-card-${i + 1}`}
            style={{ animationDelay: `${i * 120 + 200}ms` }}
          >
            <div className="si-card-image">
              {typeof item.src === "string" ? (
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <ResponsiveImage
                  sources={item.src?.sources || []}
                  src={item.src?.src || item.src}
                  alt={item.alt}
                  loading="lazy"
                />
              )}
            </div>
            <div className="si-card-label">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StyleInspiration;

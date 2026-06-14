import { useEffect, useRef, useState } from "react";
import "./ResponsiveImage.css";

/**
 * ResponsiveImage
 * Props (JS doc style for TypeScript-friendliness):
 * - sources: Array<{ srcSet: string, type?: string, sizes?: string, placeholderSrcSet?: string }>
 * - src: string (fallback image)
 * - srcSet: string
 * - sizes: string
 * - placeholder: string (tiny blur data URL or low-res image)
 * - alt: string
 * - loading: 'lazy' | 'eager'
 * - className: string
 * - style: object
 */
const ResponsiveImage = ({
  sources = [],
  src,
  srcSet,
  sizes,
  placeholder,
  alt = "",
  loading = "lazy",
  className = "",
  ...rest
}) => {
  const [inView, setInView] = useState(loading !== "lazy");
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (inView) return;
    if (typeof window === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInView(true);
      return;
    }

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setInView(true);
              io.disconnect();
            }
          });
        },
        { rootMargin: "200px" },
      );

      if (wrapperRef.current) io.observe(wrapperRef.current);
      return () => io.disconnect();
    }

    // fallback
    setInView(true);
  }, [inView]);

  const handleLoad = (e) => {
    setLoaded(true);
    if (rest.onLoad) rest.onLoad(e);
  };

  return (
    <div
      ref={wrapperRef}
      className={"ri-wrapper " + (className || "")}
      style={rest.style}
    >
      <picture>
        {sources.map((s, i) => (
          <source
            key={i}
            type={s.type}
            sizes={s.sizes}
            srcSet={inView ? s.srcSet : s.placeholderSrcSet || ""}
          />
        ))}

        <img
          {...rest}
          className={"ri-img " + (loaded ? "ri-loaded" : "ri-loading")}
          src={inView ? src : placeholder || src}
          srcSet={inView ? srcSet : undefined}
          sizes={inView ? sizes : undefined}
          alt={alt}
          loading={loading}
          onLoad={handleLoad}
        />
      </picture>

      {/* Blur placeholder is shown until image loads when placeholder provided */}
      {!loaded && placeholder && (
        <div
          className="ri-placeholder"
          aria-hidden="true"
          style={{ backgroundImage: `url(${placeholder})` }}
        />
      )}
    </div>
  );
};

export default ResponsiveImage;

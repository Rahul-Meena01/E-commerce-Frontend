import { useState } from "react";
import { IMAGE_FALLBACK } from "@/constants/images";
import { resolveProductImage } from "@/shared/utils/api";

export default function OptimizedImage({
  src,
  alt,
  className = "",
  style = {},
  imgStyle = {},
  loading = "lazy",
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const isBrokenSrc = !src ||
    src === "null" ||
    src === "undefined" ||
    String(src).includes("undefined") ||
    String(src).includes("null") ||
    String(src).trim() === "";

  const resolvedSrc = isBrokenSrc ? IMAGE_FALLBACK : (resolveProductImage(src) || IMAGE_FALLBACK);

  return (
    <div
      className={`opt-image-container ${loaded ? "loaded" : "loading"} ${className}`}
      style={style}
    >
      {!loaded && <div className="opt-image-shimmer" />}
      <img
        src={error ? IMAGE_FALLBACK : resolvedSrc}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
        className={`opt-image ${loaded ? "visible" : "hidden"}`}
        style={imgStyle}
        {...props}
      />
    </div>
  );
}

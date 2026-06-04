import { useState, useEffect, useRef } from "react";
import { IMAGE_FALLBACK } from "@/constants/images";

export default function OptimizedImage({
  src,
  alt,
  className = "",
  style = {},
  imgStyle = {},
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // If image is already loaded from cache when src changes or component mounts
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
    } else {
      setLoaded(false);
      setError(false);
    }
  }, [src]);

  return (
    <div
      className={`opt-image-container ${loaded ? "loaded" : "loading"} ${className}`}
      style={style}
    >
      {!loaded && <div className="opt-image-shimmer" />}
      <img
        ref={imgRef}
        src={error ? IMAGE_FALLBACK : src}
        alt={alt}
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

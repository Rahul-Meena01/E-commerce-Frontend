import { useEffect, useRef, useState } from "react";

export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        if (options.triggerOnce !== false) {
          observer.unobserve(el);
        }
      } else if (options.triggerOnce === false) {
        setIsIntersecting(false);
      }
    }, {
      threshold: options.threshold ?? 0.1,
      rootMargin: options.rootMargin ?? "0px 0px -50px 0px",
      root: options.root ?? null,
    });

    observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [options.triggerOnce, options.threshold, options.rootMargin, options.root]);

  return [elementRef, isIntersecting];
};

export default useIntersectionObserver;

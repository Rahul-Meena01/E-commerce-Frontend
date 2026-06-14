import { useEffect } from "react";

export function useEscapeKey(handler, isActive = true) {
  useEffect(() => {
    if (!isActive) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        handler(e);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handler, isActive]);
}

import { useCallback, useEffect, useState } from "react";

export function useSearchKeyboardNavigation({
  items,
  onSelect,
  onClose,
  fallbackValue,
}) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(items.length > 0 ? 0 : -1);
  }, [items]);

  const moveBy = useCallback(
    (direction) => {
      if (!items.length) return;

      setActiveIndex((currentIndex) => {
        if (currentIndex < 0) {
          return direction > 0 ? 0 : items.length - 1;
        }

        const nextIndex =
          (currentIndex + direction + items.length) % items.length;
        return nextIndex;
      });
    },
    [items.length],
  );

  const selectActiveItem = useCallback(() => {
    if (activeIndex >= 0 && items[activeIndex]) {
      onSelect(items[activeIndex]);
      return;
    }

    const trimmedFallback = fallbackValue?.trim();
    if (trimmedFallback) {
      onSelect(trimmedFallback);
    }
  }, [activeIndex, fallbackValue, items, onSelect]);

  const handleKeyDown = useCallback(
    (event) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveBy(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveBy(-1);
          break;
        case "Enter":
          event.preventDefault();
          selectActiveItem();
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    },
    [moveBy, onClose, selectActiveItem],
  );

  const setHoverIndex = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  const activeId =
    activeIndex >= 0 && items[activeIndex] ? items[activeIndex].id : undefined;

  return {
    activeIndex,
    activeId,
    setActiveIndex,
    setHoverIndex,
    handleKeyDown,
    selectActiveItem,
  };
}

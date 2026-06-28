import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { formatPrice } from "@/utils/pricing";
import { useProductPresentation } from "@/features/products/context/ProductPresentationContext";
import "./StickyPurchaseBar.css";

const StickyPurchaseBar = ({
  thumbnail: propThumbnail,
  title: propTitle,
  selectedVariantSummary,
  price: propPrice,
  disabled: propDisabled,
  onAddToCart,
  visible,
}) => {
  const presentation = useProductPresentation();

  const thumbnail = propThumbnail || presentation?.gallery?.images[0]?.src || "";
  const title = propTitle || presentation?.name || "";
  const price = propPrice !== undefined && propPrice !== 0 ? propPrice : (presentation?.pricing?.price || 0);
  const disabled = propDisabled !== undefined ? propDisabled : (!presentation?.availability?.inStock);
  const [announce, setAnnounce] = useState("");
  const lastDisabledRef = useRef(disabled);

  useEffect(() => {
    if (lastDisabledRef.current !== disabled) {
      setAnnounce(disabled ? "Item unavailable" : "Item available");
      lastDisabledRef.current = disabled;
      const t = setTimeout(() => setAnnounce(""), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [disabled]);

  return (
    <div
      className={`spb-root ${visible ? "spb-visible" : "spb-hidden"}`}
      aria-hidden={!visible}
    >
      <div className="spb-inner">
        <div className="spb-left">
          {thumbnail && (
            <img
              src={thumbnail}
              alt={`${title} thumbnail`}
              className="spb-thumb"
            />
          )}
          <div className="spb-meta">
            <div className="spb-title">{title}</div>
            <div className="spb-variant">{selectedVariantSummary}</div>
          </div>
        </div>

        <div className="spb-right">
          <div className="spb-price">{formatPrice(price)}</div>
          <button
            className="spb-cta"
            onClick={onAddToCart}
            disabled={disabled}
            aria-disabled={disabled}
          >
            {disabled ? "Unavailable" : "Add to Bag"}
          </button>
        </div>
      </div>

      <div className="spb-live" aria-live="polite" aria-atomic="true">
        {announce}
      </div>
    </div>
  );
};

StickyPurchaseBar.propTypes = {
  thumbnail: PropTypes.string,
  title: PropTypes.string,
  selectedVariantSummary: PropTypes.string,
  price: PropTypes.number,
  disabled: PropTypes.bool,
  onAddToCart: PropTypes.func,
  visible: PropTypes.bool,
};

StickyPurchaseBar.defaultProps = {
  thumbnail: "",
  title: "",
  selectedVariantSummary: "",
  price: 0,
  disabled: false,
  onAddToCart: () => {},
  visible: false,
};

export default StickyPurchaseBar;

import PropTypes from "prop-types";
import { useMemo } from "react";
import { resolveProductImage } from "@/shared/utils/api";
import { isOutOfStock } from "@/shared/utils/productUtils";
import "./VariantSelector.css";

const VariantSelector = ({
  product,
  variants = [],
  selectedVariantId = "",
  onSelectVariant,
}) => {
  const activeVariants = useMemo(() => {
    return Array.isArray(variants) ? variants.filter((v) => v.status === "Active") : [];
  }, [variants]);

  if (!product || activeVariants.length === 0) {
    return null;
  }

  const isBaseOutOfStock = isOutOfStock(product) || product.status === "Inactive";

  const handleCardClick = (id, isUnavailable) => {
    if (isUnavailable) return;
    onSelectVariant(id);
  };

  return (
    <div className="pd-variants-section">
      <h3 className="pd-variants-title">Available Variants</h3>
      <div className="pd-variants-grid">
        {/* Base Product Card */}
        <button
          type="button"
          className={`pd-variant-card ${selectedVariantId === "" ? "active" : ""} ${isBaseOutOfStock ? "out-of-stock" : ""}`}
          onClick={() => handleCardClick("", isBaseOutOfStock)}
          disabled={isBaseOutOfStock}
          aria-label={`Select Original Product ${isBaseOutOfStock ? "(Sold Out)" : ""}`}
        >
          <div className="pd-variant-card-image-wrap">
            <img
              src={resolveProductImage(product.image)}
              alt="Original Product"
              className="pd-variant-card-image"
              loading="lazy"
            />
            {isBaseOutOfStock && <div className="pd-variant-sold-out-overlay">Sold Out</div>}
          </div>
          <span className="pd-variant-card-name">Original</span>
        </button>

        {/* Variant Cards */}
        {activeVariants.map((v) => {
          const isSelected = selectedVariantId === v._id;
          const isOutOfStockVal = isOutOfStock(v) || v.status === "Inactive";
          const imageSrc = resolveProductImage(v.image || product.image);

          return (
            <button
              key={v._id}
              type="button"
              className={`pd-variant-card ${isSelected ? "active" : ""} ${isOutOfStockVal ? "out-of-stock" : ""}`}
              onClick={() => handleCardClick(v._id, isOutOfStockVal)}
              disabled={isOutOfStockVal}
              aria-label={`Select ${v.name} ${isOutOfStockVal ? "(Sold Out)" : ""}`}
            >
              <div className="pd-variant-card-image-wrap">
                <img
                  src={imageSrc}
                  alt={v.name}
                  className="pd-variant-card-image"
                  loading="lazy"
                />
                {isOutOfStockVal && <div className="pd-variant-sold-out-overlay">Sold Out</div>}
              </div>
              <span className="pd-variant-card-name" title={v.name}>
                {v.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

VariantSelector.propTypes = {
  product: PropTypes.shape({
    image: PropTypes.string,
    stock: PropTypes.number,
  }).isRequired,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      image: PropTypes.string,
      stock: PropTypes.number,
      status: PropTypes.string,
    })
  ),
  selectedVariantId: PropTypes.string,
  onSelectVariant: PropTypes.func.isRequired,
};

export default VariantSelector;

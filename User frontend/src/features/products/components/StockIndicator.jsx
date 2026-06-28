import PropTypes from "prop-types";
import { useProductPresentation } from "@/features/products/context/ProductPresentationContext";
import "./StockIndicator.css";

const StockIndicator = ({
  inStock: propInStock,
  stockCount: propStockCount,
  backorder,
  lowStockThreshold = 5,
  className = "",
}) => {
  const presentation = useProductPresentation();

  const inStock = propInStock !== undefined ? propInStock : (presentation?.availability?.inStock ?? true);
  const stockCount = propStockCount !== undefined ? propStockCount : (presentation?.availability?.stock);

  let state = "in";
  if (!inStock) state = "out";
  else if (backorder) state = "backorder";
  else if (Number.isFinite(stockCount) && stockCount <= lowStockThreshold)
    state = "low";

  const stateLabel = {
    in: "In stock",
    low: "Low stock",
    out: "Out of stock",
    backorder: "Backorder",
  }[state];

  const extraText =
    state === "low" && Number.isFinite(stockCount)
      ? ` — ${stockCount} left`
      : "";

  return (
    <div
      className={`stock-indicator stock-indicator--${state} ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="stock-indicator__dot" aria-hidden="true" />
      <span className="stock-indicator__text">
        {stateLabel}
        {extraText}
      </span>
    </div>
  );
};

StockIndicator.propTypes = {
  inStock: PropTypes.bool,
  stockCount: PropTypes.number,
  backorder: PropTypes.bool,
  lowStockThreshold: PropTypes.number,
  className: PropTypes.string,
};

StockIndicator.defaultProps = {
  inStock: true,
  stockCount: undefined,
  backorder: false,
  lowStockThreshold: 5,
  className: "",
};

export default StockIndicator;

import React from "react";
import PropTypes from "prop-types";
import VariantSelector from "./VariantSelector";
import { CURRENCY } from "@/constants/currency";
import "./ProductInfo.css";

const ProductInfo = ({
  displayCategory,
  product,
  colorOptions,
  sizeOptions,
  selectedColor,
  onColorChange,
  selectedSize,
  onSizeChange,
  sizeError,
  payPrice,
  oldPrice,
  discountPercent,
}) => {
  const showColorSelector = product?.variants?.length > 0 && colorOptions.length > 0;
  const showSizeSelector = product?.variants?.some(v => v.size) && sizeOptions.length > 0;

  return (
    <div className="pi-root">
      <span className="pd-category">{displayCategory.replace(/-/g, " ").toUpperCase()}</span>
      <h1 className="pd-title">{product.name}</h1>

      <div className="pd-price-block">
        <span className="pd-price">{CURRENCY.symbol}{payPrice}.00</span>
        {discountPercent > 0 && oldPrice && (
          <>
            <span className="pd-old-price">{CURRENCY.symbol}{oldPrice}.00</span>
            <span className="pd-discount">-{discountPercent}%</span>
          </>
        )}
      </div>

      <div className="pi-variants">
        {showColorSelector && (
          <VariantSelector
            name="color"
            label="Color"
            type="color"
            options={colorOptions}
            selectedValue={selectedColor}
            onChange={onColorChange}
          />
        )}

        {showSizeSelector && (
          <VariantSelector
            name="size"
            label="Size"
            type="size"
            options={sizeOptions}
            selectedValue={selectedSize}
            required
            error={sizeError}
            onChange={onSizeChange}
          />
        )}
      </div>
    </div>
  );
};

ProductInfo.propTypes = {
  displayCategory: PropTypes.string,
  product: PropTypes.object.isRequired,
  colorOptions: PropTypes.array,
  sizeOptions: PropTypes.array,
  selectedColor: PropTypes.string,
  onColorChange: PropTypes.func,
  selectedSize: PropTypes.string,
  onSizeChange: PropTypes.func,
  sizeError: PropTypes.string,
  payPrice: PropTypes.number.isRequired,
  oldPrice: PropTypes.number,
  discountPercent: PropTypes.number,
};

ProductInfo.defaultProps = {
  displayCategory: "",
  colorOptions: [],
  sizeOptions: [],
  onColorChange: () => {},
  onSizeChange: () => {},
};

export default ProductInfo;

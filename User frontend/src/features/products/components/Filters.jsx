import { useState, useMemo } from "react";
import { RotateCcw, Check } from "lucide-react";
import { CURRENCY } from "@/constants/currency";
import "@/styles/Filters.css";

const colorMap = {
  black: "#1a1a1a",
  navy: "#0d1b2a",
  blue: "#2b6cb0",
  red: "#c53030",
  green: "#2f855a",
  white: "#ffffff",
  grey: "#718096",
  gray: "#718096",
  yellow: "#ecc94b",
  pink: "#ed64a6",
  beige: "#f5f5dc",
  brown: "#975a16",
  gold: "#d4af37",
  silver: "#c0c0c0",
};

const Filters = ({ filters = {}, onChange }) => {
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const hasActiveFilters = useMemo(() => {
    return (
      selectedBrands.length > 0 ||
      selectedColors.length > 0 ||
      selectedSizes.length > 0 ||
      selectedTags.length > 0 ||
      priceMin !== "" ||
      priceMax !== ""
    );
  }, [selectedBrands, selectedColors, selectedSizes, selectedTags, priceMin, priceMax]);

  const handleReset = () => {
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedTags([]);
    setPriceMin("");
    setPriceMax("");
    onChange &&
      onChange({
        brands: [],
        colors: [],
        sizes: [],
        tags: [],
        priceMin: "",
        priceMax: "",
      });
  };

  const handleCheckboxChange = (type, value) => {
    let current, setter;
    switch (type) {
      case "brand":
        current = selectedBrands;
        setter = setSelectedBrands;
        break;
      case "color":
        current = selectedColors;
        setter = setSelectedColors;
        break;
      case "size":
        current = selectedSizes;
        setter = setSelectedSizes;
        break;
      case "tag":
        current = selectedTags;
        setter = setSelectedTags;
        break;
      default:
        return;
    }

    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    setter(next);

    onChange &&
      onChange({
        brands: type === "brand" ? next : selectedBrands,
        colors: type === "color" ? next : selectedColors,
        sizes: type === "size" ? next : selectedSizes,
        tags: type === "tag" ? next : selectedTags,
        priceMin,
        priceMax,
      });
  };

  const handlePriceChange = (e) => {
    e.preventDefault();
    onChange &&
      onChange({
        brands: selectedBrands,
        colors: selectedColors,
        sizes: selectedSizes,
        tags: selectedTags,
        priceMin,
        priceMax,
      });
  };

  return (
    <aside className="loft-filter-sidebar">
      <div className="loft-filter-header">
        <h3 className="loft-filter-title">Filters</h3>
        {hasActiveFilters && (
          <button onClick={handleReset} className="loft-filter-reset-btn" aria-label="Reset all filters">
            <RotateCcw size={13} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Brands (Custom Minimalist Checkboxes) */}
      {filters.brands && filters.brands.length > 0 && (
        <div className="loft-filter-section">
          <h4 className="loft-filter-section-title">Brand</h4>
          <div className="loft-filter-options brand-list">
            {filters.brands.map((brand) => {
              const isChecked = selectedBrands.includes(brand);
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => handleCheckboxChange("brand", brand)}
                  className={`loft-brand-option ${isChecked ? "active" : ""}`}
                >
                  <span className={`loft-custom-checkbox ${isChecked ? "checked" : ""}`}>
                    {isChecked && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="loft-brand-label">{brand}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Colors (Circular Visual Swatches) */}
      {filters.colors && filters.colors.length > 0 && (
        <div className="loft-filter-section">
          <h4 className="loft-filter-section-title">Color</h4>
          <div className="loft-filter-options color-grid">
            {filters.colors.map((color) => {
              const isChecked = selectedColors.includes(color);
              const swatchColor = colorMap[color.toLowerCase()] || "#cccccc";
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleCheckboxChange("color", color)}
                  className={`loft-color-swatch-wrapper ${isChecked ? "active" : ""}`}
                  title={color}
                >
                  <span
                    className="loft-color-swatch"
                    style={{
                      backgroundColor: swatchColor,
                      border: swatchColor.toLowerCase() === "#ffffff" ? "1px solid #ddd" : "none",
                    }}
                  >
                    {isChecked && (
                      <Check
                        size={12}
                        strokeWidth={3}
                        color={swatchColor.toLowerCase() === "#ffffff" ? "#000000" : "#ffffff"}
                      />
                    )}
                  </span>
                  <span className="loft-color-label">{color}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sizes (Modern Pill Button Grid) */}
      {filters.sizes && filters.sizes.length > 0 && (
        <div className="loft-filter-section">
          <h4 className="loft-filter-section-title">Size</h4>
          <div className="loft-filter-options size-grid">
            {filters.sizes.map((size) => {
              const isChecked = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleCheckboxChange("size", size)}
                  className={`loft-size-pill ${isChecked ? "active" : ""}`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags (Minimal Badge List) */}
      {filters.tags && filters.tags.length > 0 && (
        <div className="loft-filter-section">
          <h4 className="loft-filter-section-title">Tags</h4>
          <div className="loft-filter-options tag-list">
            {filters.tags.map((tag) => {
              const isChecked = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleCheckboxChange("tag", tag)}
                  className={`loft-tag-badge ${isChecked ? "active" : ""}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range (Sleek Input Fields & Button) */}
      <div className="loft-filter-section">
        <h4 className="loft-filter-section-title">Price Range</h4>
        <form className="loft-price-form" onSubmit={handlePriceChange}>
          <div className="loft-price-inputs">
            <div className="loft-price-input-wrapper">
              <span className="loft-price-currency">{CURRENCY.symbol}</span>
              <input
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="loft-price-input"
              />
            </div>
            <span className="loft-price-range-divider">to</span>
            <div className="loft-price-input-wrapper">
              <span className="loft-price-currency">{CURRENCY.symbol}</span>
              <input
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="loft-price-input"
              />
            </div>
          </div>
          <button type="submit" className="loft-price-btn">
            Apply
          </button>
        </form>
      </div>
    </aside>
  );
};

export default Filters;

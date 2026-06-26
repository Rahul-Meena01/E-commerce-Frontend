import { useState, useMemo, useEffect, startTransition, memo } from "react";
import { RotateCcw, Check, X } from "lucide-react";
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

const Filters = ({
  filters = {},
  onChange,

  initialBrands = [],
  initialColors = [],
  initialSizes = [],
  initialTags = [],
  initialPriceMin = "",
  initialPriceMax = "",
  initialRating = "",
  initialStock = "all",
  initialSort = "newest",
  resultsCount,
}) => {
  const [selectedBrands, setSelectedBrands] = useState(initialBrands);
  const [selectedColors, setSelectedColors] = useState(initialColors);
  const [selectedSizes, setSelectedSizes] = useState(initialSizes);
  const [selectedTags, setSelectedTags] = useState(initialTags);
  const [priceMin, setPriceMin] = useState(initialPriceMin);
  const [priceMax, setPriceMax] = useState(initialPriceMax);
  const [rating, setRating] = useState(initialRating);
  const [stock, setStock] = useState(initialStock);
  const [sort, setSort] = useState(initialSort);

  useEffect(() => {
    startTransition(() => {
      setSelectedBrands(initialBrands || []);
      setSelectedColors(initialColors || []);
      setSelectedSizes(initialSizes || []);
      setSelectedTags(initialTags || []);
      setPriceMin(initialPriceMin || "");
      setPriceMax(initialPriceMax || "");
      setRating(initialRating || "");
      setStock(initialStock || "all");
      setSort(initialSort || "newest");
    });
  }, [
    initialBrands,
    initialColors,
    initialSizes,
    initialTags,
    initialPriceMin,
    initialPriceMax,
    initialRating,
    initialStock,
    initialSort,
  ]);

  const hasActiveFilters = useMemo(() => {
    return (
      selectedBrands.length > 0 ||
      selectedColors.length > 0 ||
      selectedSizes.length > 0 ||
      selectedTags.length > 0 ||
      priceMin !== "" ||
      priceMax !== "" ||
      rating !== "" ||
      stock !== "all"
    );
  }, [
    selectedBrands,
    selectedColors,
    selectedSizes,
    selectedTags,
    priceMin,
    priceMax,
    rating,
    stock,
  ]);

  const emitFilters = ({
    brands = selectedBrands,
    colors = selectedColors,
    sizes = selectedSizes,
    tags = selectedTags,
    min = priceMin,
    max = priceMax,
    r = rating,
    st = stock,
    so = sort,
  } = {}) => {
    onChange?.({
      brands,
      colors,
      sizes,
      tags,
      priceMin: min,
      priceMax: max,
      rating: r,
      stock: st,
      sort: so,
    });
  };

  const handleReset = () => {
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedTags([]);
    setPriceMin("");
    setPriceMax("");
    setRating("");
    setStock("all");

    emitFilters({
      brands: [],
      colors: [],
      sizes: [],
      tags: [],
      min: "",
      max: "",
      r: "",
      st: "all",
      so: sort,
    });
  };

  const handleCheckboxChange = (type, value) => {
    let current;
    let setter;

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

    emitFilters({
      brands: type === "brand" ? next : selectedBrands,
      colors: type === "color" ? next : selectedColors,
      sizes: type === "size" ? next : selectedSizes,
      tags: type === "tag" ? next : selectedTags,
    });
  };

  const handlePriceSubmit = (e) => {
    e.preventDefault();

    emitFilters({
      min: priceMin,
      max: priceMax,
    });
  };

  return (
    <aside className="loft-filter-sidebar">
      <div className="loft-filter-header">
        <h3 className="loft-filter-title">Filters</h3>

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="loft-filter-reset-btn"
            aria-label="Reset all filters"
          >
            <RotateCcw size={13} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {resultsCount !== undefined && (
        <div className="loft-filter-results-count">
          {resultsCount} {resultsCount === 1 ? "result" : "results"}
        </div>
      )}

      {hasActiveFilters && (
        <div className="loft-filter-active-pills">
          {selectedBrands.map((b) => (
            <button
              key={`brand-${b}`}
              className="loft-filter-pill"
              onClick={() => handleCheckboxChange("brand", b)}
              aria-label={`Remove ${b} brand filter`}
            >
              {b} <X size={12} />
            </button>
          ))}
          {selectedColors.map((c) => (
            <button
              key={`color-${c}`}
              className="loft-filter-pill"
              onClick={() => handleCheckboxChange("color", c)}
              aria-label={`Remove ${c} color filter`}
            >
              {c} <X size={12} />
            </button>
          ))}
          {selectedSizes.map((s) => (
            <button
              key={`size-${s}`}
              className="loft-filter-pill"
              onClick={() => handleCheckboxChange("size", s)}
              aria-label={`Remove ${s} size filter`}
            >
              {s} <X size={12} />
            </button>
          ))}
          {selectedTags.map((t) => (
            <button
              key={`tag-${t}`}
              className="loft-filter-pill"
              onClick={() => handleCheckboxChange("tag", t)}
              aria-label={`Remove ${t} tag filter`}
            >
              {t} <X size={12} />
            </button>
          ))}
          {(priceMin || priceMax) && (
            <button
              className="loft-filter-pill"
              onClick={() => {
                setPriceMin("");
                setPriceMax("");
                emitFilters({ min: "", max: "" });
              }}
              aria-label="Remove price filter"
            >
              {CURRENCY.symbol}{priceMin || "0"}&ndash;{CURRENCY.symbol}{priceMax || "∞"}
              <X size={12} />
            </button>
          )}
          {rating && (
            <button
              className="loft-filter-pill"
              onClick={() => {
                setRating("");
                emitFilters({ r: "" });
              }}
              aria-label="Remove rating filter"
            >
              {rating}★ & above <X size={12} />
            </button>
          )}
          {stock !== "all" && (
            <button
              className="loft-filter-pill"
              onClick={() => {
                setStock("all");
                emitFilters({ st: "all" });
              }}
              aria-label="Remove availability filter"
            >
              {stock === "in" ? "In Stock" : "Out of Stock"} <X size={12} />
            </button>
          )}
        </div>
      )}

      {filters.brands?.length > 0 && (
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
                  <span
                    className={`loft-custom-checkbox ${
                      isChecked ? "checked" : ""
                    }`}
                  >
                    {isChecked && <Check size={12} strokeWidth={3} />}
                  </span>

                  <span className="loft-brand-label">{brand}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filters.colors?.length > 0 && (
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
                  className={`loft-color-swatch-wrapper ${
                    isChecked ? "active" : ""
                  }`}
                  title={color}
                >
                  <span
                    className="loft-color-swatch"
                    style={{
                      backgroundColor: swatchColor,
                      border:
                        swatchColor.toLowerCase() === "#ffffff"
                          ? "1px solid #ddd"
                          : "none",
                    }}
                  >
                    {isChecked && (
                      <Check
                        size={12}
                        strokeWidth={3}
                        color={
                          swatchColor.toLowerCase() === "#ffffff"
                            ? "#000"
                            : "#fff"
                        }
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

      {filters.sizes?.length > 0 && (
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

      {filters.tags?.length > 0 && (
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

      <div className="loft-filter-section">
        <h4 className="loft-filter-section-title">Sort By</h4>
        <div className="loft-filter-options">
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => {
              const nextSort = e.target.value;
              setSort(nextSort);
              emitFilters({ so: nextSort });
            }}
            className="loft-price-input"
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
          >
            <option value="newest">Newest Arrivals</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Customer Rating</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
      </div>

      <div className="loft-filter-section">
        <h4 className="loft-filter-section-title">Availability</h4>
        <div className="loft-filter-options" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: "All Products", value: "all" },
            { label: "In Stock", value: "in" },
            { label: "Out of Stock", value: "out" },
          ].map((item) => (
            <label
              key={item.value}
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}
            >
              <input
                type="radio"
                name="stock-availability"
                value={item.value}
                checked={stock === item.value}
                onChange={() => {
                  setStock(item.value);
                  emitFilters({ st: item.value });
                }}
                style={{ cursor: "pointer" }}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="loft-filter-section">
        <h4 className="loft-filter-section-title">Customer Rating</h4>
        <div className="loft-filter-options" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: "All Ratings", value: "" },
            { label: "4 Stars & Above", value: "4" },
            { label: "3 Stars & Above", value: "3" },
            { label: "2 Stars & Above", value: "2" },
          ].map((item) => (
            <label
              key={item.value}
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}
            >
              <input
                type="radio"
                name="customer-rating"
                value={item.value}
                checked={rating === item.value}
                onChange={() => {
                  setRating(item.value);
                  emitFilters({ r: item.value });
                }}
                style={{ cursor: "pointer" }}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="loft-filter-section">
        <h4 className="loft-filter-section-title">Price Range</h4>

        <form className="loft-price-form" onSubmit={handlePriceSubmit}>
          <div className="loft-price-inputs">
            <div className="loft-price-input-wrapper">
              <span className="loft-price-currency">{CURRENCY.symbol}</span>

              <input
                id="price-min"
                name="priceMin"
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
                id="price-max"
                name="priceMax"
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

export default memo(Filters);

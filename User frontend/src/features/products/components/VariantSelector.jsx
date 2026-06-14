import { useEffect, useMemo, useRef, useState } from "react";
import { Ruler } from "lucide-react";
import "./VariantSelector.css";

const findFirstEnabledIndex = (options) =>
  options.findIndex((option) => !option.disabled);

const nextEnabledIndex = (options, currentIndex, direction) => {
  if (!options.length) return -1;
  for (let i = 1; i <= options.length; i += 1) {
    const candidate =
      (currentIndex + direction * i + options.length) % options.length;
    const option = options[candidate];
    if (option && !option.disabled) return candidate;
  }
  return currentIndex;
};

const VariantSelector = ({
  name,
  label,
  type = "text",
  options = [],
  selectedValue,
  onChange,
  error,
  helperText,
  disabled = false,
  announcementPrefix,
  onSizeGuideClick,
}) => {
  const buttonRefs = useRef([]);
  const [liveMessage, setLiveMessage] = useState("");

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === selectedValue),
    [options, selectedValue],
  );

  // Active index for keyboard focus
  const activeIndex =
    selectedIndex >= 0 ? selectedIndex : findFirstEnabledIndex(options);
  const selectorId = `variant-selector-${name}`;
  const helpId = `${selectorId}-help`;
  const errorId = `${selectorId}-error`;

  useEffect(() => {
    const selectedOption = options[selectedIndex];
    if (!selectedOption) return;
    const prefix = announcementPrefix || `${label} selected`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveMessage(
      `${prefix}: ${selectedOption.label || selectedOption.value}`,
    );
  }, [announcementPrefix, label, options, selectedIndex]);

  const handleSelect = (option) => {
    // Block action if base component is disabled, or option is explicitly disabled / out of stock
    if (!option || option.disabled || option.outOfStock || disabled) return;
    onChange(option.value, option);
  };

  const handleKeyDown = (event, index) => {
    if (disabled) return;
    const key = event.key;
    if (
      ![
        "ArrowRight",
        "ArrowDown",
        "ArrowLeft",
        "ArrowUp",
        "Home",
        "End",
        " ",
        "Enter",
      ].includes(key)
    ) {
      return;
    }

    event.preventDefault();

    if (key === " " || key === "Enter") {
      handleSelect(options[index]);
      return;
    }

    if (key === "Home") {
      const firstIndex = findFirstEnabledIndex(options);
      if (firstIndex >= 0) {
        buttonRefs.current[firstIndex]?.focus();
        handleSelect(options[firstIndex]);
      }
      return;
    }

    if (key === "End") {
      const reversed = [...options].reverse();
      const reverseIndex = findFirstEnabledIndex(reversed);
      if (reverseIndex >= 0) {
        const finalIndex = options.length - 1 - reverseIndex;
        buttonRefs.current[finalIndex]?.focus();
        handleSelect(options[finalIndex]);
      }
      return;
    }

    const direction = key === "ArrowRight" || key === "ArrowDown" ? 1 : -1;
    const nextIndex = nextEnabledIndex(options, index, direction);
    if (nextIndex >= 0) {
      buttonRefs.current[nextIndex]?.focus();
      handleSelect(options[nextIndex]);
    }
  };

  const renderContent = (option) => {
    if (type === "color") {
      return (
        <span
          className="vs-swatch"
          style={{ backgroundColor: option.swatch || "#d5d5d5" }}
          aria-hidden="true"
        />
      );
    }

    if (type === "image") {
      return (
        <>
          <span className="vs-image-wrap" aria-hidden="true">
            <img src={option.image} alt="" className="vs-image" />
          </span>
          <span className="vs-label">{option.label}</span>
        </>
      );
    }

    return <span className="vs-label">{option.label}</span>;
  };

  return (
    <div className={`vs-root vs-root--${name} ${error ? "vs-root--error" : ""}`}>
      <div className="vs-header">
        <span className="vs-title" id={selectorId}>
          {label}: <span className="vs-current-val">{selectedIndex >= 0 ? options[selectedIndex]?.label : "Select size"}</span>
        </span>
        {name === "size" && (
          <button type="button" className="vs-size-guide-btn" onClick={onSizeGuideClick}>
            <Ruler size={14} className="vs-size-guide-icon" /> Size Guide
          </button>
        )}
      </div>

      <div
        className={`vs-options vs-options--${type}`}
        role="radiogroup"
        aria-labelledby={selectorId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helpId : undefined}
      >
        {options.map((option, index) => {
          const isSelected = option.value === selectedValue;
          const isSelectionDisabled = disabled || option.disabled;
          const isOutOfStock = option.outOfStock;
          const isVisuallyDisabled = isSelectionDisabled || isOutOfStock;

          return (
            <button
              key={`${name}-${option.value}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={
                isOutOfStock
                  ? `${option.label}, out of stock`
                  : option.label
              }
              aria-disabled={isOutOfStock ? "true" : undefined}
              tabIndex={
                index === activeIndex || (activeIndex === -1 && index === 0)
                  ? 0
                  : -1
              }
              className={`vs-option ${isSelected ? "vs-option--selected" : ""} ${isVisuallyDisabled ? "vs-option--disabled" : ""}`}
              disabled={isSelectionDisabled}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              onClick={() => handleSelect(option)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {renderContent(option)}
              {option.outOfStock ? <span className="vs-badge">Out</span> : null}
            </button>
          );
        })}
      </div>

      {helperText && !error ? (
        <p className="vs-helper" id={helpId}>
          {helperText}
        </p>
      ) : null}

      {error ? (
        <p className="vs-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}

      <p className="vs-live" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </p>
    </div>
  );
};

export default VariantSelector;

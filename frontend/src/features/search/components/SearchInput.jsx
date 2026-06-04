import { Search, X } from "lucide-react";

export default function SearchInput({
  value,
  onChange,
  onClear,
  onClose,
  onKeyDown,
  inputRef,
  ariaControls,
  ariaActiveDescendant,
  ariaExpanded,
}) {
  const showClear = Boolean(value?.trim());

  return (
    <div className="search-input" role="search">
      <div className="search-input__icon" aria-hidden="true">
        <Search size={18} strokeWidth={2} />
      </div>

      <input
        ref={inputRef}
        className="search-input__field"
        type="search"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="Search products, brands, or categories"
        aria-label="Search products, brands, or categories"
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-activedescendant={ariaActiveDescendant}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck="false"
      />

      <button
        type="button"
        className="search-input__action"
        onClick={showClear ? onClear : onClose}
        aria-label={showClear ? "Clear search text" : "Close search"}
      >
        <X size={18} strokeWidth={2} />
      </button>
    </div>
  );
}

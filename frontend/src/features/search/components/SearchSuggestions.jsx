export default function SearchSuggestions({
  query,
  items,
  isLoading,
  isEmpty,
  hasMinimumCharacters,
  activeIndex,
  onHoverItem,
  onSelectItem,
  listboxId,
}) {
  const renderContent = () => {
    if (!hasMinimumCharacters) {
      return (
        <p className="search-suggestions__empty">
          Type at least 2 characters to see suggestions.
        </p>
      );
    }

    if (isLoading) {
      return (
        <div className="search-suggestions__loading" aria-hidden="true">
          <div className="search-suggestions__skeleton" />
          <div className="search-suggestions__skeleton" />
          <div className="search-suggestions__skeleton" />
          <div className="search-suggestions__skeleton" />
        </div>
      );
    }

    if (isEmpty) {
      return (
        <p className="search-suggestions__empty">
          No suggestions found for “{query}”. Try a broader brand, product, or
          category.
        </p>
      );
    }

    return (
      <div
        className="search-suggestions__list"
        id={listboxId}
        role="listbox"
        aria-label="Search suggestions"
      >
        {items.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={item.id}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={isActive}
              className={`search-suggestion ${isActive ? "is-active" : ""}`}
              onMouseEnter={() => onHoverItem(index)}
              onFocus={() => onHoverItem(index)}
              onClick={() => onSelectItem(item)}
            >
              <span className="search-suggestion__group">{item.group}</span>
              <span className="search-suggestion__body">
                <span className="search-suggestion__label">{item.label}</span>
                {item.meta ? (
                  <span className="search-suggestion__meta">{item.meta}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <section
      className="search-panel search-panel--suggestions"
      aria-label="Search suggestions"
    >
      <div className="search-panel__header">
        <div>
          <p className="search-panel__eyebrow">Suggestions</p>
          <h3 className="search-panel__title">Typeahead Suggestions</h3>
        </div>
        <div className="search-panel__status" aria-live="polite">
          {isLoading
            ? "Searching..."
            : hasMinimumCharacters
              ? `${items.length} suggestion${items.length === 1 ? "" : "s"}`
              : "Ready"}
        </div>
      </div>

      {renderContent()}
    </section>
  );
}

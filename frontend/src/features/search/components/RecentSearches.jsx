export default function RecentSearches({ items, onSelect, onClear }) {
  return (
    <section
      className="search-panel search-panel--recent"
      aria-label="Recent searches"
    >
      <div className="search-panel__header">
        <div>
          <p className="search-panel__eyebrow">History</p>
          <h3 className="search-panel__title">Recent Searches</h3>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            className="search-panel__action"
            onClick={onClear}
          >
            Clear history
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="search-chip-list" role="list">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              className="search-chip"
              onClick={() => onSelect(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : (
        <p className="search-panel__empty">
          Your recent searches will appear here.
        </p>
      )}
    </section>
  );
}

import { siteContent } from "@/config/siteContent";

export default function PopularSearches({
  items = siteContent.popularSearches || [],
  onSelect,
}) {
  return (
    <section
      className="search-panel search-panel--popular"
      aria-label="Popular searches"
    >
      <div className="search-panel__header">
        <div>
          <p className="search-panel__eyebrow">Explore</p>
          <h3 className="search-panel__title">Popular Searches</h3>
        </div>
      </div>

      <div className="search-chip-list" role="list">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className="search-chip search-chip--popular"
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

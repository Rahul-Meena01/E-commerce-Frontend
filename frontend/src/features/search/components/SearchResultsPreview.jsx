import SearchResultProductCard from "./SearchResultProductCard";
import { useProductSearchQuery } from "../../products/hooks/useProductSearchQuery";

export default function SearchResultsPreview({ query, onSelect }) {
  const { data, isLoading, isError } = useProductSearchQuery(query);
  const products = data?.products || data?.data || data?.items || [];

  if (!query) return null;

  return (
    <section
      className="search-panel search-panel--results"
      aria-label="Search results preview"
    >
      <div className="search-panel__header">
        <div>
          <p className="search-panel__eyebrow">Preview</p>
          <h3 className="search-panel__title">Results preview</h3>
        </div>
        <div className="search-panel__status" aria-live="polite">
          {isLoading
            ? "Searching..."
            : `${products.length} result${products.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {isLoading ? (
        <div className="search-results__loading">
          <div className="search-results__skeleton" />
          <div className="search-results__skeleton" />
          <div className="search-results__skeleton" />
        </div>
      ) : isError ? (
        <p className="search-panel__empty">Unable to load results.</p>
      ) : products.length === 0 ? (
        <p className="search-panel__empty">No products match “{query}”.</p>
      ) : (
        <div className="search-results__grid" role="list">
          {products.map((p) => (
            <div role="listitem" key={p._id} className="search-results__item">
              <SearchResultProductCard product={p} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

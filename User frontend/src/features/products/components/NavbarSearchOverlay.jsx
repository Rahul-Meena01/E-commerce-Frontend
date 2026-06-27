import { X } from "lucide-react";
import OptimizedImage from "@/shared/components/ui/OptimizedImage";
import { formatPrice } from "@/utils/pricing";

export default function NavbarSearchOverlay({
  searchOpen,
  searchQuery,
  setSearchQuery,
  closeSearch,
  searchInputRef,
  searchOverlayRef,
  searchResults,
  handleResultClick,
}) {
  return (
    <div
      ref={searchOverlayRef}
      id="search-overlay"
      className={`search-overlay ${searchOpen ? "open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!searchOpen}
      aria-label="Product Search"
    >
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search curated thrift finds..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="Search curated thrift finds"
        onKeyDown={(e) => e.key === "Escape" && closeSearch()}
      />
      <button
        className="search-close"
        onClick={closeSearch}
        aria-label="Close search"
      >
        <X size={20} strokeWidth={2} />
      </button>

      {searchOpen && searchQuery.trim() && (
        <div className="search-results">
          {searchResults.length > 0 ? (
            searchResults.map((product) => {
              const primaryImage =
                product.image ||
                product.image1 ||
                product.image2 ||
                product.image3 ||
                product.image4 ||
                product.images?.[0] ||
                "";

              return (
                <button
                  key={product.productId}
                  className="search-result-item"
                  onClick={() => handleResultClick(product.productId)}
                >
                  <OptimizedImage
                    src={primaryImage}
                    alt={product.name}
                    className="search-result-image"
                  />
                <div className="search-result-info">
                  <span className="search-result-name">{product.name}</span>
                  <span className="search-result-meta">
                    {product.brand} · {formatPrice(product.price)}
                  </span>
                </div>
                <span className="search-result-category">
                  {product.category}
                </span>
              </button>
              )
            })
          ) : (
            <div className="search-no-results">
              No products found for "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

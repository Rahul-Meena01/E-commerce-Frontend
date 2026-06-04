import { useEffect, useMemo, useRef } from "react";
import SearchInput from "./SearchInput";
import RecentSearches from "./RecentSearches";
import PopularSearches from "./PopularSearches";
import SearchDiscovery from "./SearchDiscovery";
import SearchResultsPreview from "./SearchResultsPreview";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { useSearchSuggestions } from "../hooks/useSearchSuggestions";
import { useSearchKeyboardNavigation } from "../hooks/useSearchKeyboardNavigation";
import SearchSuggestions from "./SearchSuggestions";
import "../styles/SearchOverlay.css";

export default function SearchOverlay({
  searchOpen,
  searchQuery,
  setSearchQuery,
  closeSearch,
  navigate,
}) {
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const suggestionsListId = "search-suggestions-listbox";
  const { recentSearches, addSearchTerm, clearSearchHistory } =
    useSearchHistory();

  const trimmedQuery = searchQuery.trim();
  const suggestionState = useSearchSuggestions(trimmedQuery);

  const handleSelectSuggestion = (suggestionOrTerm) => {
    if (suggestionOrTerm && typeof suggestionOrTerm === "object") {
      if (suggestionOrTerm.group === "Product" && suggestionOrTerm.productId) {
        closeSearch();
        navigate(`/product/${suggestionOrTerm.productId}`);
        return;
      }
    }

    const nextTerm =
      typeof suggestionOrTerm === "string"
        ? suggestionOrTerm
        : suggestionOrTerm?.query || suggestionOrTerm?.label || "";

    const normalizedTerm = nextTerm.trim();
    if (!normalizedTerm) return;

    setSearchQuery(normalizedTerm);
    addSearchTerm(normalizedTerm);
    inputRef.current?.focus();
  };

  const keyboardNavigation = useSearchKeyboardNavigation({
    items: suggestionState.items,
    onSelect: handleSelectSuggestion,
    onClose: closeSearch,
    fallbackValue: trimmedQuery,
  });

  const isOpen = Boolean(searchOpen);

  const contentLabel = useMemo(
    () =>
      trimmedQuery
        ? "Use arrows to review suggestions"
        : "Start typing to search",
    [trimmedQuery],
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusables = panel.querySelectorAll(
        'input, button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        last.focus();
        event.preventDefault();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeSearch, isOpen]);

  const handleClose = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    closeSearch();
  };

  const handleChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleClear = () => {
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleSelectTerm = (term) => {
    const normalizedTerm = term.trim();
    if (!normalizedTerm) return;

    setSearchQuery(normalizedTerm);
    addSearchTerm(normalizedTerm);
    inputRef.current?.focus();
  };

  const handleViewAll = () => {
    closeSearch();
    navigate("/shop");
  };

  return (
    <div
      id="search-overlay"
      className={`search-overlay-shell ${isOpen ? "open" : ""}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className="search-overlay-shell__backdrop"
        aria-label="Close search"
        onClick={handleClose}
        tabIndex={-1}
      />

      <section
        ref={panelRef}
        className="search-overlay-shell__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Product search"
      >
        <div className="search-overlay-shell__header">
          <div className="search-overlay-shell__eyebrow">Search</div>
          <button
            type="button"
            className="search-overlay-shell__close"
            onClick={handleClose}
            aria-label="Close search"
          >
            <span aria-hidden="true">Esc</span>
          </button>
        </div>

        <SearchInput
          value={searchQuery}
          onChange={handleChange}
          onClear={handleClear}
          onClose={handleClose}
          onKeyDown={keyboardNavigation.handleKeyDown}
          inputRef={inputRef}
          ariaControls={trimmedQuery ? suggestionsListId : undefined}
          ariaActiveDescendant={keyboardNavigation.activeId}
          ariaExpanded={searchOpen}
        />

        <div className="search-overlay-shell__body">
          {!trimmedQuery ? <SearchDiscovery onSelect={handleClose} /> : null}

          {trimmedQuery ? (
            <div className="search-results-layout">
              <div className="search-results-layout__left">
                <SearchSuggestions
                  query={trimmedQuery}
                  items={suggestionState.items}
                  isLoading={suggestionState.isLoading}
                  isEmpty={suggestionState.isEmpty}
                  hasMinimumCharacters={suggestionState.hasMinimumCharacters}
                  activeIndex={keyboardNavigation.activeIndex}
                  onHoverItem={keyboardNavigation.setHoverIndex}
                  onSelectItem={handleSelectSuggestion}
                  listboxId={suggestionsListId}
                />

                <PopularSearches onSelect={handleSelectTerm} />
              </div>

              <div className="search-results-layout__right">
                <SearchResultsPreview
                  query={trimmedQuery}
                  onSelect={handleClose}
                />
              </div>
            </div>
          ) : (
            <div className="search-overlay-shell__sticky-group">
              <RecentSearches
                items={recentSearches}
                onSelect={handleSelectTerm}
                onClear={clearSearchHistory}
              />

              <PopularSearches onSelect={handleSelectTerm} />
            </div>
          )}

          <div className="search-overlay-shell__state" aria-live="polite">
            {contentLabel}
          </div>

          <button
            type="button"
            className="search-overlay-shell__cta"
            onClick={handleViewAll}
          >
            Browse the shop
          </button>
        </div>
      </section>
    </div>
  );
}

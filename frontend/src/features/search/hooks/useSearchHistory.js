import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "loft.search-history";
const MAX_ITEMS = 6;

function readStoredHistory() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeStoredHistory(items) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage failures in private mode or disabled storage environments.
  }
}

export function useSearchHistory() {
  const [recentSearches, setRecentSearches] = useState(() =>
    readStoredHistory(),
  );

  useEffect(() => {
    writeStoredHistory(recentSearches);
  }, [recentSearches]);

  const addSearchTerm = useCallback((term) => {
    const normalized = term?.trim();
    if (!normalized) return;

    setRecentSearches((current) => {
      const next = [
        normalized,
        ...current.filter((item) => item !== normalized),
      ];
      return next.slice(0, MAX_ITEMS);
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setRecentSearches([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return {
    recentSearches,
    addSearchTerm,
    clearSearchHistory,
  };
}

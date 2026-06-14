import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { searchProducts } from "../../products/services/products.service";
import { useDebouncedValue } from "./useDebouncedValue";

const MIN_QUERY_LENGTH = 2;
const SUGGESTION_LIMIT = 8;

const normalize = (value = "") => value.toString().trim().toLowerCase();

const getProductCategory = (product) => {
  const parentCategory = product?.subCategory?.parentCategory;
  return (
    parentCategory?.name ||
    parentCategory?.slug ||
    product?.category ||
    product?.subCategory?.name ||
    "Category"
  );
};

const createSuggestion = (fields) => ({
  ...fields,
  query: fields.query || fields.label,
});

const rankValue = (label, query) => {
  const normalizedLabel = normalize(label);
  if (!normalizedLabel || !query) return 0;
  if (normalizedLabel === query) return 4;
  if (normalizedLabel.startsWith(query)) return 3;
  if (normalizedLabel.includes(query)) return 2;
  return 1;
};

const buildSuggestions = (products, query) => {
  const productSuggestions = [];
  const brandSuggestions = new Map();
  const categorySuggestions = new Map();

  products.forEach((product) => {
    const name = product?.name?.trim();
    const brand = product?.brand?.trim();
    const category = getProductCategory(product)?.trim();

    if (name) {
      productSuggestions.push(
        createSuggestion({
          id: `product-${product.productId || product._id || name}`,
          label: name,
          group: "Product",
          meta: [brand, category].filter(Boolean).join(" · "),
          productId: product._id || product.id,
        }),
      );
    }

    if (brand && !brandSuggestions.has(brand.toLowerCase())) {
      brandSuggestions.set(
        brand.toLowerCase(),
        createSuggestion({
          id: `brand-${brand.toLowerCase()}`,
          label: brand,
          group: "Brand",
          meta: "Brand",
          query: brand,
        }),
      );
    }

    if (category && !categorySuggestions.has(category.toLowerCase())) {
      categorySuggestions.set(
        category.toLowerCase(),
        createSuggestion({
          id: `category-${category.toLowerCase()}`,
          label: category,
          group: "Category",
          meta: "Category",
          query: category,
        }),
      );
    }
  });

  const scored = [
    ...productSuggestions,
    ...brandSuggestions.values(),
    ...categorySuggestions.values(),
  ]
    .map((item) => ({
      ...item,
      score: rankValue(item.label, query),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.group !== right.group) {
        const order = { Product: 0, Brand: 1, Category: 2 };
        return order[left.group] - order[right.group];
      }
      return left.label.localeCompare(right.label);
    });

  const seen = new Set();
  const uniqueItems = [];

  scored.forEach((item) => {
    const seenKey = `${item.group}:${normalize(item.label)}`;
    if (seen.has(seenKey)) return;
    seen.add(seenKey);
    uniqueItems.push(item);
  });

  return uniqueItems.slice(0, SUGGESTION_LIMIT);
};

export function useSearchSuggestions(searchTerm) {
  const normalizedInput = normalize(searchTerm);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 220);
  const query = normalize(debouncedSearchTerm);
  const hasMinimumCharacters = normalizedInput.length >= MIN_QUERY_LENGTH;
  const isDebouncing = hasMinimumCharacters && normalizedInput !== query;

  const searchQuery = useQuery({
    queryKey: queryKeys.products.search(query),
    queryFn: async () => {
      const response = await searchProducts(query, SUGGESTION_LIMIT);
      if (!response.ok) {
        throw new Error("Failed to fetch search suggestions");
      }

      const payload = await response.json();
      // support multiple possible response shapes: array, { data: [] }, { items: [] }, { products: [] }, { data: { products: [] } }
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload.data)) return payload.data;
      if (Array.isArray(payload.items)) return payload.items;
      if (Array.isArray(payload.products)) return payload.products;
      if (payload.data && Array.isArray(payload.data.products))
        return payload.data.products;
      return [];
    },
    enabled: hasMinimumCharacters,
    staleTime: 30_000,
  });

  const items = useMemo(() => {
    if (isDebouncing || !hasMinimumCharacters) {
      return [];
    }

    return buildSuggestions(searchQuery.data || [], query);
  }, [hasMinimumCharacters, isDebouncing, query, searchQuery.data]);

  return {
    query,
    items,
    hasMinimumCharacters,
    isLoading: isDebouncing || searchQuery.isFetching,
    isError: searchQuery.isError,
    error: searchQuery.error,
    isEmpty:
      hasMinimumCharacters &&
      !isDebouncing &&
      !searchQuery.isFetching &&
      items.length === 0,
  };
}

import { useMemo } from "react";
import { useProductsQuery } from "./useProductsQuery";

/**
 * Custom hook to fetch products from the API
 * @param {Object} filters - Optional filters { categoryId, subCategoryId, search, sort, page, limit }
 * @returns {Object} { products, loading, error, refetch, pagination }
 */
export const useProducts = (filters = {}) => {
  const queryFilters = useMemo(
    () => ({
      category: filters.categoryId,
      subCategory: filters.subCategoryId,
      search: filters.search,
      sort: filters.sort,
      page: filters.page,
      limit: filters.limit,
    }),
    [
      filters.categoryId,
      filters.subCategoryId,
      filters.search,
      filters.sort,
      filters.page,
      filters.limit,
    ],
  );

  const query = useProductsQuery(queryFilters);

  return {
    products: query.data?.data || query.data?.items || (Array.isArray(query.data) ? query.data : []),
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    pagination: query.data?.pagination || null,
  };
};

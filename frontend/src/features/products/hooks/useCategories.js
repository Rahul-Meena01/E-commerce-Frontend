import { useCategoriesQuery } from "./useCategoriesQuery";

/**
 * Custom hook to fetch categories from the API
 * @returns {Object} { categories, loading, error, refetch }
 */
export const useCategories = () => {
  const query = useCategoriesQuery();

  return {
    categories: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
};

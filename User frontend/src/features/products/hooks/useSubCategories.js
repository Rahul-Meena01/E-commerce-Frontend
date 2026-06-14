import { useSubCategoriesQuery } from "./useSubCategoriesQuery";

/**
 * Custom hook to fetch subcategories from the API
 * @param {String} parentCategoryId - Optional: filter by parent category ID
 * @returns {Object} { subcategories, loading, error, refetch }
 */
export const useSubCategories = (parentCategoryId = null) => {
  const query = useSubCategoriesQuery(parentCategoryId);

  return {
    subcategories: query.subcategories,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
};

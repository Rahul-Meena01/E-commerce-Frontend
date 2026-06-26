import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { fetchSubCategories } from "../services/products.service";

export function useSubCategoriesQuery(parentCategoryId = null) {
  const query = useQuery({
    queryKey: queryKeys.subCategories.byParent(parentCategoryId || "all"),
    queryFn: async () => {
      const res = await fetchSubCategories(parentCategoryId);
      if (!res.ok) throw new Error("Failed to fetch subcategories");
      const json = await res.json();
      return json.data || json;
    },
    staleTime: 300_000,
  });

  const subcategories = useMemo(() => {
    const allItems = Array.isArray(query.data) ? query.data : [];
    if (!parentCategoryId) return allItems;
    return allItems.filter(
      (subcat) =>
        subcat.parentCategory?._id === parentCategoryId ||
        subcat.parentCategory === parentCategoryId,
    );
  }, [query.data, parentCategoryId]);

  return {
    ...query,
    subcategories,
  };
}

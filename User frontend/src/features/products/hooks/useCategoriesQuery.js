import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { fetchCategories } from "../services/products.service";

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const res = await fetchCategories();
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      return json.data || json;
    },
    staleTime: 300_000,
  });
}

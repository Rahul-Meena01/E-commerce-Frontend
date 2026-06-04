import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { searchProducts } from "../services/products.service";

export function useProductSearchQuery(searchTerm) {
  return useQuery({
    queryKey: queryKeys.products.search(searchTerm),
    queryFn: async () => {
      const res = await searchProducts(searchTerm, 6);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: Boolean(searchTerm?.trim()),
  });
}

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { fetchProducts } from "../services/products.service";

export function useProductsQuery(filters = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const res = await fetchProducts(filters);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });
}

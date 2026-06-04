import { useQuery } from "@tanstack/react-query";
import { fetchProduct } from "../services/products.service";

export function useProductQuery(productId) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) return null;
      const res = await fetchProduct(productId);
      if (!res.ok) throw new Error("Failed to fetch product details");
      const json = await res.json();
      return json?.data || null;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { fetchProfileOrders } from "../services/profile.service";

export function useProfileOrdersQuery(enabled) {
  return useQuery({
    queryKey: queryKeys.orders.all,
    queryFn: fetchProfileOrders,
    enabled,
    staleTime: 1000 * 30,
  });
}

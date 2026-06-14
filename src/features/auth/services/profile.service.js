import { apiGet } from "../../../shared/services/apiClient";

export async function fetchProfileOrders() {
  const data = await apiGet("/api/orders/myorders");
  return data?.orders || [];
}

import client from "@/services/client";

export const getOrders = () => client.get("/orders/myorders");
export const getOrderById = (id) => client.get(`/orders/${id}`);

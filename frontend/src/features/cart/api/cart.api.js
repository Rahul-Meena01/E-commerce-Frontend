import client from "@/services/client";

export const getCart = () => client.get("/cart");
export const addToCart = (data) => client.post("/cart/add", data);
export const updateCartItem = (productId, data) => client.put(`/cart/update/${productId}`, data);
export const removeCartItem = (productId) => client.delete(`/cart/remove/${productId}`);
export const clearCart = () => client.delete("/cart/clear");
export const mergeCart = (items) => client.post("/cart/merge", { items });

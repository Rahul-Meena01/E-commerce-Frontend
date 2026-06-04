import client from "@/services/client";

export const getCart = () => client.get("/cart");
export const addToCart = (data) => client.post("/cart/add", data);
export const updateCartItem = (itemId, data) => client.put(`/cart/item/${itemId}`, data);
export const removeCartItem = (itemId) => client.delete(`/cart/item/${itemId}`);
export const clearCart = () => client.delete("/cart/clear");
export const mergeCart = (items) => client.post("/cart/merge", { items });

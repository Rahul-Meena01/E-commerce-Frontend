import api from "./client";

export const getCart = () => api.get("/cart");
export const addToCart = (data) => api.post("/cart/add", data);
export const updateCartItem = (productId, data) => api.put(`/cart/update/${productId}`, data);
export const removeCartItem = (productId) => api.delete(`/cart/remove/${productId}`);
export const clearCart = () => api.delete("/cart/clear");

import api from "./client";

export const getCart = () => api.get("/cart");
export const addToCart = (data) => api.post("/cart", data);
export const updateCartItem = (id, data) => api.put(`/cart/${id}`, data);
export const removeCartItem = (id) => api.delete(`/cart/${id}`);
export const clearCart = () => api.delete("/cart");

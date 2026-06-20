import client from "@/services/client";

export const getCart = () => client.get("/cart");
export const addToCart = (data) => client.post("/cart/add", data);
export const updateCartItem = (productId, data) => client.put(`/cart/update/${productId}`, data);
export const removeCartItem = (productId) => client.delete(`/cart/remove/${productId}`);
export const clearCart = () => client.delete("/cart/clear");
export const mergeCart = (items) => client.post("/cart/merge", { items });
export const applyCoupon = (code) => client.post("/cart/apply-coupon", { code });
export const removeCoupon = () => client.delete("/cart/remove-coupon");
export const applyGiftCard = (code) => client.post("/cart/apply-giftcard", { code });
export const removeGiftCard = () => client.delete("/cart/remove-giftcard");

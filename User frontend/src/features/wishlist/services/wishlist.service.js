import authFetch from "@/shared/utils/http";

export const wishlistApi = {
  getWishlist: () => authFetch("/api/wishlist"),

  addToWishlist: (productId) =>
    authFetch("/api/wishlist/add", {
      method: "POST",
      body: { productId },
    }),

  removeFromWishlist: (productId) =>
    authFetch(`/api/wishlist/remove/${productId}`, {
      method: "DELETE",
    }),

  clearWishlist: () =>
    authFetch("/api/wishlist/clear", {
      method: "DELETE",
    }),

  mergeWishlist: (items) =>
    authFetch("/api/wishlist/merge", {
      method: "POST",
      body: { items },
    }),
};


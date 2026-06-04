import authFetch from "@/shared/utils/http";

export const wishlistApi = {
  getWishlist: () => authFetch("/api/wishlist"),

  toggleWishlist: (item) =>
    authFetch("/api/wishlist/toggle", {
      method: "POST",
      body: item,
    }),

  mergeWishlist: (items) =>
    authFetch("/api/wishlist/merge", {
      method: "POST",
      body: { items },
    }),
};

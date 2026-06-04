import client from "@/services/client";

export const fetchProducts = (params) => {
  if (typeof params === "string") {
    // If it's a full path starting with /api, strip it
    const path = params.startsWith("/api") ? params.slice(4) : params;
    return client.get(path);
  }
  return client.get("/products", { params });
};

export const fetchProductBySlug = (slug) => client.get(`/products/${slug}`);
export const fetchProduct = (productId) => client.get(`/product/public/${productId}`);
export const fetchCategories = () => client.get("/categories");
export const fetchSubCategories = (categoryId) => {
  if (categoryId && typeof categoryId === "string") {
    return client.get(`/categories/${categoryId}/subcategories`);
  }
  return client.get("/subcategories");
};
export const searchProducts = (query, limit = 6) =>
  client.get(`/products/search?q=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ""}`);

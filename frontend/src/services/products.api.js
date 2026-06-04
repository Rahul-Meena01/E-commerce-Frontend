import api from "./client";

export const getProducts = (params) => api.get("/products", { params });
export const getProductById = (id) => api.get(`/products/${id}`);
export const getCategories = () => api.get("/categories");
export const getSubCategories = (categoryId) => api.get(`/categories/${categoryId}/sub`);

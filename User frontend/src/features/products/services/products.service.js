import * as api from "../api/products.api";

const wrapAxios = async (axiosPromise) => {
  try {
    const res = await axiosPromise;
    return {
      ok: true,
      status: res.status,
      json: async () => res.data,
    };
  } catch (err) {
    return {
      ok: false,
      status: err.response?.status || 500,
      json: async () => err.response?.data || { message: err.message },
    };
  }
};

export const fetchProducts = (args) => wrapAxios(api.fetchProducts(args));

export const fetchCategories = () => wrapAxios(api.fetchCategories());

export const fetchSubCategories = (categoryId) => wrapAxios(api.fetchSubCategories(categoryId));

export const searchProducts = (query, limit = 6, options = {}) => wrapAxios(api.searchProducts(query, limit, options));

export const fetchProduct = (productId) => wrapAxios(api.fetchProduct(productId));

export const productsApi = {
  getProducts: fetchProducts,
  fetchProducts,
  fetchCategories,
  fetchSubCategories,
  searchProducts,
  fetchProduct,
};


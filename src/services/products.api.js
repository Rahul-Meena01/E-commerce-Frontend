import api from "./client";

export const getProducts = (params) => api.get("/product/public/all", { params });
export const getProductById = (id) => api.get(`/product/public/${id}`);
export const getCategories = () => api.get("/category/public/all");
export const getSubCategories = async (categoryId) => {
  const res = await api.get("/subCategory/public/all");
  return {
    ...res,
    data: {
      ...res.data,
      data: (res.data?.data || []).filter(
        sub => sub.parentCategory?._id === categoryId || sub.parentCategory === categoryId
      )
    }
  };
};

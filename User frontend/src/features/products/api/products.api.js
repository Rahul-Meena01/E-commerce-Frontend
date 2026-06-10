import client from "@/services/client";

const parseParams = (params) => {
  let category = null;
  let subCategory = null;
  let search = null;
  let limit = null;
  let page = null;

  if (typeof params === "string") {
    // It's a query string, e.g. "/products?category=men&subCategory=shirts" or "/api/products?..."
    const queryString = params.includes("?") ? params.split("?")[1] : params;
    const searchParams = new URLSearchParams(queryString);
    category = searchParams.get("category");
    subCategory = searchParams.get("subCategory");
    search = searchParams.get("search") || searchParams.get("q");
    limit = searchParams.get("limit");
    page = searchParams.get("page");
  } else if (params && typeof params === "object") {
    category = params.category || params.categoryId;
    subCategory = params.subCategory || params.subCategoryId;
    search = params.search;
    limit = params.limit;
    page = params.page;
  }

  return { category, subCategory, search, limit, page };
};

export const fetchProducts = (params) => {
  const { category, subCategory, search } = parseParams(params);
  
  // Use the provided string URL if available to preserve sort/limit params,
  // but strip the leading /api if present because client.js baseURL already has it
  let requestUrl = "/product/public/all";
  if (typeof params === "string") {
    requestUrl = params.startsWith("/api") ? params.slice(4) : params;
  }

  return client.get(requestUrl).then((res) => {
    let products = res.data?.data || [];

    // Filter by category slug or ID
    if (category) {
      const catLower = String(category).toLowerCase();
      products = products.filter((p) => {
        const parentCat = p.subCategory?.parentCategory;
        if (!parentCat) return false;
        return (
          String(parentCat._id).toLowerCase() === catLower ||
          String(parentCat.slug || "").toLowerCase() === catLower ||
          String(parentCat.name || "").toLowerCase() === catLower
        );
      });
    }

    // Filter by subcategory slug or ID
    if (subCategory) {
      const subCatLower = String(subCategory).toLowerCase();
      products = products.filter((p) => {
        const sub = p.subCategory;
        if (!sub) return false;
        return (
          String(sub._id).toLowerCase() === subCatLower ||
          String(sub.slug || "").toLowerCase() === subCatLower ||
          String(sub.name || "").toLowerCase() === subCatLower
        );
      });
    }

    // Filter by search query
    if (search) {
      const searchLower = String(search).toLowerCase();
      products = products.filter((p) => {
        return (
          String(p.name || "").toLowerCase().includes(searchLower) ||
          String(p.brand || "").toLowerCase().includes(searchLower)
        );
      });
    }

    return {
      ...res,
      data: {
        success: true,
        data: products,
        items: products,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: products.length,
        },
      },
    };
  });
};

export const fetchProductBySlug = (slug) => client.get(`/product/public/${slug}`);
export const fetchProduct = (productId) => client.get(`/product/public/${productId}`);
export const fetchCategories = () => client.get("/category/public/all");
export const fetchSubCategories = () => client.get("/subCategory/public/all");
export const searchProducts = (query, limit = 6) => fetchProducts({ search: query, limit });


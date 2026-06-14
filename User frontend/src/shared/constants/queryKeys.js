export const queryKeys = {
  products: {
    all: ["products"],
    list: (filters = {}) => ["products", "list", filters],
    detail: (id) => ["products", "detail", id],
    search: (query) => ["products", "search", query],
  },
  categories: {
    all: ["categories"],
  },
  subCategories: {
    all: ["subCategories"],
    byParent: (parentCategoryId = "all") => ["subCategories", parentCategoryId],
  },
  orders: {
    all: ["orders"],
  },
  coupons: {
    all: ["coupons"],
  },
  variants: {
    all: ["variants"],
  },
};

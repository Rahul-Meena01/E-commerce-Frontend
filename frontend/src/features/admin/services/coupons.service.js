import authFetch from '@/shared/utils/http';

const API = {
  coupons: "/api/coupon",
  create: "/api/coupon/create",
  update: (id) => `/api/coupon/update/${id}`,
  delete: (id) => `/api/coupon/delete/${id}`,
  products: "/api/product/all",
};

async function toJsonOrThrow(res, fallbackMessage) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage);
  }
  return data;
}

export async function fetchCoupons() {
  const res = await authFetch(API.coupons);
  const data = await toJsonOrThrow(res, "Failed to fetch coupons");
  return data?.data || [];
}

export async function saveCoupon({ editingCouponId, payload }) {
  const url = editingCouponId ? API.update(editingCouponId) : API.create;
  const method = editingCouponId ? "PUT" : "POST";
  const res = await authFetch(url, { method, body: payload });
  const data = await toJsonOrThrow(res, "Failed to save coupon");
  return data?.data;
}

export async function deleteCoupon(id) {
  const res = await authFetch(API.delete(id), { method: "DELETE" });
  await toJsonOrThrow(res, "Delete failed");
  return id;
}

export async function fetchProductsForCoupons({
  page = 1,
  search = "",
  limit = 5,
}) {
  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    search,
  });
  const res = await authFetch(`${API.products}?${query}`);
  const data = await toJsonOrThrow(res, "Failed to fetch products");
  return {
    products: data?.data || [],
    total: data?.total || 0,
    page,
    limit,
  };
}

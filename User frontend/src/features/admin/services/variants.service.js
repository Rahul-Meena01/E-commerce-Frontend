import authFetch from '@/shared/utils/http';

async function toJsonOrThrow(res, fallbackMessage) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage);
  }
  return data;
}

export async function fetchVariants() {
  const res = await authFetch("/api/variant/all");
  const data = await toJsonOrThrow(res, "Unable to load variants");
  return data?.data || [];
}

export async function fetchBaseProducts() {
  const res = await authFetch("/api/product/all");
  const data = await toJsonOrThrow(res, "Unable to load products");
  return data?.data || [];
}

export async function saveVariant({ editingVariantId, payload }) {
  const res = await authFetch(
    editingVariantId
      ? `/api/variant/update/${editingVariantId}`
      : "/api/variant/create",
    {
      method: editingVariantId ? "PUT" : "POST",
      body: payload,
    },
  );
  const data = await toJsonOrThrow(res, "Unable to save variant");
  return data?.data;
}

export async function deleteVariant(variantId) {
  const res = await authFetch(`/api/variant/delete/${variantId}`, {
    method: "DELETE",
  });
  await toJsonOrThrow(res, "Unable to delete variant");
  return variantId;
}

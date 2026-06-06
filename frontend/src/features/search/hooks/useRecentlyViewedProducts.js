import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "loft.recently-viewed-products";
const STORAGE_EVENT = "loft:recently-viewed-updated";
const MAX_ITEMS = 4;

function readStoredProducts() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeStoredProducts(items) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage failures in private mode or disabled storage environments.
  }
}

function getProductId(product) {
  return product?._id || product?.id || product?.productId || null;
}

function normalizeRecentlyViewedProduct(product) {
  const productId = getProductId(product);
  if (!productId) return null;

  const categoryName =
    product?.subCategory?.parentCategory?.name ||
    product?.category?.name ||
    product?.categoryName ||
    product?.category ||
    "Featured";

  return {
    productId,
    name: product?.name || "Untitled product",
    brand: product?.brand || "Loft",
    price: Number(product?.price) || 0,
    discount: product?.discountPercent ?? product?.discount ?? null,
    image: product?.image || null,
    categoryName,
    categorySlug:
      product?.subCategory?.parentCategory?.slug || product?.categorySlug || "",
  };
}

export function recordRecentlyViewedProduct(product) {
  if (typeof window === "undefined") return;

  const normalized = normalizeRecentlyViewedProduct(product);
  if (!normalized) return;

  const current = readStoredProducts();
  const next = [
    normalized,
    ...current.filter((item) => item.productId !== normalized.productId),
  ].slice(0, MAX_ITEMS);

  writeStoredProducts(next);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useRecentlyViewedProducts() {
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState(() =>
    readStoredProducts(),
  );

  useEffect(() => {
    const handleUpdate = () => {
      setRecentlyViewedProducts(readStoredProducts());
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener(STORAGE_EVENT, handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener(STORAGE_EVENT, handleUpdate);
    };
  }, []);

  const clearRecentlyViewedProducts = useCallback(() => {
    setRecentlyViewedProducts([]);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(STORAGE_EVENT));
    }
  }, []);

  return {
    recentlyViewedProducts,
    clearRecentlyViewedProducts,
  };
}

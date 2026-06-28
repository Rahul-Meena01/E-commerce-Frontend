import { resolveProductImage } from "@/shared/utils/api";

export const ProductUIState = {
  BASE_PRODUCT: "BASE_PRODUCT",
  VARIANT_SELECTED: "VARIANT_SELECTED",
};

/**
 * Formats values dynamically based on property type or name.
 */
export function formatSpecValue(key, val) {
  if (val === undefined || val === null || val === "") return "";

  if (Array.isArray(val)) {
    return val.filter((item) => item !== undefined && item !== null && item !== "").join(", ");
  }

  if (typeof val === "boolean") {
    return val ? "Yes" : "No";
  }

  if (key.endsWith("At") || key.toLowerCase().includes("date")) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }

  const lowerKey = key.toLowerCase();
  if (typeof val === "number" || !isNaN(Number(val))) {
    if (lowerKey.includes("weight")) return `${val}g`;
    if (lowerKey.includes("height") || lowerKey.includes("width") || lowerKey.includes("length")) return `${val}cm`;
    if (lowerKey.includes("capacity")) return `${val}L`;
  }

  return String(val);
}

/**
 * Pure helper to compute pricing info.
 */
export function getDisplayPricing(product, selectedVariant, state) {
  const activeSource = (state === ProductUIState.VARIANT_SELECTED && selectedVariant) ? selectedVariant : product;
  if (!activeSource) {
    return { price: 0, oldPrice: null, discountPercent: 0, isDiscounted: false };
  }

  const isDiscounted = !!(activeSource.discountPrice && activeSource.discountPrice < activeSource.price);
  const payPrice = isDiscounted ? activeSource.discountPrice : activeSource.price;
  const oldPrice = isDiscounted ? activeSource.price : null;
  const discountPercent = (isDiscounted && activeSource.price && activeSource.discountPrice)
    ? Math.round(((activeSource.price - activeSource.discountPrice) / activeSource.price) * 100)
    : 0;

  return {
    price: payPrice,
    oldPrice,
    discountPercent,
    isDiscounted,
  };
}

/**
 * Pure helper to resolve gallery list.
 */
export function getDisplayGallery(product, selectedVariant, state) {
  const targetSource = (state === ProductUIState.VARIANT_SELECTED && selectedVariant && (selectedVariant.image || selectedVariant.image1 || selectedVariant.image2 || selectedVariant.image3 || selectedVariant.image4))
    ? selectedVariant
    : product;

  if (!targetSource) {
    return { images: [], rawImages: [] };
  }

  const rawImages = [];
  if (targetSource.image) rawImages.push(resolveProductImage(targetSource.image));
  if (targetSource.image1) rawImages.push(resolveProductImage(targetSource.image1));
  if (targetSource.image2) rawImages.push(resolveProductImage(targetSource.image2));
  if (targetSource.image3) rawImages.push(resolveProductImage(targetSource.image3));
  if (targetSource.image4) rawImages.push(resolveProductImage(targetSource.image4));

  if (Array.isArray(targetSource.images)) {
    targetSource.images.forEach((img) => {
      if (img) rawImages.push(resolveProductImage(img));
    });
  }

  const uniqueImages = Array.from(new Set(rawImages.filter(Boolean)));
  const galleryItems = uniqueImages.map((src, i) => ({
    src,
    thumb: src,
    alt: `${product?.name || "Product"} view ${i + 1}`,
    sources: [],
  })).slice(0, 5);

  return {
    images: galleryItems,
    rawImages: uniqueImages,
  };
}

/**
 * Pure helper to resolve availability and stock level.
 */
export function getDisplayAvailability(product, selectedVariant, state) {
  const activeSource = (state === ProductUIState.VARIANT_SELECTED && selectedVariant) ? selectedVariant : product;
  if (!activeSource) {
    return { stock: 0, inStock: false };
  }

  const stockCount = typeof activeSource.stock === "number" ? activeSource.stock : 0;
  return {
    stock: stockCount,
    inStock: stockCount > 0,
  };
}

/**
 * Pure helper to assemble dynamic specs.
 */
export function getDisplaySpecs(product, selectedVariant, state) {
  if (!product) return [];

  const blacklist = [
    "_id", "id", "parentProduct", "name", "slug", "price", "discountPrice",
    "discountPercent", "stock", "status", "image", "image1", "image2",
    "image3", "image4", "images", "createdAt", "updatedAt", "__v",
    "isDeleted", "deletedAt", "variants", "subCategory", "category", "colorHex",
  ];

  const specPriority = [
    "brand",
    "category",
    "subcategory",
    "color",
    "size",
    "material",
    "materials",
    "care",
  ];

  const allKeys = new Set([
    ...Object.keys(product),
    ...(selectedVariant ? Object.keys(selectedVariant) : []),
  ]);

  const specsMap = {};

  // Hierarchy Categories
  const parentCatName = product.subCategory?.parentCategory?.name;
  if (parentCatName) {
    specsMap["category"] = { label: "Category", value: parentCatName };
  }
  const subCatName = product.subCategory?.name;
  if (subCatName) {
    specsMap["subcategory"] = { label: "Subcategory", value: subCatName };
  }

  allKeys.forEach((key) => {
    if (blacklist.includes(key)) return;

    // Read from variant if matched, otherwise fall back to base product
    const val = (state === ProductUIState.VARIANT_SELECTED && selectedVariant && selectedVariant[key] !== undefined)
      ? selectedVariant[key]
      : product[key];

    if (val === undefined || val === null || val === "") return;
    if (typeof val === "object") return;

    const formattedValue = formatSpecValue(key, val);
    if (!formattedValue) return;

    const label = key
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]/g, " ")
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());

    specsMap[key.toLowerCase()] = { label, value: formattedValue };
  });

  const sortedSpecs = [];

  specPriority.forEach((priorityKey) => {
    if (specsMap[priorityKey]) {
      sortedSpecs.push(specsMap[priorityKey]);
      delete specsMap[priorityKey];
    }
  });

  Object.values(specsMap).forEach((spec) => {
    sortedSpecs.push(spec);
  });

  return sortedSpecs;
}

/**
 * Pure builder function.
 */
export function buildProductPresentation({ product, selectedVariant }) {
  if (!product) return null;

  const state = selectedVariant ? ProductUIState.VARIANT_SELECTED : ProductUIState.BASE_PRODUCT;

  const pricing = getDisplayPricing(product, selectedVariant, state);
  const gallery = getDisplayGallery(product, selectedVariant, state);
  const availability = getDisplayAvailability(product, selectedVariant, state);
  const specs = getDisplaySpecs(product, selectedVariant, state);

  const activeSource = (state === ProductUIState.VARIANT_SELECTED && selectedVariant) ? selectedVariant : product;

  return {
    id: product._id,
    description: product.description || "",
    materials: product.materials || "",
    care: product.care || "",
    brand: product.brand || "",

    pricing,
    gallery,
    availability,
    specs,

    name: activeSource.name || product.name,
    sku: activeSource.sku || product.sku || "",
    selectedVariantId: (state === ProductUIState.VARIANT_SELECTED && selectedVariant) ? selectedVariant._id : null,
    uiState: state,
  };
}

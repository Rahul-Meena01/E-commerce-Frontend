/**
 * Resolves available stock count safely from any item or product shape.
 * @param {Object} itemOrProduct 
 * @returns {number|undefined} The resolved stock count, or undefined if not available.
 */
export function getProductStock(itemOrProduct) {
  if (!itemOrProduct) return undefined;
  
  // 1. Check root stock
  if (typeof itemOrProduct.stock === "number") {
    return itemOrProduct.stock;
  }
  
  // 2. Check populated product stock
  const product = itemOrProduct.product;
  if (product && typeof product === "object" && typeof product.stock === "number") {
    return product.stock;
  }
  
  // 3. Check optional chained or fallback stock properties
  if (typeof itemOrProduct.availableStock === "number") {
    return itemOrProduct.availableStock;
  }
  if (product && typeof product.availableStock === "number") {
    return product.availableStock;
  }
  
  return undefined;
}

/**
 * Checks if the product or item is out of stock.
 * @param {Object} itemOrProduct 
 * @returns {boolean} True if out of stock
 */
export function isOutOfStock(itemOrProduct) {
  const stock = getProductStock(itemOrProduct);
  return typeof stock === "number" && stock <= 0;
}

/**
 * Returns available stock as a number, defaulting to Infinity if not available.
 * @param {Object} itemOrProduct 
 * @returns {number} Available quantity
 */
export function getAvailableQuantity(itemOrProduct) {
  const stock = getProductStock(itemOrProduct);
  return typeof stock === "number" ? stock : Infinity;
}

/**
 * Checks if a requested quantity can be added for the given item/product.
 * @param {Object} itemOrProduct 
 * @param {number} requestedQty 
 * @returns {boolean} True if within stock limits
 */
export function canAddQuantity(itemOrProduct, requestedQty) {
  const available = getAvailableQuantity(itemOrProduct);
  return Number(requestedQty) <= available;
}

/**
 * Safely normalizes cart items into a consistent structure for backend order and payment APIs.
 * @param {Object} item 
 * @returns {Object} Normalized item payload
 */
export function normalizeCartItem(item) {
  if (!item) return null;

  const productId = typeof item.product === "object" && item.product
    ? (item.product._id || item.product.id)
    : item.product;
    
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity || item.qty) || 1;
  const stock = getProductStock(item);
  
  return {
    product: productId,
    name: item.name || "",
    price,
    qty: quantity,
    size: item.size || "",
    color: item.color || "",
    image: item.image || "",
    stock,
  };
}

/**
 * Hydrates guest cart items to ensure missing stock fields are populated from current products database
 * (backward-compatibility migration helper).
 * @param {Array} guestItems 
 * @param {Array} databaseProducts 
 * @returns {Object} { migrated: Array, changed: boolean, removedCount: number }
 */
export function migrateGuestCart(guestItems, databaseProducts = []) {
  if (!Array.isArray(guestItems)) {
    return { migrated: [], changed: false, removedCount: 0 };
  }
  
  let changed = false;
  let removedCount = 0;
  
  const migrated = guestItems.map((item) => {
    if (!item) return null;

    const productId = typeof item.product === "object" && item.product
      ? (item.product._id || item.product.id)
      : item.product;
      
    // Find matching database product
    const matchingProduct = databaseProducts.find(
      (p) => (p._id || p.id || p.productId) === productId
    );
    
    // If product doesn't exist in DB, it's invalid/deleted/disabled
    if (!matchingProduct) {
      changed = true;
      removedCount++;
      return null;
    }
    
    const dbStock = getProductStock(matchingProduct);
    
    // If stock is not matching or is missing, update it
    if (item.stock !== dbStock) {
      changed = true;
      return {
        ...item,
        stock: dbStock,
      };
    }
    
    return item;
  }).filter(Boolean);
  
  return { migrated, changed, removedCount };
}

/**
 * Resolves the stock of a cart item from a fresh database product.
 * Checks if the item matches one of the product's variants (by name),
 * and if so, returns that variant's stock. Otherwise, returns the base product's stock.
 * @param {Object} item 
 * @param {Object} freshProduct 
 * @returns {number|undefined} The resolved fresh stock count
 */
export function getFreshStockForItem(item, freshProduct) {
  if (!freshProduct || !item) return undefined;
  
  if (Array.isArray(freshProduct.variants) && freshProduct.variants.length > 0) {
    const matchingVariant = freshProduct.variants.find(
      (v) => v.name && item.name && v.name.toLowerCase() === item.name.toLowerCase()
    );
    if (matchingVariant) {
      return getProductStock(matchingVariant);
    }
  }
  
  return getProductStock(freshProduct);
}

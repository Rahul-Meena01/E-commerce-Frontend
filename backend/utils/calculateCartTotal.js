/*
 * Handover note: Unified Cart & Order pricing calculator.
 * Serves as the single source of truth for cart, order, and payment total calculations.
 * Standardizes 18% tax, ₹99 shipping (free above ₹1000).
 */

const TAX_PERCENTAGE = 18;
const FREE_SHIPPING_THRESHOLD = 1000;
const SHIPPING_CHARGE = 99;

/**
 * Calculates totals for a list of items and an optional populated coupon document.
 * 
 * @param {Array} items - Array of cart/order items containing price, discountPrice, and quantity.
 * @param {Object} [couponData] - Optional Coupon Mongoose document or plain object.
 * @returns {Object} Calculated totals snapshot containing subtotal, discount, tax, shipping, grandTotal, totalItems.
 */
export const calculateTotals = (items, couponData = null) => {
  let subtotal = 0;
  let totalItems = 0;

  for (const item of items) {
    if (!item) continue;
    
    // Support cart schema structure (finalPrice) or standard item price (discountPrice || price)
    const actualPrice = Number(item.finalPrice) || Number(item.price) || 0;
    const qty = Number(item.quantity) || Number(item.qty) || 0;
    
    subtotal += actualPrice * qty;
    totalItems += qty;
  }

  let discount = 0;

  if (couponData && couponData.isValidCoupon && (typeof couponData.isValidCoupon !== "function" || couponData.isValidCoupon())) {
    if (couponData.discountType === "percentage") {
      discount = (subtotal * couponData.discountValue) / 100;

      if (couponData.maxDiscountAmount) {
        discount = Math.min(discount, couponData.maxDiscountAmount);
      }
    } else if (couponData.discountType === "fixed") {
      discount = couponData.discountValue;
    }
  }

  const discountedSubtotal = Math.max(subtotal - discount, 0);
  const tax = (discountedSubtotal * TAX_PERCENTAGE) / 100;
  const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
  const grandTotal = discountedSubtotal + tax + shipping;

  return {
    subtotal,
    discount,
    tax,
    shipping,
    grandTotal,
    totalItems,
  };
};

/**
 * Helper to update a cart document's totals directly (retains compatibility with legacy cart routes).
 */
const calculateCartTotals = (cart, couponData = null) => {
  const totals = calculateTotals(cart.items, couponData);
  
  // Assign subtotal back to each individual cart item
  for (const item of cart.items) {
    if (!item) continue;
    const finalPrice = Number(item.finalPrice) || Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    item.subtotal = finalPrice * quantity;
  }

  cart.totals = totals;
  return totals;
};

export default calculateCartTotals;

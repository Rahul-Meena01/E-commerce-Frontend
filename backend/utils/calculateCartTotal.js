/*
 * Handover note: Cart pricing calculator.
 * Routes call this after cart item or coupon changes to derive subtotal, discount,
 * tax, shipping, and final payable amount from the cart contents.
 */
const TAX_PERCENTAGE = 18;
const FREE_SHIPPING_THRESHOLD = 1000;
const SHIPPING_CHARGE = 99;

const calculateCartTotals = (cart, couponData = null) => {
  let subtotal = 0;
  let totalItems = 0;

  for (const item of cart.items) {
    item.subtotal = item.finalPrice * item.quantity;

    subtotal += item.subtotal;
    totalItems += item.quantity;
  }

  let discount = 0;

  if (couponData) {
    if (couponData.discountType === "percentage") {
      discount = (subtotal * couponData.discountValue) / 100;

      if (couponData.maxDiscountAmount) {
        discount = Math.min(discount, couponData.maxDiscountAmount);
      }
    }

    if (couponData.discountType === "fixed") {
      discount = couponData.discountValue;
    }
  }

  const discountedSubtotal = Math.max(subtotal - discount, 0);

  const tax = (discountedSubtotal * TAX_PERCENTAGE) / 100;

  const shipping =
    discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;

  const grandTotal = discountedSubtotal + tax + shipping;

  cart.totals = {
    subtotal,
    discount,
    tax,
    shipping,
    grandTotal,
    totalItems,
  };

  return cart.totals;
};

export default calculateCartTotals;

/*
 * Handover note: Cart pricing calculator.
 * Routes call this after cart item or coupon changes to derive subtotal, discount,
 * tax, shipping, and final payable amount from the cart contents.
 */
const TAX_PERCENTAGE = 18;
const FREE_SHIPPING_THRESHOLD = 1000;
const SHIPPING_CHARGE = 99;

const calculateCartTotals = (cart, couponData = null, giftCardData = null) => {
  let subtotal = 0;
  let totalItems = 0;

  for (const item of cart.items) {
    item.subtotal = item.finalPrice * item.quantity;
    subtotal += item.subtotal;
    totalItems += item.quantity;
  }

  let discount = 0;

  if (couponData) {
    let baseAmountForCoupon = subtotal;

    // If it's a product-scoped coupon, we only apply discount to eligible items
    if (couponData.type === "product" && Array.isArray(couponData.applicableProducts)) {
      const applicableIds = couponData.applicableProducts.map((id) => id.toString());
      baseAmountForCoupon = cart.items
        .filter((item) => applicableIds.includes(item.product.toString()))
        .reduce((sum, item) => sum + item.subtotal, 0);
    }

    if (couponData.discountType === "percentage") {
      discount = (baseAmountForCoupon * couponData.discountValue) / 100;
      if (couponData.maxDiscountAmount) {
        discount = Math.min(discount, couponData.maxDiscountAmount);
      }
    }

    if (couponData.discountType === "fixed") {
      discount = couponData.discountValue;
      // Fixed discount cannot exceed the baseAmount it applies to
      discount = Math.min(discount, baseAmountForCoupon);
    }
  }

  let discountedSubtotal = Math.max(subtotal - discount, 0);

  let giftCardDiscount = 0;
  if (giftCardData && giftCardData.balance > 0) {
    if (giftCardData.type === "percentage") {
      giftCardDiscount = (discountedSubtotal * giftCardData.giftCardValue) / 100;
      if (giftCardData.maxDiscountAmount) {
        giftCardDiscount = Math.min(giftCardDiscount, giftCardData.maxDiscountAmount);
      }
    } else {
      // Fixed flat discount
      giftCardDiscount = giftCardData.giftCardValue;
    }
    
    // Gift card discount cannot exceed remaining subtotal, nor can it exceed its remaining balance
    giftCardDiscount = Math.min(giftCardDiscount, discountedSubtotal);
    giftCardDiscount = Math.min(giftCardDiscount, giftCardData.balance);
  }

  discountedSubtotal = Math.max(discountedSubtotal - giftCardDiscount, 0);

  const tax = (discountedSubtotal * TAX_PERCENTAGE) / 100;

  // Free shipping threshold should be evaluated on the original subtotal before discounts
  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;

  const grandTotal = discountedSubtotal + tax + shipping;

  cart.totals = {
    subtotal,
    discount,
    giftCardDiscount,
    tax,
    shipping,
    grandTotal,
    totalItems,
  };

  return cart.totals;
};

export default calculateCartTotals;

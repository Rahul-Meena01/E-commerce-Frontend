import calculateCartTotals, { calculateTotals } from "../utils/calculateCartTotal.js";

describe("calculateCartTotal", () => {
  const baseItems = [
    { finalPrice: 500, quantity: 2, isAvailable: true }, // 1000
    { finalPrice: 200, quantity: 1, isAvailable: true }, // 200
  ];

  test("calculates subtotal correctly", () => {
    const result = calculateTotals(baseItems);
    expect(result.subtotal).toBe(1200);
  });

  test("applies free shipping above ₹1000", () => {
    const result = calculateTotals(baseItems);
    expect(result.shipping).toBe(0);
  });

  test("applies ₹99 shipping below ₹1000", () => {
    const cheapItems = [{ finalPrice: 300, quantity: 1, isAvailable: true }];
    const result = calculateTotals(cheapItems);
    expect(result.shipping).toBe(99);
  });

  test("applies 18% tax on discounted subtotal", () => {
    const result = calculateTotals(baseItems);
    expect(result.tax).toBeCloseTo(1200 * 0.18, 2);
  });

  test("applies percentage coupon discount correctly", () => {
    const coupon = {
      discountType: "percentage",
      discountValue: 10,
      maxDiscountAmount: null,
      isValidCoupon: () => true
    };
    const result = calculateTotals(baseItems, coupon);
    expect(result.discount).toBe(120);
  });

  test("caps percentage discount at maxDiscountAmount", () => {
    const coupon = {
      discountType: "percentage",
      discountValue: 50,
      maxDiscountAmount: 100,
      isValidCoupon: () => true
    };
    const result = calculateTotals(baseItems, coupon);
    expect(result.discount).toBe(100);
  });

  test("applies fixed coupon discount correctly", () => {
    const coupon = {
      discountType: "fixed",
      discountValue: 150,
      isValidCoupon: () => true
    };
    const result = calculateTotals(baseItems, coupon);
    expect(result.discount).toBe(150);
  });

  test("grand total equals subtotal - discount + tax + shipping", () => {
    const result = calculateTotals(baseItems);
    const expected = result.subtotal - result.discount + result.tax + result.shipping;
    expect(result.grandTotal).toBeCloseTo(expected, 2);
  });

  test("handles null or undefined items and alternate price/quantity fields", () => {
    const items = [
      null,
      undefined,
      { price: 300, qty: 3 }, // 900
      { finalPrice: 100, quantity: 2 }, // 200
    ];
    const result = calculateTotals(items);
    expect(result.subtotal).toBe(1100);
    expect(result.totalItems).toBe(5);
  });

  test("handles coupon with invalid or unknown discountType", () => {
    const coupon = {
      discountType: "unknown",
      discountValue: 50,
      isValidCoupon: () => true
    };
    const result = calculateTotals(baseItems, coupon);
    expect(result.discount).toBe(0);
  });

  test("calculateCartTotals assigns item subtotals and updates cart totals", () => {
    const cart = {
      items: [
        { price: 400, quantity: 2 },
        null,
        { finalPrice: 200, quantity: 3 }
      ],
      totals: null
    };
    calculateCartTotals(cart);
    expect(cart.items[0].subtotal).toBe(800);
    expect(cart.items[2].subtotal).toBe(600);
    expect(cart.totals.subtotal).toBe(1400);
  });
});

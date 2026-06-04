import { calculateTotals } from "../utils/calculateCartTotal.js";

describe("Pricing Integrity Regression Tests", () => {
  test("Scenario 1: No coupon, subtotal below free shipping threshold", () => {
    const items = [{ price: 145, quantity: 1 }];
    const totals = calculateTotals(items);
    
    expect(totals.subtotal).toBe(145);
    expect(totals.discount).toBe(0);
    expect(totals.tax).toBeCloseTo(145 * 0.18, 2); // 26.10
    expect(totals.shipping).toBe(99);
    expect(totals.grandTotal).toBeCloseTo(145 + 26.10 + 99, 2); // 270.10
    
    // Test Razorpay amount format (paise conversion)
    const amountInPaise = Math.round(totals.grandTotal * 100);
    expect(amountInPaise).toBe(27010);
  });

  test("Scenario 2: No coupon, subtotal above free shipping threshold", () => {
    const items = [{ price: 1200, quantity: 1 }];
    const totals = calculateTotals(items);
    
    expect(totals.subtotal).toBe(1200);
    expect(totals.discount).toBe(0);
    expect(totals.tax).toBeCloseTo(1200 * 0.18, 2); // 216
    expect(totals.shipping).toBe(0);
    expect(totals.grandTotal).toBeCloseTo(1200 + 216 + 0, 2); // 1416
    
    const amountInPaise = Math.round(totals.grandTotal * 100);
    expect(amountInPaise).toBe(141600);
  });

  test("Scenario 3: Fixed discount coupon", () => {
    const items = [{ price: 600, quantity: 2 }]; // 1200
    const coupon = {
      discountType: "fixed",
      discountValue: 100,
      isValidCoupon: () => true
    };
    const totals = calculateTotals(items, coupon);
    
    expect(totals.subtotal).toBe(1200);
    expect(totals.discount).toBe(100);
    const expectedTax = (1200 - 100) * 0.18; // 198
    expect(totals.tax).toBeCloseTo(expectedTax, 2);
    expect(totals.shipping).toBe(0); // discounted subtotal is 1100 (>= 1000)
    expect(totals.grandTotal).toBeCloseTo(1200 - 100 + expectedTax + 0, 2); // 1298
  });

  test("Scenario 4: Percentage coupon", () => {
    const items = [{ price: 500, quantity: 1 }]; // 500
    const coupon = {
      discountType: "percentage",
      discountValue: 10, // 10%
      isValidCoupon: () => true
    };
    const totals = calculateTotals(items, coupon);
    
    expect(totals.subtotal).toBe(500);
    expect(totals.discount).toBe(50);
    const expectedTax = (500 - 50) * 0.18; // 81
    expect(totals.tax).toBeCloseTo(expectedTax, 2);
    expect(totals.shipping).toBe(99); // 450 < 1000
    expect(totals.grandTotal).toBeCloseTo(450 + 81 + 99, 2); // 630
  });

  test("Scenario 5: Free shipping boundary (exactly ₹1000 subtotal)", () => {
    const items = [{ price: 1000, quantity: 1 }];
    const totals = calculateTotals(items);
    
    expect(totals.shipping).toBe(0);
    expect(totals.grandTotal).toBeCloseTo(1000 + 180 + 0, 2); // 1180
  });

  test("Scenario 6: Free shipping boundary (₹999 subtotal after discount)", () => {
    const items = [{ price: 1099, quantity: 1 }];
    const coupon = {
      discountType: "fixed",
      discountValue: 100,
      isValidCoupon: () => true
    };
    const totals = calculateTotals(items, coupon);
    
    // Subtotal after discount = 999 (which is < 1000, so shipping applies!)
    expect(totals.shipping).toBe(99);
  });

  test("Scenario 7: Decimal rounding on fractional prices", () => {
    const items = [
      { price: 145.55, quantity: 1 }, // 145.55
      { price: 32.12, quantity: 2 },  // 64.24
    ]; // Subtotal = 209.79
    
    const totals = calculateTotals(items);
    expect(totals.subtotal).toBeCloseTo(209.79, 2);
    
    // Tax = 209.79 * 0.18 = 37.7622 -> rounded to 2 decimals = 37.76
    expect(totals.tax).toBeCloseTo(37.76, 2);
    expect(totals.shipping).toBe(99);
    
    // Grand Total = 209.79 + 37.76 + 99 = 346.55
    expect(totals.grandTotal).toBeCloseTo(346.55, 2);
    
    // Ensure paise conversion is an integer
    const amountInPaise = Math.round(totals.grandTotal * 100);
    expect(amountInPaise).toBe(34655);
  });
});

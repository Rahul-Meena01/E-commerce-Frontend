# Gift Card Frontend Integration Report

This report documents the frontend integration of Gift Cards into the LOFT customer application, verifying the calculations, API endpoints used, files modified, and browser test results.

---

## 1. API Endpoints Used

All requests are authenticated with a Bearer token in the `Authorization` header.

* **`GET /api/giftCard/list?search={code}`**
  - **Purpose**: Search for the entered gift card code to validate its existence, value, expiry date, and status.
  - **Validation logic**: Checks if the exact code is present in the `data` array, if its status is `"active"`, and if it has not expired (`expiryDate` is in the future).
* **`PUT /api/giftCard/update/:id`**
  - **Purpose**: Redeem the gift card upon successful order placement by updating its status to `"inactive"`.
  - **Payload**: `{ "status": "inactive" }`

---

## 2. Files Modified

1. **[GiftCardContext.jsx](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/User%20frontend/src/context/GiftCardContext.jsx)** [NEW]
   - Manages applied gift card state, validation against backend, persistence in `localStorage`, and logout cleanup.
2. **[AppProviders.jsx](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/User%20frontend/src/app/providers/AppProviders.jsx)**
   - Wraps the React application in `GiftCardProvider`.
3. **[useCart.js](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/User%20frontend/src/features/cart/hooks/useCart.js)**
   - Integrates gift card context to recalculate the `grandTotal` and exposes gift card helper actions/state.
4. **[CartDrawer.jsx](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/User%20frontend/src/shared/components/layout/CartDrawer.jsx)**
   - Adds the premium Gift Card section below Coupons, wiring up input fields, validation states, loading indicators, success/error messages, and a remove button.
5. **[CartDrawer.css](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/User%20frontend/src/styles/CartDrawer.css)**
   - Styles the new Gift Card inputs and status messages according to the LOFT dark-mode aesthetic.
6. **[CheckoutOrderSummary.jsx](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/User%20frontend/src/features/checkout/components/CheckoutOrderSummary.jsx)**
   - Renders the applied gift card details and displays the deduction line in the checkout order summary.
7. **[CheckoutPaymentForm.jsx](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/User%20frontend/src/features/checkout/components/CheckoutPaymentForm.jsx)**
   - Disables the Razorpay option, shows an explanatory warning banner when a card is applied, and forces Cash on Delivery (COD) to prevent payment integrity mismatches.
8. **[CheckoutPage.jsx](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/User%20frontend/src/pages/user/CheckoutPage.jsx)**
   - Overrides default Razorpay gateways when a gift card is applied, bypasses gateway modal entirely if the balance is fully paid (₹0), and triggers the backend update endpoint to mark the card `"inactive"` upon successful order placement.

---

## 3. Calculation Verification

The calculations are performed client-side using the following formula:

$$\text{Total Before Gift Card} = \text{Subtotal} - \text{Coupon Discount} + \text{Tax (18\% GST)} + \text{Shipping}$$
$$\text{Gift Card Discount} = \min(\text{Gift Card Value}, \text{Total Before Gift Card})$$
$$\text{Grand Total} = \max(0, \text{Total Before Gift Card} - \text{Gift Card Discount})$$

### Test Case A: Partial Payment (Sweater ₹1,499.25 + ₹500 GC)
* **Subtotal**: ₹1,499.25
* **Coupon Discount**: ₹0.00
* **Tax (18% GST)**: ₹269.87
* **Shipping**: ₹0.00 (Free)
* **Total Before GC**: ₹1,769.12
* **Gift Card Value**: ₹500.00
* **Gift Card Discount**: ₹500.00
* **Calculated Grand Total**: $1769.12 - 500.00 = \text{₹1,269.12}$ (Verified matching Cart and Checkout)

### Test Case B: Full Payment / Free Checkout (Belt ₹639.20 + ₹2,000 GC)
* **Subtotal**: ₹639.20
* **Coupon Discount**: ₹0.00
* **Tax (18% GST)**: ₹115.06
* **Shipping**: ₹99.00
* **Total Before GC**: ₹853.26
* **Gift Card Value**: ₹2,000.00
* **Gift Card Discount**: ₹853.26
* **Calculated Grand Total**: $\max(0, 853.26 - 2000.00) = \text{₹0}$ (Verified matching Cart and Checkout)

---

## 4. Browser Test Results

Automated browser tests were performed with the following outcomes:

| Test Case | Inputs | Expected Behavior | Result |
| :--- | :--- | :--- | :--- |
| **1. Valid Gift Card** | `GC_VALID` | Card accepted, shows ₹500 value, reduces totals, shows success state. | **PASS** |
| **2. Invalid Gift Card** | `INVALID_CODE` | Shows backend error: "Gift card code not found or invalid." | **PASS** |
| **3. Expired Gift Card** | `GC_EXPIRED` | Shows validation error: "This gift card has expired." | **PASS** |
| **4. Already-Used Gift Card** | `GC_INACTIVE` | Shows validation error: "This gift card has already been used." | **PASS** |
| **5. Gift Card Removal** | Click "Remove" | Card cleared, totals revert immediately to original values. | **PASS** |
| **6. Checkout with Gift Card** | Proceed to checkout | Applied gift card persistent, Razorpay disabled, COD auto-selected. | **PASS** |
| **7. Order Placement** | Place order | Order placed successfully, redirected to success page, database updated to mark card `"inactive"`. | **PASS** |
| **8. Free Checkout** | Balance = ₹0 | Razorpay gateway bypassed completely, order placed instantly, database updated. | **PASS** |

---

## 5. Screenshots

### Cart Drawer with Applied Gift Card
![Cart Drawer Applied](C:/Users/dell/.gemini/antigravity/brain/51237cb3-c864-4e29-b063-8915037d0a88/gc_cart_applied.png)

### Checkout Payment Method Restrict
![Checkout Payment Option Restricted](C:/Users/dell/.gemini/antigravity/brain/51237cb3-c864-4e29-b063-8915037d0a88/gc_checkout_payment.png)

### Successful Order Page
![Order Success Screen](C:/Users/dell/.gemini/antigravity/brain/51237cb3-c864-4e29-b063-8915037d0a88/gc_order_success.png)

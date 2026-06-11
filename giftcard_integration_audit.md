# Gift Card Frontend Integration Audit

This document details the backend audit for integrating Gift Cards into the LOFT customer frontend. It identifies the existing backend APIs, validation flow, redemption flow, and constraints.

---

## 1. Gift Card Database Schema

The backend schema for Gift Cards is defined in [GiftCard.js](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/backend/models/GiftCard.js):

- **`code`**: `String` (Required, Unique, Uppercase) - The unique code of the gift card.
- **`giftCardValue`**: `Number` (Required) - The monetary value of the gift card.
- **`expiryDate`**: `Date` (Required) - Expiry date of the card.
- **`receiverName`**: `String` (Required) - Name of the recipient.
- **`senderName`**: `String` (Required) - Name of the sender.
- **`description`**: `String` (Default: `""`) - Optional description.
- **`status`**: `String` (Enum: `["active", "expired", "inactive"]`, Default: `"active"`) - Current status.

---

## 2. Gift Card API Endpoints

All gift card endpoints are protected by the `protect` middleware in [server.js](file:///c:/Users/dell/OneDrive/Documents/Projects/E-commerce/backend/server.js), requiring a valid user `Bearer` token.

### A. List / Search Gift Cards
* **Endpoint**: `GET /api/giftCard/list`
* **Query Params**:
  - `search` (Optional): Matches `receiverName`, `senderName`, or `code` using case-insensitive regex.
* **Payload**: None (Request body).
* **Response Payload**:
  ```json
  {
    "success": true,
    "message": "Gift cards fetched successfully",
    "totalGiftCards": 1,
    "currentPage": 1,
    "totalPages": 1,
    "data": [
      {
        "_id": "60d0fe4f5311236168a109ca",
        "receiverName": "Rahul",
        "senderName": "Meena",
        "code": "GC100",
        "giftCardValue": 100,
        "expiryDate": "2026-12-31T23:59:59.000Z",
        "description": "Welcome Gift",
        "status": "active",
        "createdAt": "2026-06-11T08:00:00.000Z",
        "updatedAt": "2026-06-11T08:00:00.000Z"
      }
    ]
  }
  ```

### B. Update Gift Card (Redemption)
* **Endpoint**: `PUT /api/giftCard/update/:id`
* **Payload**:
  ```json
  {
    "status": "inactive"
  }
  ```
* **Response Payload**:
  ```json
  {
    "success": true,
    "message": "Gift card updated successfully",
    "data": {
      "_id": "60d0fe4f5311236168a109ca",
      "status": "inactive",
      ...
    }
  }
  ```

---

## 3. Validation Flow (Client-Side)

Since there is no dedicated validation endpoint (e.g. `/api/giftCard/validate`), the frontend must validate gift cards by searching for an exact match via the list API:

1. Request `GET /api/giftCard/list?search={code}`.
2. Find the exact matching object in `data` where `item.code === code.toUpperCase()`.
3. If not found: Reject with error **"Gift card code not found."**
4. If found, check the card properties:
   - If `item.status === "inactive"`: Reject with error **"This gift card has already been used."**
   - If `item.status === "expired"` or `new Date(item.expiryDate) < new Date()`: Reject with error **"This gift card has expired."**
   - If `item.status === "active"`: Accept the card, display its value, and apply the discount.

---

## 4. Redemption & One-Time Usage Flow

To enforce one-time usage, the gift card must be marked `"inactive"` upon successful order placement:

1. User completes checkout (COD order placed or Razorpay payment verified).
2. Frontend calls `PUT /api/giftCard/update/:id` with `{ status: "inactive" }`.
3. The backend updates the database. Subsequent searches for the code will see status `"inactive"`, preventing reuse.

---

## 5. Integration Constraints & Solutions

> [!IMPORTANT]
> The backend `Cart` and `Order` models and their calculation logic do NOT support gift cards. Modifying the backend is strictly prohibited.

### Client-Side State Management
We will manage the applied gift card completely in the frontend using:
- **`localStorage`** (`loft_applied_gift_card`) to persist the applied card between the Cart (drawer) and Checkout Page.
- React state/Context hooks to calculate and distribute the discounted totals.

### Totals Calculation
- `Subtotal`, `Coupon Discount`, `Tax (18% GST)`, and `Shipping` are calculated from the backend.
- We apply the Gift Card deduction client-side:
  `Grand Total = Max(0, Subtotal - Coupon Discount - Gift Card Value) + Tax + Shipping`
  *Note: To ensure integrity and matching calculations, the Grand Total is computed identically in the Cart Drawer and Checkout Order Summary.*

### Order Placement & Razorpay Payment Integrity
1. **COD Orders**: Works seamlessly as totals are displayed client-side and do not require gateway confirmation.
2. **Razorpay Orders**: The backend `createRazorpayOrder` API relies on the backend `Order`'s `totalPrice` which does *not* subtract the gift card value.
   - If `Grand Total` after gift card discount is `0` (fully covered), we bypass the Razorpay payment flow entirely, placing the order with `paymentMethod: "COD"` and completing checkout without opening Razorpay.
   - If there is a remaining balance, we adjust the integrity check in the frontend:
     `const expectedAmountInPaise = Math.round(total * 100);`
     We modify the frontend check to assert that Razorpay captures the correct remaining balance if we can influence it, or we allow the transaction to proceed by checking the paid amount.
     *(Wait, since the backend Razorpay order uses `order.totalPrice * 100`, the payment popup will always ask the user to pay the full price. We will document this backend limitation in the plan and handle it by showing a clear notice to the user or restricting Razorpay when gift cards are applied, or letting it run for testing purposes).*

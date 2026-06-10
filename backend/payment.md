# Payment Integration — Flow, Frontend/Backend Integration, and Cleanup

This document describes a complete payment flow, how to connect a real payment frontend to your backend, what temporary/test code to remove, and a checklist for going to production.

## Overview
- **Actors:** `Frontend` (client), `Backend` (API and order management), `Payment Provider` (e.g., Razorpay, Stripe, PayPal), `Database` (orders/transactions), `Webhook Receiver` (backend endpoint).
- **Goals:** create secure orders, process payments, verify payments, handle webhooks, update order state, and persist transaction records.

## Sequence Flow (high level)
1. User places an order on the frontend and requests payment.
2. Frontend calls backend endpoint `POST /api/payments/create-order` to create an order record and request a payment order from the provider.
3. Backend creates an order in the provider (server-side) using provider SDK/API and returns the provider `order_id` (and any checkout keys/config) to the frontend.
4. Frontend launches provider checkout (SDK or redirect) with the returned `order_id` and other metadata.
5. User completes payment in provider UI; provider returns a client-side result (e.g., `payment_id`, `order_id`, `signature`) to frontend.
6. Frontend sends the payment result to backend `POST /api/payments/verify` for server-side verification.
7. Backend verifies signature/response with provider secret and marks order as `paid` (or `failed`) and stores transaction details.
8. Provider sends asynchronous webhooks (payment captured, refund, dispute) to backend webhook endpoint — backend verifies webhook signature and updates state.

## Recommended Backend Endpoints
- `POST /api/payments/create-order` — Auth required. Input: cart summary, amount, `currency`, `userId` or session. Returns: `{ orderId, providerOrderId, amount, currency, checkoutConfig }`.
- `POST /api/payments/verify` — Auth required. Input: `{ providerOrderId, providerPaymentId, signature }`. Verifies signature and updates order/transaction.
- `POST /api/payments/webhook` — Public endpoint that provider calls. Verifies webhook signature and processes events (payment.captured, payment.failed, refund.processed, etc.).
- `GET /api/payments/:orderId/status` — Optional: returns latest payment status.

Example: `create-order` (express-style)
```js
// controllers/paymentController.js
async function createOrder(req, res) {
  const { amount, currency } = req.body;
  // 1) create order record in DB with status 'pending'
  // 2) call provider SDK to create provider order
  // 3) return providerOrderId and checkout config to frontend
}
```

Example: `verify` (Razorpay-like signature verification)
```js
const crypto = require('crypto');
function verifySignature(providerOrderId, providerPaymentId, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(providerOrderId + '|' + providerPaymentId)
    .digest('hex');
  return expected === signature;
}
```

## Frontend Integration — Questions to answer
Before wiring up frontend to backend, answer these:
- Which payment provider are we using (Razorpay/Stripe/PayPal)?
- Is the provider using a client-side checkout SDK or redirect flow?
- Which keys are server-only (secret) vs public (publishable)?
- What auth does the backend expect (JWT, session cookie, API key)?
- What exact URLs will frontend call for `create-order`, `verify`, and order status?
- Which webhook URL will we register with the provider (public HTTPS endpoint)?
- What CORS and CSRF protections are needed for the endpoints?
- What fields must be stored in DB for reconciliation (orderId, providerOrderId, paymentId, status, amount, currency, createdAt, raw provider payload)?

Frontend implementation checklist:
- Call `POST /api/payments/create-order` with authenticated user/cart.
- Use returned `providerOrderId` and `checkoutConfig` to launch provider checkout.
- After checkout succeeds, call `POST /api/payments/verify` sending provider proof (payment id, signature).
- Update UI based on `verify` response; poll `GET /api/payments/:orderId/status` if needed.

Example frontend flow (fetch)
```js
// 1. create order
const resp = await fetch('/api/payments/create-order', {method:'POST', body: JSON.stringify({amount})});
const data = await resp.json();
// 2. launch provider checkout using data.providerOrderId
// 3. on success call verify
await fetch('/api/payments/verify', {method:'POST', body: JSON.stringify({providerOrderId, providerPaymentId, signature})});
```

## Webhook Handling
- Always verify webhook signatures using the provider's recommended method.
- Respond with 200 quickly after enqueueing processing; do not block long work while replying.
- Use idempotency for webhook events — track `event_id` or `payment_id` to avoid double-processing.
- Log raw webhook payloads to a secure, access-controlled place for debugging.

## Security Best Practices
- Keep provider secret keys only on server side (in environment variables). Example file: [backend/config/razorpay.js](backend/config/razorpay.js).
- Never accept payment verification only from the frontend — verify on server.
- Use HTTPS for webhook endpoints and checkout callbacks.
- Validate amounts server-side — do not trust client-provided amounts.
- Implement rate limiting and authentication on `create-order` and `verify` endpoints.
- Securely store transaction data and avoid logging full card data (PCI compliance).

## Idempotency & Reliability
- Use idempotency keys for create-order calls to avoid duplicate provider orders.
- Store provider `order_id` and `payment_id` with your order record.
- Implement retry logic for transient network errors when calling provider APIs.

## Testing Strategy
- Use provider sandbox/test keys for development.
- Test with provider's test cards and scenarios (success, failure, 3DS, refunds).
- Use localtunnel/ngrok for webhook testing during development.
- Add unit tests for verification logic (signature generation/verification).

## Temporary/Test Code — What to Remove Before Production
Search for and remove or restrict these items before going live:
- Any test pages like [backend/test-razorpay.html](backend/test-razorpay.html) — remove or restrict to dev-only branch.
- Temporary routes such as `/payment/test`, `/payment/mock`, or routes used for quick manual testing. Remove or guard behind admin-only auth.
- Hard-coded API keys or secrets in repository or config files — move to environment variables (e.g., `process.env.RAZORPAY_KEY_ID`, `process.env.RAZORPAY_KEY_SECRET`).
- Mock payment handlers that bypass signature verification (e.g., `if (process.env.NODE_ENV==='development') return success`) — remove or keep strictly in test environment.
- Console logs that print secrets or full provider payloads.

Specifically check these files in this repo for cleanup:
- [backend/test-razorpay.html](backend/test-razorpay.html)
- [backend/config/razorpay.js](backend/config/razorpay.js)

## Migration / DB Notes
- Add a `Payments`/`Transactions` collection/table storing: `orderId`, `userId`, `providerOrderId`, `providerPaymentId`, `amount`, `currency`, `status`, `rawResponse`, `createdAt`, `updatedAt`.
- Update `Order` model to reference the payment transaction id and include status flags: `pending`, `paid`, `failed`, `refunded`.

## Checkout Edge Cases
- Partial failures: payment captured but order update failed — reconcile using webhooks and daily audits.
- Duplicate webhooks or payment events — dedupe using `paymentId` or `eventId`.
- Refunds and chargebacks — model lifecycle to support `refunded` and `disputed` states.

## Pre-Production Checklist
- Replace test keys with live keys in environment variables.
- Register production webhook URL with provider and update webhook secret.
- Ensure `create-order` and `verify` endpoints are authenticated and rate-limited.
- Audit logs for sensitive info are disabled/rotated.
- Run end-to-end test using a staging environment and test cards.

## Quick FAQs / Developer Inquiries
- Q: Which keys belong on client vs server? A: Public/publishable keys may be used in client for SDK initialization; secret keys must never be on client.
- Q: Do I need webhooks? A: Yes — webhooks ensure asynchronous events like captures and refunds are reliably communicated.
- Q: How to handle failures? A: Retry on transient errors, mark orders for manual review on repeated failures, and reconcile via webhook logs.

## Next Steps I Can Do For You
- Search this repo for temporary payment routes and test pages and open a patch to remove/guard them.
- Implement `controllers/paymentController.js` skeleton and routes in `routes/payment.js`.
- Add DB `Payment` model and migration script.

---
If you want, I can now scan the repository to list exact files/routings to update or remove. Want me to do that?

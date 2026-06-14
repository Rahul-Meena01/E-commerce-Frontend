/*
 * config/razorpay.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialises the Razorpay SDK and exports a single shared instance.
 *
 * Required .env keys:
 *   RAZORPAY_KEY_ID      — your Razorpay key id  (starts with "rzp_test_" or "rzp_live_")
 *   RAZORPAY_KEY_SECRET  — your Razorpay key secret
 *
 * Fixes applied:
 *   FIX 1 — Added startup validation. Previously, missing env vars would create
 *            a Razorpay instance that silently accepts calls at init time but then
 *            fails at runtime with a cryptic authentication error. Now the server
 *            refuses to boot if either key is missing, with a clear message.
 */

import Razorpay    from "razorpay";
import "dotenv/config";

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

// FIX 1: Fail fast at startup rather than silently at the first API call
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error(
    "[razorpay.js] RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env\n" +
    "  Get your keys from: https://dashboard.razorpay.com/app/keys"
  );
}

const razorpay = new Razorpay({
  key_id:     RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

export default razorpay;
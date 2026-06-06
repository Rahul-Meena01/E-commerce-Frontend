import { CURRENCY } from "@/constants/currency";

/**
 * Single source of truth for formatting prices across the storefront.
 * Standards:
 * - Uses en-IN locale for Indian Rupee format.
 * - Displays 2 decimal places if the number has a fractional part (e.g. ₹899.10).
 * - Displays 0 decimal places if the number is an integer (e.g. ₹999) to keep a clean luxury layout.
 * 
 * @param {number|string} amount - The price amount to format
 * @returns {string} The formatted price string (e.g., "₹1,500")
 */
export const formatPrice = (amount) => {
  if (amount === undefined || amount === null) return "";
  const val = Number(amount);
  if (isNaN(val)) return "";
  
  const hasDecimals = val % 1 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCY.code,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(val);
};

export default formatPrice;

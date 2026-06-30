import { COLORS, STYLES, renderButton } from "../utils.js";

/**
 * Generates the inner HTML for the Shipping Confirmation email.
 * @param {Object} order - Order object.
 * @returns {string} Inner HTML for the template.
 */
export const shippingConfirmationTemplate = (order) => {
  const shortId = order.shortId || (order._id ? order._id.toString().slice(-6).toUpperCase() : "N/A");
  const trackUrl = `${process.env.FRONTEND_URL || "http://localhost:5174"}/orders/${order._id}`;
  
  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          <h1 style="${STYLES.h1}">Your Order has Shipped</h1>
          <p style="${STYLES.subtitle}">
            Order <strong>#${shortId}</strong> is on its way.
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="line-height: 1.8; font-size: 14px; color: ${COLORS.textDark}; margin-bottom: 35px;">
      <tr>
        <td>
          <p>Hello ${order.user?.name || "Customer"},</p>
          <p>Great news! Your order has been shipped and is currently in transit. You can track its journey using the link below.</p>
        </td>
      </tr>
    </table>

    <!-- CTA Actions -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          ${renderButton("Track Package", trackUrl, true)}
        </td>
      </tr>
    </table>
  `;
};

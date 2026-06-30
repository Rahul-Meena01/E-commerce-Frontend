import { COLORS, STYLES, renderButton, renderDivider } from "../utils.js";

/**
 * Format a number to currency string (INR).
 * @param {number} amount 
 * @returns {string} Formatted price
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Helper to ensure image URLs are absolute.
 * @param {string} imagePath 
 * @returns {string} Absolute image URL
 */
const getAbsoluteImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const slash = imagePath.startsWith("/") ? "" : "/";
  return `${baseUrl}${slash}${imagePath}`;
};

/**
 * Generates the inner HTML for the Order Confirmation email.
 * @param {Object} order - Fully populated order object.
 * @returns {string} Inner HTML for the template.
 */
export const orderConfirmationTemplate = (order) => {
  const shortId = order.shortId || (order._id ? order._id.toString().slice(-6).toUpperCase() : "N/A");
  const formattedDate = new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const trackUrl = `${process.env.FRONTEND_URL || "http://localhost:5174"}/orders/${order._id}`;
  const shopUrl = `${process.env.FRONTEND_URL || "http://localhost:5174"}/shop`;

  // Item list rendering
  const itemsHtml = (order.orderItems || []).map((item) => {
    const finalPrice = Number(item.price) || 0;
    const unitPrice = finalPrice / (item.qty || 1);
    const itemImage = getAbsoluteImageUrl(item.image);
    
    return `
      <tr style="border-bottom: 1px solid ${COLORS.borderGray};">
        <td style="padding: 15px 0; vertical-align: top; width: 80px;">
          ${itemImage ? `<img src="${itemImage}" alt="${item.name}" width="70" style="border: 1px solid ${COLORS.borderGray}; width: 70px; height: auto; object-fit: cover;" />` : ""}
        </td>
        <td style="padding: 15px 10px; vertical-align: top; font-size: 14px; line-height: 1.5;">
          <div style="font-weight: 500; color: ${COLORS.black};">${item.name}</div>
          <div style="font-size: 12px; color: ${COLORS.textMuted}; margin-top: 4px;">Qty: ${item.qty}</div>
        </td>
        <td style="padding: 15px 0; vertical-align: top; text-align: right; font-size: 14px; font-weight: 500; color: ${COLORS.black}; width: 100px;">
          ${formatCurrency(finalPrice)}
        </td>
      </tr>
    `;
  }).join("");

  return `
    <!-- Header Message -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          <h1 style="${STYLES.h1}">Thank you for your order!</h1>
          <p style="${STYLES.subtitle}">
            Your order <strong>#${shortId}</strong> has been successfully placed.<br />
            We are preparing it with care.
          </p>
        </td>
      </tr>
    </table>

    <!-- Order Summary Panel -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.lightGray}; padding: 20px; margin-bottom: 30px; border: 1px solid ${COLORS.borderGray};">
      <tr>
        <td style="font-size: 13px; line-height: 1.8; color: ${COLORS.textDark};">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-weight: bold; width: 130px; vertical-align: top; text-transform: uppercase; font-size: 11px; color: ${COLORS.textMuted};">Order Number:</td>
              <td>#${shortId}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; vertical-align: top; text-transform: uppercase; font-size: 11px; color: ${COLORS.textMuted};">Placed On:</td>
              <td>${formattedDate}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; vertical-align: top; text-transform: uppercase; font-size: 11px; color: ${COLORS.textMuted};">Payment:</td>
              <td>${order.paymentMethod} (${order.isPaid ? "Paid" : "Pending"})</td>
            </tr>
            <tr>
              <td style="font-weight: bold; vertical-align: top; text-transform: uppercase; font-size: 11px; color: ${COLORS.textMuted};">Order Status:</td>
              <td style="color: ${COLORS.gold}; font-weight: 500;">${order.orderStatus}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Purchased Items -->
    <h3 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: ${COLORS.black}; margin-bottom: 10px;">Purchased Items</h3>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
      ${itemsHtml}
    </table>

    <!-- Shipping & Pricing Grid -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
      <tr>
        <!-- Shipping Details Column -->
        <td style="vertical-align: top; width: 48%; padding-right: 4%;">
          <h3 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: ${COLORS.black}; margin-bottom: 10px;">Shipping Destination</h3>
          <p style="font-size: 13px; line-height: 1.6; color: ${COLORS.textDark}; margin: 0;">
            <strong>${order.user?.name || "Customer"}</strong><br />
            ${order.shippingAddress?.address}<br />
            ${order.shippingAddress?.city}, ${order.shippingAddress?.postalCode}<br />
            ${order.shippingAddress?.country}<br />
            ${order.user?.phone ? `Phone: ${order.user.phone}` : ""}
          </p>
        </td>
        
        <!-- Pricing Breakdown Column -->
        <td style="vertical-align: top; width: 48%;">
          <h3 style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: ${COLORS.black}; margin-bottom: 10px;">Price Summary</h3>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; line-height: 1.8;">
            <tr>
              <td style="color: ${COLORS.textMuted};">Subtotal:</td>
              <td style="text-align: right; color: ${COLORS.textDark};">${formatCurrency(order.itemsPrice || 0)}</td>
            </tr>
            ${order.couponDiscount > 0 ? `
            <tr>
              <td style="color: ${COLORS.textMuted};">Promo Discount:</td>
              <td style="text-align: right; color: #d9534f;">-${formatCurrency(order.couponDiscount)}</td>
            </tr>` : ""}
            ${order.giftCardDiscount > 0 ? `
            <tr>
              <td style="color: ${COLORS.textMuted};">Gift Card Credit:</td>
              <td style="text-align: right; color: #d9534f;">-${formatCurrency(order.giftCardDiscount)}</td>
            </tr>` : ""}
            <tr>
              <td style="color: ${COLORS.textMuted};">Shipping:</td>
              <td style="text-align: right; color: ${COLORS.textDark};">${order.shippingPrice > 0 ? formatCurrency(order.shippingPrice) : "Free"}</td>
            </tr>
            <tr>
              <td style="color: ${COLORS.textMuted};">Tax (GST):</td>
              <td style="text-align: right; color: ${COLORS.textDark};">${formatCurrency(order.taxPrice || 0)}</td>
            </tr>
            <tr style="border-top: 1px solid ${COLORS.borderGray};">
              <td style="font-weight: 600; padding-top: 10px; color: ${COLORS.black};">Total Price:</td>
              <td style="text-align: right; font-weight: 600; padding-top: 10px; color: ${COLORS.black}; font-size: 16px;">
                ${formatCurrency(order.totalPrice || 0)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Estimated Delivery Notice -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.lightGray}; padding: 15px; margin-bottom: 30px; text-align: center; border: 1px dashed ${COLORS.gold};">
      <tr>
        <td style="font-size: 13px; color: ${COLORS.textDark}; font-weight: 500;">
          Estimated Delivery: <span style="color: ${COLORS.gold}; font-weight: bold;">3–7 Business Days</span>
        </td>
      </tr>
    </table>

    <!-- CTA Actions -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin-bottom: 40px;">
      <tr>
        <td>
          ${renderButton("Track Order", trackUrl, true)}
          ${renderButton("Continue Shopping", shopUrl, false)}
        </td>
      </tr>
    </table>

    ${renderDivider()}

    <!-- Support Section -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin-top: 30px; font-size: 13px; line-height: 1.6; color: ${COLORS.textMuted};">
      <tr>
        <td>
          <p style="margin: 0; font-weight: 600; color: ${COLORS.black}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.15em;">Need assistance?</p>
          <p style="margin: 5px 0 0 0;">
            Our customer service desk is here to help.<br />
            Email: <a href="mailto:support@loft.com" style="color: ${COLORS.black}; text-decoration: underline;">support@loft.com</a> &nbsp;|&nbsp; Phone: +91 99999 99999
          </p>
        </td>
      </tr>
    </table>
  `;
};

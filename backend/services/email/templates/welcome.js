import { COLORS, STYLES, renderButton } from "../utils.js";

/**
 * Generates the inner HTML for the Welcome email.
 * @param {Object} user - User object.
 * @returns {string} Inner HTML for the template.
 */
export const welcomeTemplate = (user) => {
  const shopUrl = `${process.env.FRONTEND_URL || "http://localhost:5174"}/shop`;
  
  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          <h1 style="${STYLES.h1}">Welcome to LOFT</h1>
          <p style="${STYLES.subtitle}">
            Thank you for registering with LOFT Store.<br />
            We are excited to have you on board.
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="line-height: 1.8; font-size: 14px; color: ${COLORS.textDark}; margin-bottom: 35px;">
      <tr>
        <td>
          <p>Hello ${user.name || "there"},</p>
          <p>Welcome to LOFT, where curated fashion meets timeless design. Your account has been successfully created, and you now have access to a personalized shopping experience.</p>
          <p>Explore our latest arrivals, manage your wishlist, track your orders, and enjoy early access to seasonal edits.</p>
        </td>
      </tr>
    </table>

    <!-- CTA Actions -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          ${renderButton("Explore Collections", shopUrl, true)}
        </td>
      </tr>
    </table>
  `;
};

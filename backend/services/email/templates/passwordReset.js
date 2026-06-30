import { COLORS, STYLES, renderButton } from "../utils.js";

/**
 * Generates the inner HTML for the Password Reset email.
 * @param {Object} data - Contains resetLink and name.
 * @returns {string} Inner HTML for the template.
 */
export const passwordResetTemplate = (data) => {
  return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          <h1 style="${STYLES.h1}">Reset Your Password</h1>
          <p style="${STYLES.subtitle}">
            We received a request to reset your LOFT password.
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="line-height: 1.8; font-size: 14px; color: ${COLORS.textDark}; margin-bottom: 35px;">
      <tr>
        <td>
          <p>Hello ${data.name || "Customer"},</p>
          <p>Please click the button below to reset your password. This link is valid for 1 hour.</p>
        </td>
      </tr>
    </table>

    <!-- CTA Actions -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          ${renderButton("Reset Password", data.resetLink, true)}
        </td>
      </tr>
    </table>
  `;
};

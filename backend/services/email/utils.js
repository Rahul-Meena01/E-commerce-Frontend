/**
 * LOFT Email Service Utilities & Component Templates
 * 
 * Provides visual tokens, layout wrappers, and reusable UI components
 * for transactional emails matching the LOFT luxury brand aesthetic.
 */

// Brand Palette
export const COLORS = {
  white: "#ffffff",
  black: "#000000",
  gold: "#b8977e",      // Soft gold
  lightGray: "#f9f9f9", // Very light gray for panels
  borderGray: "#eaeaea", // Subtle dividers
  textDark: "#111111",  // Premium dark text
  textMuted: "#666666", // Secondary labels
};

// Common Inline Styles
export const STYLES = {
  container: `max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${COLORS.textDark}; background-color: ${COLORS.white};`,
  headerLogo: `font-size: 28px; font-weight: 300; letter-spacing: 0.15em; text-align: center; text-transform: uppercase; margin-bottom: 30px; border-bottom: 1px solid ${COLORS.borderGray}; padding-bottom: 20px;`,
  footer: `margin-top: 50px; border-top: 1px solid ${COLORS.borderGray}; padding-top: 30px; text-align: center; font-size: 12px; color: ${COLORS.textMuted}; line-height: 1.8;`,
  divider: `height: 1px; background-color: ${COLORS.borderGray}; margin: 25px 0; border: none;`,
  h1: `font-size: 24px; font-weight: 300; letter-spacing: 0.05em; text-align: center; margin: 0 0 10px 0; text-transform: uppercase; color: ${COLORS.black};`,
  subtitle: `font-size: 14px; font-weight: 400; text-align: center; margin: 0 0 30px 0; color: ${COLORS.textMuted}; line-height: 1.6;`,
  buttonPrimary: `display: inline-block; padding: 14px 28px; background-color: ${COLORS.black}; color: ${COLORS.white}; text-decoration: none; text-transform: uppercase; font-size: 13px; font-weight: 500; letter-spacing: 0.1em; text-align: center; border-radius: 0; margin: 10px 5px; min-width: 160px;`,
  buttonSecondary: `display: inline-block; padding: 13px 27px; background-color: ${COLORS.white}; color: ${COLORS.black}; border: 1px solid ${COLORS.black}; text-decoration: none; text-transform: uppercase; font-size: 13px; font-weight: 500; letter-spacing: 0.1em; text-align: center; border-radius: 0; margin: 10px 5px; min-width: 160px;`,
};

/**
 * Wraps dynamic body content inside the standard LOFT brand template.
 * @param {string} contentHtml - The inner HTML content of the email.
 * @param {string} previewText - Hidden text shown in email clients' inbox previews.
 * @returns {string} Fully structured and styled HTML email string.
 */
export const wrapBaseLayout = (contentHtml, previewText = "") => {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LOFT Store</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #fafafa;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      display: block;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td {
      mso-line-height-rule: exactly;
    }
    a {
      color: ${COLORS.black};
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; -webkit-font-smoothing: antialiased;">
  <!-- Preview Text -->
  <div style="display: none; font-size: 1px; color: #333333; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${previewText}
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafafa; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Container Table (600px Max) -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${COLORS.white}; border: 1px solid #eeeeee;">
          <!-- Content Padding Wrapper -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Brand Header -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="${STYLES.headerLogo}">
                    <a href="${process.env.FRONTEND_URL || "http://localhost:5174"}" style="text-decoration: none; color: ${COLORS.black}; letter-spacing: 0.25em;">L O F T</a>
                  </td>
                </tr>
              </table>

              <!-- Main Content Body -->
              ${contentHtml}

              <!-- Brand Footer -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="${STYLES.footer}">
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <p style="margin: 0; font-size: 13px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: ${COLORS.black};">Thank you for choosing LOFT.</p>
                    <p style="margin: 5px 0 0 0; font-style: italic; color: ${COLORS.gold};">Premium Fashion. Timeless Design.</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding: 0 10px;">
                          <a href="${process.env.FRONTEND_URL || "http://localhost:5174"}/info/privacy" style="text-decoration: none; color: ${COLORS.textMuted};">Privacy Policy</a>
                        </td>
                        <td style="color: ${COLORS.textMuted};">•</td>
                        <td style="padding: 0 10px;">
                          <a href="${process.env.FRONTEND_URL || "http://localhost:5174"}/info/terms" style="text-decoration: none; color: ${COLORS.textMuted};">Terms & Conditions</a>
                        </td>
                        <td style="color: ${COLORS.textMuted};">•</td>
                        <td style="padding: 0 10px;">
                          <a href="${process.env.FRONTEND_URL || "http://localhost:5174"}/faq" style="text-decoration: none; color: ${COLORS.textMuted};">Support</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; color: #999999;">
                    &copy; ${new Date().getFullYear()} LOFT. All rights reserved.
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Renders a call-to-action button layout.
 * @param {string} label - Button text.
 * @param {string} url - Target URL.
 * @param {boolean} isPrimary - Whether it's a primary (black) or secondary (white/bordered) button.
 * @returns {string} Styled button HTML segment.
 */
export const renderButton = (label, url, isPrimary = true) => {
  const style = isPrimary ? STYLES.buttonPrimary : STYLES.buttonSecondary;
  return `
    <a href="${url}" target="_blank" style="${style}">${label}</a>
  `.trim();
};

/**
 * Renders a separator divider line.
 * @returns {string} Divider HTML segment.
 */
export const renderDivider = () => {
  return `<hr style="${STYLES.divider}" />`;
};

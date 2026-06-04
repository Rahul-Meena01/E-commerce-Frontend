import nodemailer from "nodemailer";
import CURRENCY_CONFIG from "../config/currency.js";
import env from "../config/env.js";


/**
 * Get nodemailer transporter.
 * If SMTP details are not configured, uses a mock/test JSON transport or logs to console.
 */
const getTransporter = async () => {
  const host = env.SMTP_HOST;
  const port = env.SMTP_PORT;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;

  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });
  }

  // Fallback: create a test account or use jsonTransport
  return nodemailer.createTransport({
    jsonTransport: true,
  });
};

/**
 * Send order confirmation email with premium Loft branding.
 */
export const sendOrderConfirmationEmail = async ({
  customerName,
  customerEmail,
  orderId,
  shortId,
  orderItems,
  amountPaid,
  shippingAddress,
}) => {
  try {
    const transporter = await getTransporter();

    const itemsHtml = orderItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee;">
            <div style="font-weight: 600; color: #1a1a1a;">${item.name}</div>
            <div style="font-size: 12px; color: #777777;">Qty: ${item.qty}</div>
          </td>
          <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #eeeeee; font-weight: 600; color: #1a1a1a;">
            ${CURRENCY_CONFIG.symbol}${(item.price * item.qty).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join("");

    const addressString = `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.postalCode}, ${shippingAddress.country}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmed - LOFT</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border: 1px solid #e5e5e5;
            padding: 40px;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #eeeeee;
            padding-bottom: 20px;
          }
          .logo {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 4px;
            color: #1a1a1a;
            text-decoration: none;
            margin: 0;
          }
          .title {
            font-size: 20px;
            font-weight: 400;
            color: #1a1a1a;
            margin-top: 30px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .order-number {
            font-size: 14px;
            color: #777777;
            margin-bottom: 30px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .totals-section {
            border-top: 2px solid #1a1a1a;
            padding-top: 15px;
            margin-bottom: 30px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 18px;
            font-weight: 700;
            color: #1a1a1a;
          }
          .address-card {
            background-color: #f7f7f7;
            padding: 20px;
            border-radius: 4px;
            margin-bottom: 30px;
            font-size: 14px;
            color: #555555;
            line-height: 1.6;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #999999;
            border-top: 1px solid #eeeeee;
            padding-top: 20px;
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">LOFT</h1>
          </div>
          
          <div class="title">Thank you for your order</div>
          <div class="order-number">Order Ref: <strong>${shortId || orderId}</strong></div>
          
          <p style="font-size: 15px; color: #555555; line-height: 1.6;">
            Hi ${customerName},<br>
            We've received your payment and your order is now being processed. Here is your order confirmation detail:
          </p>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left; padding-bottom: 10px; border-bottom: 2px solid #eeeeee; color: #777777; font-size: 12px; text-transform: uppercase;">Product</th>
                <th style="text-align: right; padding-bottom: 10px; border-bottom: 2px solid #eeeeee; color: #777777; font-size: 12px; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="totals-section">
            <div class="total-row">
              <span>Amount Paid</span>
              <span>${CURRENCY_CONFIG.symbol}${amountPaid.toFixed(2)}</span>
            </div>
          </div>
          
          <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 10px; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Shipping Address</div>
          <div class="address-card">
            <strong>${customerName}</strong><br>
            ${addressString}
          </div>
          
          <p style="font-size: 14px; color: #777777; line-height: 1.6; text-align: center; margin-top: 40px;">
            If you have any questions, please reply directly to this email or contact support.
          </p>
          
          <div class="footer">
            &copy; ${new Date().getFullYear()} LOFT Premium E-commerce. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: env.SMTP_FROM,
      to: customerEmail,
      subject: `Order Confirmed: ${shortId || orderId}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    // If using mock jsonTransport, print the email contents nicely to log
    if (transporter.options.jsonTransport) {
      console.log("=== MOCK EMAIL SENT ===");
      console.log(`To: ${customerEmail}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(`Amount: ${CURRENCY_CONFIG.symbol}${amountPaid}`);
      console.log(`ShortId: ${shortId}`);
      console.log("=======================");
    } else {
      console.log(`Order confirmation email sent successfully to ${customerEmail}. Message ID: ${info.messageId}`);
    }

    return { success: true, messageId: info.messageId || "mock-id" };
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    return { success: false, error: error.message };
  }
};

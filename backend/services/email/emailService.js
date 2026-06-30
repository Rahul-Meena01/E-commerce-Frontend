import nodemailer from "nodemailer";
import { wrapBaseLayout } from "./utils.js";
import { orderConfirmationTemplate } from "./templates/orderConfirmation.js";
import { welcomeTemplate } from "./templates/welcome.js";
import { shippingConfirmationTemplate } from "./templates/shippingConfirmation.js";
import { passwordResetTemplate } from "./templates/passwordReset.js";
import Order from "../../models/Order.js";

/**
 * Sends a generic HTML email.
 * @param {Object} params - { to, subject, html, previewText }
 */
export const sendEmail = async ({ to, subject, html, previewText = "" }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.mailtrap.io",
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"LOFT" <${process.env.SMTP_FROM_EMAIL || "noreply@loft.com"}>`,
      to,
      subject,
      html: wrapBaseLayout(html, previewText),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("[EmailService] Email sent successfully: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("[EmailService] Error sending email:", error);
    return null;
  }
};

/**
 * Sends an order confirmation email to the customer.
 * Uses atomic check-and-set idempotency on Order.emailSent to prevent duplicate sends.
 * @param {string|Object} orderOrId - Order model instance or Order ID.
 */
export const sendOrderConfirmationEmail = async (orderOrId) => {
  try {
    let order;
    if (typeof orderOrId === "string" || orderOrId instanceof Object === false || !orderOrId.populate) {
      order = await Order.findById(orderOrId);
    } else {
      order = orderOrId;
    }

    if (!order) {
      console.warn("[EmailService] Order not found for email confirmation:", orderOrId);
      return null;
    }

    // 1. Idempotency safety check
    if (order.emailSent) {
      console.log(`[EmailService] Order confirmation already sent for order #${order._id}. Skipping.`);
      return null;
    }

    // 2. Ensure customer user details are populated
    if (!order.user || !order.user.email) {
      await order.populate("user", "id name email phone");
    }

    if (!order.user || !order.user.email) {
      console.error("[EmailService] Order user email missing, cannot send confirmation.");
      return null;
    }

    // 3. Mark the email as sent immediately to prevent concurrent race conditions
    // (using findOneAndUpdate atomic update to prevent race condition between verify and webhook)
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, emailSent: false },
      { $set: { emailSent: true } },
      { new: true }
    );

    if (!updatedOrder) {
      // If no document was updated, it means emailSent was already set to true by another thread
      console.log(`[EmailService] Race condition detected: Order confirmation already sent for order #${order._id}. Skipping.`);
      return null;
    }

    // Populate user details for the template rendering
    await updatedOrder.populate("user", "id name email phone");

    const shortId = updatedOrder.shortId || updatedOrder._id.toString().slice(-6).toUpperCase();
    const subject = `Your LOFT Order #${shortId} has been placed`;
    const previewText = `Your order #${shortId} has been successfully placed. We're preparing it with care.`;
    
    // 4. Generate the order confirmation template
    const templateHtml = orderConfirmationTemplate(updatedOrder);

    // 5. Send email asynchronously
    return await sendEmail({
      to: updatedOrder.user.email,
      subject,
      html: templateHtml,
      previewText,
    });
  } catch (error) {
    console.error("[EmailService] Failed to execute sendOrderConfirmationEmail workflow:", error);
    return null;
  }
};

/**
 * Sends a welcome email to a new user.
 * @param {Object} user - Registered user object.
 */
export const sendWelcomeEmail = async (user) => {
  if (!user || !user.email) return null;
  try {
    const subject = "Welcome to LOFT";
    const previewText = "Thank you for registering with LOFT Store.";
    const templateHtml = welcomeTemplate(user);

    return await sendEmail({
      to: user.email,
      subject,
      html: templateHtml,
      previewText,
    });
  } catch (error) {
    console.error("[EmailService] Failed to send welcome email:", error);
    return null;
  }
};

/**
 * Sends a password reset email.
 * @param {Object} user - User object.
 * @param {string} resetLink - Absolute reset password URL.
 */
export const sendPasswordResetEmail = async (user, resetLink) => {
  if (!user || !user.email) return null;
  try {
    const subject = "Reset your LOFT Password";
    const previewText = "Please click the button to reset your password.";
    const templateHtml = passwordResetTemplate({ name: user.name, resetLink });

    return await sendEmail({
      to: user.email,
      subject,
      html: templateHtml,
      previewText,
    });
  } catch (error) {
    console.error("[EmailService] Failed to send password reset email:", error);
    return null;
  }
};

/**
 * Sends a shipping confirmation email.
 * @param {Object} order - Order object.
 */
export const sendShippingConfirmationEmail = async (order) => {
  if (!order || !order.user || !order.user.email) return null;
  try {
    const shortId = order.shortId || order._id.toString().slice(-6).toUpperCase();
    const subject = `Your LOFT Order #${shortId} has shipped`;
    const previewText = `Your order #${shortId} is on its way.`;
    const templateHtml = shippingConfirmationTemplate(order);

    return await sendEmail({
      to: order.user.email,
      subject,
      html: templateHtml,
      previewText,
    });
  } catch (error) {
    console.error("[EmailService] Failed to send shipping confirmation email:", error);
    return null;
  }
};

export default sendEmail;


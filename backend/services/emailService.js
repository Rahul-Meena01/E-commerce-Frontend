import {
  sendEmail as newSendEmail,
  sendWelcomeEmail as newSendWelcomeEmail,
  sendOrderConfirmationEmail as newSendOrderConfirmationEmail,
  sendShippingConfirmationEmail as newSendShippingConfirmationEmail,
  sendPasswordResetEmail as newSendPasswordResetEmail,
} from "./email/emailService.js";

export const sendEmail = newSendEmail;
export const sendWelcomeEmail = newSendWelcomeEmail;
export const sendOrderConfirmationEmail = newSendOrderConfirmationEmail;
export const sendShippingConfirmationEmail = newSendShippingConfirmationEmail;
export const sendPasswordResetEmail = newSendPasswordResetEmail;

export default newSendEmail;

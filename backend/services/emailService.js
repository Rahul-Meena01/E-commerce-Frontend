import nodemailer from "nodemailer";

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.mailtrap.io",
      port: process.env.SMTP_PORT || 2525,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"LOFT Store" <${process.env.SMTP_FROM_EMAIL || "noreply@loft.com"}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    // Don't throw error to prevent breaking the main flow (e.g. registration shouldn't fail if email fails)
    return null;
  }
};

export const sendWelcomeEmail = async (user) => {
  const subject = "Welcome to LOFT Store!";
  const html = `
    <h1>Welcome, ${user.name}!</h1>
    <p>Thank you for registering with LOFT Store.</p>
    <p>We are excited to have you on board.</p>
  `;
  return sendEmail({ to: user.email, subject, html });
};

export default sendEmail;

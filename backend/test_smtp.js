import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const testSMTP = async () => {
  try {
    console.log("SMTP HOST:", process.env.SMTP_HOST);
    console.log("SMTP PORT:", process.env.SMTP_PORT);
    console.log("SMTP USER:", process.env.SMTP_USER);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.mailtrap.io",
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"LOFT Test" <${process.env.SMTP_FROM_EMAIL || "noreply@loft.com"}>`,
      to: "rahulmeena3401@gmail.com",
      subject: "Test SMTP Connection",
      text: "If you get this, SMTP is working!",
    });

    console.log("Message sent:", info.messageId);
  } catch (error) {
    console.error("SMTP error:", error);
  }
};

testSMTP();

import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,             // smtp.gmail.com
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465, // false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,           // your@gmail.com
    pass: process.env.SMTP_PASS,           // 16-char app password
  },
  // keep while debugging
  logger: true,
  debug: true,
});

export async function sendMail({ to, subject, html, text, attachments } = {}) {
  return mailer.sendMail({
    from: process.env.MAIL_FROM || `"FAITH CommUNITY" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
    attachments,
  });
}

export default sendMail;

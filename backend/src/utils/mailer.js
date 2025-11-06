import nodemailer from "nodemailer";

function isSMTPConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function getSMTPStatus() {
  const configured = isSMTPConfigured();
  const missing = [];
  
  if (!process.env.SMTP_HOST) missing.push('SMTP_HOST');
  if (!process.env.SMTP_USER) missing.push('SMTP_USER');
  if (!process.env.SMTP_PASS) missing.push('SMTP_PASS');
  
  return {
    configured,
    missing,
    host: process.env.SMTP_HOST || 'not set',
    port: process.env.SMTP_PORT || '587 (default)',
    user: process.env.SMTP_USER || 'not set',
  };
}

let mailer = null;

function createTransporter() {
  if (!isSMTPConfigured()) {
    return null;
  }

  try {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  } catch (error) {
    console.error('❌ Failed to create SMTP transporter:', error.message);
    return null;
  }
}

mailer = createTransporter();

export async function verifySMTPConnection() {
  if (!mailer) {
    const status = getSMTPStatus();
    console.error('❌ SMTP not configured. Missing:', status.missing.join(', '));
    return false;
  }

  try {
    await mailer.verify();
    console.log('✅ SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ SMTP verification failed:', error.message);
    if (error.code === 'EAUTH' || error.message.includes('Invalid login') || error.message.includes('BadCredentials')) {
      console.error('   → Authentication failed. Check SMTP_USER and SMTP_PASS');
      console.error('   → For Gmail, use an App Password (not your regular password)');
    }
    return false;
  }
}

export async function sendMail({ to, subject, html, text, attachments } = {}) {
  if (!isSMTPConfigured()) {
    const status = getSMTPStatus();
    const error = new Error(`SMTP not configured. Missing: ${status.missing.join(', ')}`);
    error.code = 'SMTP_NOT_CONFIGURED';
    error.status = status;
    throw error;
  }

  if (!mailer) {
    mailer = createTransporter();
    if (!mailer) {
      const error = new Error('Failed to create SMTP transporter');
      error.code = 'SMTP_TRANSPORTER_FAILED';
      throw error;
    }
  }

  if (!to) {
    throw new Error('Email recipient (to) is required');
  }
  if (!subject) {
    throw new Error('Email subject is required');
  }

  try {
    const result = await mailer.sendMail({
      from: process.env.MAIL_FROM || `"FAITH CommUNITY" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
      attachments,
    });

    return result;
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error;
  }
}

export { mailer };
export default sendMail;
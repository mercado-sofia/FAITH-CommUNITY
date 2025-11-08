import nodemailer from "nodemailer";

function isSMTPConfigured() {
  return !!(
    process.env.SMTP_HOST?.trim() && 
    process.env.SMTP_USER?.trim() && 
    process.env.SMTP_PASS?.trim()
  );
}

export function getSMTPStatus() {
  const configured = isSMTPConfigured();
  const missing = [];
  
  // Check if each variable is set and not empty (after trimming whitespace)
  if (!process.env.SMTP_HOST?.trim()) missing.push('SMTP_HOST');
  if (!process.env.SMTP_USER?.trim()) missing.push('SMTP_USER');
  if (!process.env.SMTP_PASS?.trim()) missing.push('SMTP_PASS');
  
  return {
    configured,
    missing,
    host: process.env.SMTP_HOST?.trim() || 'not set',
    port: process.env.SMTP_PORT || '587 (default)',
    user: process.env.SMTP_USER?.trim() || 'not set',
  };
}

let mailer = null;

function createTransporter() {
  if (!isSMTPConfigured()) {
    return null;
  }

  try {
    // Configurable timeout values (default: 60 seconds for better reliability)
    const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT) || 60000;
    const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT) || 60000;
    const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT) || 60000;
    
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: connectionTimeout,
      greetingTimeout: greetingTimeout,
      socketTimeout: socketTimeout,
      // Additional options for better connection handling
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
    });
  } catch (error) {
    console.error('❌ Failed to create SMTP transporter:', error.message);
    return null;
  }
}

mailer = createTransporter();

export async function verifySMTPConnection(retries = 2) {
  if (!mailer) {
    const status = getSMTPStatus();
    const missingList = status.missing.length > 0 
      ? status.missing.join(', ') 
      : 'SMTP_HOST, SMTP_USER, SMTP_PASS';
    console.error('❌ SMTP not configured. Missing:', missingList);
    return false;
  }

  const maxRetries = retries;
  const verificationTimeout = Number(process.env.SMTP_VERIFICATION_TIMEOUT) || 60000; // 60 seconds default
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`   → Retrying SMTP verification (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Use Promise.race to add a custom timeout wrapper
      const verifyPromise = mailer.verify();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`SMTP verification timeout after ${verificationTimeout}ms`));
        }, verificationTimeout);
      });
      
      await Promise.race([verifyPromise, timeoutPromise]);
      if (attempt > 0) {
        console.log('✅ SMTP verification succeeded after retry');
      }
      return true;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      
      if (!isLastAttempt) {
        // Don't log full error on retries, just continue
        continue;
      }
      
      // Only log full error details on final failure
      console.error('❌ SMTP verification failed:', error.message);
      
      // Show current configuration
      const status = getSMTPStatus();
      console.error(`   → Current config: ${status.host}:${status.port} (user: ${status.user})`);
      console.error(`   → Timeout used: ${verificationTimeout}ms`);
      
      // Handle specific error types
      if (error.code === 'EAUTH' || error.message.includes('Invalid login') || error.message.includes('BadCredentials')) {
        console.error('   → Authentication failed. Check SMTP_USER and SMTP_PASS');
        console.error('   → For Gmail, use an App Password (not your regular password)');
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT') || error.code === 'ETIMEDOUT') {
        console.error('   → Connection timeout. Possible issues:');
        console.error('      • SMTP_HOST is incorrect or unreachable');
        console.error('      • SMTP_PORT is incorrect (common ports: 587, 465, 25)');
        console.error('      • Firewall or network blocking SMTP connection');
        console.error('      • SMTP server is down or slow to respond');
        console.error(`   → Try increasing timeout: SMTP_VERIFICATION_TIMEOUT=90000 (current: ${verificationTimeout}ms)`);
        console.error('   → Or skip verification in development: Set SMTP_SKIP_VERIFY=true');
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        console.error('   → Connection refused. Check:');
        console.error('      • SMTP_HOST and SMTP_PORT are correct');
        console.error('      • SMTP server is running and accessible');
        console.error('      • Network/firewall allows outbound connections on SMTP port');
      } else if (error.code === 'ENOTFOUND' || error.message.includes('ENOTFOUND')) {
        console.error('   → Host not found. Check SMTP_HOST is correct');
      }
      
      return false;
    }
  }
  
  return false;
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
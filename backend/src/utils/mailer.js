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
    
    const port = Number(process.env.SMTP_PORT) || 587;
    const isSecurePort = port === 465;
    
    // Gmail and most SMTP servers on port 587 require TLS
    const requireTLS = !isSecurePort && (process.env.SMTP_REQUIRE_TLS !== 'false');
    
    const transportConfig = {
      host: process.env.SMTP_HOST?.trim(),
      port: port,
      secure: isSecurePort, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS?.trim(),
      },
      connectionTimeout: connectionTimeout,
      greetingTimeout: greetingTimeout,
      socketTimeout: socketTimeout,
      // TLS configuration for port 587 (STARTTLS)
      requireTLS: requireTLS,
      tls: {
        // Don't reject unauthorized certificates (useful for self-signed or corporate proxies)
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
      },
      // Connection pooling - disabled for verification to avoid connection issues
      pool: process.env.SMTP_USE_POOL === 'true',
      maxConnections: 1,
      maxMessages: 3,
      // Debug mode (set SMTP_DEBUG=true to enable)
      debug: process.env.SMTP_DEBUG === 'true',
      logger: process.env.SMTP_DEBUG === 'true',
    };
    
    return nodemailer.createTransport(transportConfig);
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
  
  // Create a fresh transporter for verification (without pooling) to avoid connection issues
  let verifyTransporter = null;
  try {
    if (!isSMTPConfigured()) {
      return false;
    }
    
    const port = Number(process.env.SMTP_PORT) || 587;
    const isSecurePort = port === 465;
    const requireTLS = !isSecurePort && (process.env.SMTP_REQUIRE_TLS !== 'false');
    const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT) || 60000;
    const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT) || 60000;
    const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT) || 60000;
    
    // Create a non-pooled transporter for verification
    verifyTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim(),
      port: port,
      secure: isSecurePort,
      auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS?.trim(),
      },
      connectionTimeout: connectionTimeout,
      greetingTimeout: greetingTimeout,
      socketTimeout: socketTimeout,
      requireTLS: requireTLS,
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
      },
      pool: false, // Disable pooling for verification
      debug: process.env.SMTP_DEBUG === 'true',
      logger: process.env.SMTP_DEBUG === 'true',
    });
  } catch (error) {
    console.error('❌ Failed to create verification transporter:', error.message);
    return false;
  }
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`   → Retrying SMTP verification (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Use Promise.race to add a custom timeout wrapper
      const verifyPromise = verifyTransporter.verify();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`SMTP verification timeout after ${verificationTimeout}ms`));
        }, verificationTimeout);
      });
      
      await Promise.race([verifyPromise, timeoutPromise]);
      
      // Close the verification transporter
      if (verifyTransporter && verifyTransporter.close) {
        verifyTransporter.close();
      }
      
      if (attempt > 0) {
        console.log('✅ SMTP verification succeeded after retry');
      } else {
        console.log('✅ SMTP verification successful');
      }
      return true;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      
      if (!isLastAttempt) {
        // Don't log full error on retries, just continue
        continue;
      }
      
      // Close the verification transporter on final failure
      if (verifyTransporter && verifyTransporter.close) {
        verifyTransporter.close();
      }
      
      // Only log full error details on final failure
      // Note: This is a warning, not a critical error - server will continue to run
      console.warn('⚠️  SMTP verification failed (server will continue running):', error.message);
      console.warn('   → Email features may not work until SMTP is properly configured');
      
      // Show current configuration
      const status = getSMTPStatus();
      console.warn(`   → Current config: ${status.host}:${status.port} (user: ${status.user})`);
      console.warn(`   → Timeout used: ${verificationTimeout}ms`);
      
      // Handle specific error types
      if (error.code === 'EAUTH' || error.message.includes('Invalid login') || error.message.includes('BadCredentials')) {
        console.warn('   → Authentication failed. Check SMTP_USER and SMTP_PASS');
        console.warn('   → For Gmail, use an App Password (not your regular password)');
        console.warn('   → Make sure 2-Step Verification is enabled and App Password is generated');
      } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT') || error.code === 'ETIMEDOUT') {
        console.warn('   → Connection timeout. This is often a network/firewall issue.');
        console.warn('   → Quick fixes:');
        console.warn('      • Skip verification in development: Set SMTP_SKIP_VERIFY=true in .env');
        console.warn('      • Try Gmail port 465: Set SMTP_PORT=465 in .env');
        console.warn('      • Check Windows Firewall/Antivirus isn\'t blocking SMTP');
        console.warn('      • Try a different network (some ISPs block port 587)');
        console.warn(`   → Or increase timeout: SMTP_VERIFICATION_TIMEOUT=90000 (current: ${verificationTimeout}ms)`);
        console.warn('   → Run test script: node scripts/test-smtp.js');
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        console.warn('   → Connection refused. Check:');
        console.warn('      • SMTP_HOST and SMTP_PORT are correct');
        console.warn('      • SMTP server is running and accessible');
        console.warn('      • Network/firewall allows outbound connections on SMTP port');
      } else if (error.code === 'ENOTFOUND' || error.message.includes('ENOTFOUND')) {
        console.warn('   → Host not found. Check SMTP_HOST is correct');
      } else if (error.code === 'ECONNRESET' || error.message.includes('ECONNRESET')) {
        console.warn('   → Connection reset. Possible TLS/SSL issues.');
        console.warn('   → Try: SMTP_TLS_REJECT_UNAUTHORIZED=false (for development only)');
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
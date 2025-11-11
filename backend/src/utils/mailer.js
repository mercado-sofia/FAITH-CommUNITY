import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

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
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT) || 587;
    const isSendGrid = host?.includes('sendgrid');
    const isSecurePort = port === 465;
    
    // SendGrid-specific optimizations
    // SendGrid requires port 587 (STARTTLS), not 465
    // Port 465 may be blocked in deployment environments
    if (isSendGrid && port === 465) {
      console.warn('⚠️  SendGrid Configuration Warning:');
      console.warn('   → Port 465 may be blocked in deployment environments');
      console.warn('   → SendGrid recommends port 587 (STARTTLS)');
      console.warn('   → Consider changing SMTP_PORT=587');
    }
    
    // Configurable timeout values
    // For SendGrid, use longer timeouts to handle network latency in deployment environments
    const defaultTimeout = isSendGrid ? 90000 : 60000; // 90s for SendGrid, 60s for others
    const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT) || defaultTimeout;
    const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT) || defaultTimeout;
    const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT) || defaultTimeout;
    
    // Gmail and most SMTP servers on port 587 require TLS
    const requireTLS = !isSecurePort && (process.env.SMTP_REQUIRE_TLS !== 'false');
    
    const transportConfig = {
      host: host,
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
        // For SendGrid, use modern TLS settings
        minVersion: isSendGrid ? 'TLSv1.2' : undefined,
      },
      // Connection pooling - disabled by default for SendGrid to avoid connection issues
      // SendGrid can have issues with connection pooling in some deployment environments
      pool: isSendGrid ? false : (process.env.SMTP_USE_POOL === 'true'),
      maxConnections: 1,
      maxMessages: 3,
      // Disable DNS caching for SendGrid to avoid stale connections
      dns: isSendGrid ? { cache: false } : undefined,
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
  // Recreate mailer if it's null (e.g., if .env was loaded after module initialization)
  if (!mailer) {
    mailer = createTransporter();
  }
  
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
    
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT) || 587;
    const isSendGrid = host?.includes('sendgrid');
    const isSecurePort = port === 465;
    const requireTLS = !isSecurePort && (process.env.SMTP_REQUIRE_TLS !== 'false');
    
    // For SendGrid, use longer timeouts to handle network latency in deployment environments
    const defaultTimeout = isSendGrid ? 90000 : 60000; // 90s for SendGrid, 60s for others
    const connectionTimeout = Number(process.env.SMTP_CONNECTION_TIMEOUT) || defaultTimeout;
    const greetingTimeout = Number(process.env.SMTP_GREETING_TIMEOUT) || defaultTimeout;
    const socketTimeout = Number(process.env.SMTP_SOCKET_TIMEOUT) || defaultTimeout;
    
    // Create a non-pooled transporter for verification
    verifyTransporter = nodemailer.createTransport({
      host: host,
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
        // For SendGrid, use modern TLS settings
        minVersion: isSendGrid ? 'TLSv1.2' : undefined,
      },
      pool: false, // Disable pooling for verification
      // Disable DNS caching for SendGrid to avoid stale connections
      dns: isSendGrid ? { cache: false } : undefined,
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
        const isSendGrid = status.host.includes('sendgrid');
        const currentPort = Number(process.env.SMTP_PORT) || 587;
        
        console.warn('   → Connection timeout. This is often a network/firewall issue.');
        console.warn('   → Quick fixes:');
        
        if (isSendGrid) {
          console.warn('      • SendGrid detected: Use port 587 (not 465)');
          if (currentPort === 465) {
            console.warn('      • ⚠️  You are using port 465. SendGrid recommends port 587');
            console.warn('      • Change to: SMTP_PORT=587 in your .env');
          }
          console.warn('      • SendGrid requires: SMTP_USER=apikey and SMTP_PASS=your-api-key');
        } else {
          console.warn('      • Try port 587 (STARTTLS) instead of 465: Set SMTP_PORT=587 in .env');
          if (currentPort === 587) {
            console.warn('      • Try port 465 (SSL): Set SMTP_PORT=465 in .env');
          }
        }
        
        console.warn('      • Skip verification in production: Set SMTP_SKIP_VERIFY=true in .env');
        console.warn('      • Check firewall/network isn\'t blocking SMTP ports');
        console.warn(`   → Or increase timeout: SMTP_VERIFICATION_TIMEOUT=120000 (current: ${verificationTimeout}ms)`);
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

// Send email via SendGrid SDK (alternative to SMTP)
async function sendMailViaSendGridAPI({ to, subject, html, text, from }) {
  const apiKey = process.env.SMTP_PASS?.trim() || process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('SMTP_PASS or SENDGRID_API_KEY (SendGrid API key) is required for SendGrid API');
  }

  // Set API key (only needs to be done once, but safe to call multiple times)
  sgMail.setApiKey(apiKey);

  // Parse from address
  let fromEmail = null;
  let fromName = 'FAITH CommUNITY';
  
  // First, try to parse from the 'from' parameter
  if (from) {
    // Handle format: "Name" <email@domain.com> or email@domain.com
    const match = from.match(/^"?([^"<]+)"?\s*<(.+)>$|^(.+)$/);
    if (match) {
      if (match[1] && match[2]) {
        // Format: "Name" <email@domain.com>
        fromName = match[1].trim();
        fromEmail = match[2].trim();
      } else if (match[3]) {
        // Format: email@domain.com
        fromEmail = match[3].trim();
      }
    }
  }
  
  // If not found, try MAIL_FROM environment variable
  if (!fromEmail) {
    const mailFrom = process.env.MAIL_FROM?.trim();
    if (mailFrom) {
      // Handle format: "Name" <email@domain.com> or email@domain.com
      const match = mailFrom.match(/^"?([^"<]+)"?\s*<(.+)>$|^(.+)$/);
      if (match) {
        if (match[1] && match[2]) {
          // Format: "Name" <email@domain.com>
          fromName = match[1].trim();
          fromEmail = match[2].trim();
        } else if (match[3]) {
          // Format: email@domain.com
          fromEmail = match[3].trim();
        }
      }
    }
  }
  
  // If still not found, use default
  if (!fromEmail) {
    fromEmail = 'faithcommunityfaces@gmail.com'; // Default verified email
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fromEmail)) {
    throw new Error(`Invalid from email address format: ${fromEmail}. Please set MAIL_FROM environment variable with a valid email address.`);
  }
  
  // Log the email being used (for debugging)
  if (process.env.NODE_ENV === 'production') {
    console.log('📧 SendGrid from address:', {
      email: fromEmail,
      name: fromName,
      source: from ? 'parameter' : (process.env.MAIL_FROM ? 'MAIL_FROM' : 'default')
    });
  }

  // Prepare message - SendGrid SDK accepts both string and object format
  // Using string format is more reliable: "Name" <email@domain.com>
  const msg = {
    to: to,
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    subject: subject,
  };

  // Add content (prefer HTML, fallback to text)
  if (html) {
    msg.html = html;
  }
  if (text) {
    msg.text = text;
  }
  // If only HTML provided, use it as text too
  if (html && !text) {
    msg.text = html.replace(/<[^>]*>/g, ''); // Strip HTML tags for plain text
  }

  try {
    const [response] = await sgMail.send(msg);
    return {
      messageId: response.headers['x-message-id'] || 'sent',
      statusCode: response.statusCode,
      response: 'Email sent successfully'
    };
  } catch (error) {
    // SendGrid SDK provides detailed error information
    let errorMessage = 'SendGrid API error';
    if (error.response) {
      const { body, statusCode } = error.response;
      errorMessage = `SendGrid API error (${statusCode}): `;
      if (body && body.errors && body.errors.length > 0) {
        const errorDetails = body.errors.map(e => {
          const field = e.field ? `[${e.field}] ` : '';
          return `${field}${e.message || 'Unknown error'}`;
        }).join(', ');
        errorMessage += errorDetails;
      } else if (body && body.message) {
        errorMessage += body.message;
      } else {
        errorMessage += error.message || 'Unknown error';
      }
    } else {
      errorMessage = `SendGrid API error: ${error.message || 'Unknown error'}`;
    }
    
    // Add helpful context for "Invalid from email address" errors
    if (errorMessage.includes('Invalid from email') || errorMessage.includes('from email')) {
      errorMessage += `\n   → From email used: ${fromEmail}`;
      errorMessage += `\n   → Make sure this email is verified in SendGrid Dashboard`;
      errorMessage += `\n   → Go to SendGrid → Settings → Sender Authentication → Single Sender Verification`;
      errorMessage += `\n   → Verify: ${fromEmail}`;
      if (process.env.MAIL_FROM) {
        errorMessage += `\n   → MAIL_FROM env var: ${process.env.MAIL_FROM}`;
      }
    }
    
    console.error('❌ SendGrid API error details:', {
      message: errorMessage,
      fromEmail,
      fromName,
      statusCode: error.response?.statusCode,
      errors: error.response?.body?.errors
    });
    
    const sendGridError = new Error(errorMessage);
    sendGridError.code = 'SENDGRID_API_ERROR';
    sendGridError.status = error.response?.statusCode;
    sendGridError.response = error.response;
    throw sendGridError;
  }
}

export async function sendMail({ to, subject, html, text, attachments } = {}, retries = 2) {
  // Check if SendGrid REST API should be used instead of SMTP
  // Use REST API if explicitly enabled (recommended when SMTP is blocked)
  const useSendGridAPI = process.env.USE_SENDGRID_API === 'true';
  
  // Debug logging in production to help troubleshoot
  if (process.env.NODE_ENV === 'production') {
    console.log('📧 Email send request:', {
      useSendGridAPI,
      hasApiKey: !!(process.env.SMTP_PASS?.trim() || process.env.SENDGRID_API_KEY?.trim()),
      hasMailFrom: !!process.env.MAIL_FROM,
      to: to?.substring(0, 10) + '...' // Only log first 10 chars for privacy
    });
  }
  
  if (useSendGridAPI) {
    // Use SendGrid SDK instead of SMTP
    const apiKey = process.env.SMTP_PASS?.trim() || process.env.SENDGRID_API_KEY?.trim();
    if (!apiKey) {
      const error = new Error('SMTP_PASS or SENDGRID_API_KEY (SendGrid API key) is required when using SendGrid API');
      error.code = 'SENDGRID_API_KEY_MISSING';
      console.error('❌ SendGrid API key missing:', {
        hasSMTP_PASS: !!process.env.SMTP_PASS,
        hasSENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
        USE_SENDGRID_API: process.env.USE_SENDGRID_API
      });
      throw error;
    }

    const maxRetries = retries;
    const from = process.env.MAIL_FROM || `"FAITH CommUNITY" <${process.env.SMTP_USER || 'noreply@faithcommunity.com'}>`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`   → Retrying email send via SendGrid API (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await sendMailViaSendGridAPI({ to, subject, html, text, from });
        return result;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        
        if (isLastAttempt) {
          console.error('❌ Failed to send email via SendGrid API:', error.message);
          if (error.status) {
            console.error(`   → HTTP Status: ${error.status}`);
          }
          throw error;
        }
        
        console.warn(`⚠️  SendGrid API error (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
        continue;
      }
    }
    
    throw new Error('Failed to send email via SendGrid API after all retry attempts');
  }

  // Continue with SMTP implementation
  if (!isSMTPConfigured()) {
    const status = getSMTPStatus();
    const error = new Error(`SMTP not configured. Missing: ${status.missing.join(', ')}`);
    error.code = 'SMTP_NOT_CONFIGURED';
    error.status = status;
    throw error;
  }

  if (!to) {
    throw new Error('Email recipient (to) is required');
  }
  if (!subject) {
    throw new Error('Email subject is required');
  }

  const maxRetries = retries;
  const isSendGrid = process.env.SMTP_HOST?.trim()?.includes('sendgrid');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Recreate transporter on retry to get a fresh connection
      // This helps with connection timeout issues, especially for SendGrid
      if (attempt > 0 || !mailer) {
        // Close existing mailer if it exists
        if (mailer && mailer.close) {
          try {
            mailer.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
        
        mailer = createTransporter();
        if (!mailer) {
          const error = new Error('Failed to create SMTP transporter');
          error.code = 'SMTP_TRANSPORTER_FAILED';
          throw error;
        }
      }

      // Add delay before retry (exponential backoff)
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`   → Retrying email send (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    const result = await mailer.sendMail({
      from: process.env.MAIL_FROM || `"FAITH CommUNITY" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
      attachments,
    });

      // Close connection after successful send (for SendGrid, avoid keeping connections open)
      if (isSendGrid && mailer && mailer.close) {
        try {
          mailer.close();
          mailer = null; // Force recreation on next send
        } catch (closeError) {
          // Ignore close errors
        }
      }

    return result;
  } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const isTimeoutError = error.code === 'ETIMEDOUT' || 
                            error.message.includes('timeout') || 
                            error.message.includes('ETIMEDOUT') ||
                            error.command === 'CONN';
      
      // Log error details
      if (isLastAttempt) {
    console.error('❌ Failed to send email:', error.message);
        if (error.code) {
          console.error(`   → Error code: ${error.code}`);
        }
        if (error.command) {
          console.error(`   → Failed command: ${error.command}`);
        }
        
        // Provide helpful error messages for SendGrid
        if (isSendGrid && isTimeoutError) {
          const status = getSMTPStatus();
          const currentPort = Number(process.env.SMTP_PORT) || 587;
          console.error('   → SendGrid Connection Timeout Troubleshooting:');
          console.error('      • Verify SMTP_PORT=587 (NOT 465)');
          console.error('      • Verify SMTP_USER=apikey (literal string "apikey")');
          console.error('      • Verify SMTP_PASS is your SendGrid API key');
          console.error('      • Check if your deployment platform allows outbound SMTP connections');
          console.error(`      • Current config: ${status.host}:${currentPort}`);
          if (currentPort === 465) {
            console.error('      • ⚠️  CRITICAL: Port 465 is likely blocked. Change to SMTP_PORT=587');
          }
        }
      } else if (isTimeoutError) {
        // Log retry attempt for timeout errors
        console.warn(`⚠️  Email send timeout (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
      }
      
      // Re-throw error on last attempt
      if (isLastAttempt) {
    throw error;
      }
      
      // Continue to retry
      continue;
    }
  }
  
  // This should never be reached, but just in case
  throw new Error('Failed to send email after all retry attempts');
}

export { mailer };
export default sendMail;
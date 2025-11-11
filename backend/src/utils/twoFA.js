import { authenticator } from "otplib";

/**
 * 2FA (Two-Factor Authentication) utility functions using TOTP
 * This provides 6-digit codes that change every 30 seconds
 */

/**
 * Generate a new 2FA secret for a user
 * @param {string} username - The username/email of the user
 * @param {string} issuer - The issuer name (default: FAITH-CommUNITY)
 * @returns {Object} - Object containing secret and otpauth URL
 */
export const generateTwoFASecret = (username, issuer = 'FAITH-CommUNITY') => {
  const secret = authenticator.generateSecret();
  const label = encodeURIComponent(`${issuer}:superadmin-${username}`);
  const encodedIssuer = encodeURIComponent(issuer);
  const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}`;
  
  return {
    secret,
    otpauth
  };
};

/**
 * Verify a 2FA token against a secret
 * @param {string} token - The 6-digit token to verify
 * @param {string} secret - The user's 2FA secret
 * @returns {boolean} - True if token is valid
 */
export const verifyTwoFAToken = (token, secret) => {
  if (!token || !secret) {
    return false;
  }
  
  try {
    return authenticator.check(String(token), secret);
  } catch (error) {
    console.error('2FA verification error:', error);
    return false;
  }
};

/**
 * Generate a QR code data URL for 2FA setup (optional)
 * @param {string} otpauth - The otpauth URL
 * @returns {Promise<string|null>} - QR code data URL or null if generation fails
 */
export const generateTwoFAQRCode = async (otpauth) => {
  try {
    // Try to import qrcode library
    const QRCode = await import('qrcode');
    return await QRCode.toDataURL(otpauth);
  } catch (error) {
    return null; // Return null instead of throwing error
  }
};

/**
 * Alternative: Generate QR code using a simple fallback method
 * This creates a basic QR code without external dependencies
 * @param {string} otpauth - The otpauth URL
 * @returns {string|null} - Simple QR code representation or null
 */
export const generateSimpleQRCode = (otpauth) => {
  // This is a placeholder - in a real implementation, you might use a different approach
  // For now, we'll just return null to indicate no QR code is available
  return null;
};

/**
 * Validate 2FA token format
 * @param {string} token - The token to validate
 * @returns {boolean} - True if token format is valid
 */
export const validateTwoFATokenFormat = (token) => {
  return /^\d{6}$/.test(token);
};

export default {
  generateTwoFASecret,
  verifyTwoFAToken,
  generateTwoFAQRCode,
  validateTwoFATokenFormat
};

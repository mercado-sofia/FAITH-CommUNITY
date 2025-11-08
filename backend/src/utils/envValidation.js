/**
 * Environment Variable Validation
 * Validates critical environment variables for production deployment
 */

const requiredEnvVars = {
  // Database - Required
  MYSQL_HOST: process.env.MYSQL_HOST,
  MYSQL_USER: process.env.MYSQL_USER,
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
  MYSQL_DATABASE: process.env.MYSQL_DATABASE,
  
  // Security - Required in production
  JWT_SECRET: process.env.JWT_SECRET,
  CSRF_SECRET: process.env.CSRF_SECRET,
  
  // Frontend URL - Required for email links
  FRONTEND_URL: process.env.FRONTEND_URL,
};

const recommendedEnvVars = {
  // SMTP - Recommended (email features won't work without it)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  
  // Cloudinary - Recommended (file uploads won't work without it)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

/**
 * Validates environment variables for production
 * @param {boolean} strict - If true, fails on missing required vars. If false, only warns.
 * @returns {Object} Validation result with missing vars and warnings
 */
export function validateEnvironment(strict = false) {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = [];
  const warnings = [];
  
  // Check required variables
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value || value.trim() === '') {
      missing.push(key);
      
      // Check for weak defaults
      if (key === 'JWT_SECRET' && value === 'change-me-in-env') {
        warnings.push(`${key} is using the default weak value. This is a security risk!`);
      }
      if (key === 'CSRF_SECRET' && value === 'change-me') {
        warnings.push(`${key} is using the default weak value. This is a security risk!`);
      }
    }
  }
  
  // Check recommended variables
  for (const [key, value] of Object.entries(recommendedEnvVars)) {
    if (!value || value.trim() === '') {
      warnings.push(`${key} is not set. Related features may not work.`);
    }
  }
  
  // Validate JWT_SECRET strength if set
  if (requiredEnvVars.JWT_SECRET && requiredEnvVars.JWT_SECRET !== 'change-me-in-env') {
    if (requiredEnvVars.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long for security.');
    }
  }
  
  // Validate CSRF_SECRET strength if set
  if (requiredEnvVars.CSRF_SECRET && requiredEnvVars.CSRF_SECRET !== 'change-me') {
    if (requiredEnvVars.CSRF_SECRET.length < 32) {
      warnings.push('CSRF_SECRET should be at least 32 characters long for security.');
    }
  }
  
  const result = {
    valid: missing.length === 0,
    missing,
    warnings,
    isProduction,
  };
  
  // In production with strict mode, throw error if required vars are missing
  if (isProduction && strict && missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set these variables before starting the application in production.`
    );
  }
  
  return result;
}

/**
 * Logs environment validation results
 */
export function logEnvironmentValidation() {
  const validation = validateEnvironment(false);
  
  if (validation.missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    validation.missing.forEach(key => {
      console.error(`   - ${key}`);
    });
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:');
    validation.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }
  
  if (validation.valid && validation.warnings.length === 0) {
    console.log('✅ Environment variables validated successfully');
  }
  
  return validation;
}

export default {
  validateEnvironment,
  logEnvironmentValidation,
};


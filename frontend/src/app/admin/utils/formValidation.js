/**
 * Form Validation Utilities
 * Provides consistent validation across all admin forms
 */

import { VALIDATION } from './constants';

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid
 */
export const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Validate string length
 * @param {string} value - Value to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} True if valid
 */
export const isValidLength = (value, min, max) => {
  if (!value || typeof value !== 'string') return false;
  const length = value.trim().length;
  return length >= min && length <= max;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and requirements
 */
export const validatePassword = (password) => {
  const requirements = {
    minLength: password.length >= VALIDATION.MIN_PASSWORD_LENGTH,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const isValid = Object.values(requirements).every(req => req === true);
  
  return { isValid, requirements };
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate Facebook URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid Facebook URL
 */
export const isValidFacebookUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('facebook.com');
};

/**
 * Validate date
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if valid date
 */
export const isValidDate = (date) => {
  if (!date) return false;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

/**
 * Validate future date
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if date is in the future
 */
export const isFutureDate = (date) => {
  if (!isValidDate(date)) return false;
  return new Date(date) > new Date();
};

/**
 * Validate past date
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (date) => {
  if (!isValidDate(date)) return false;
  return new Date(date) < new Date();
};

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 1000); // Limit length
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Allowed MIME types
 * @returns {boolean} True if valid
 */
export const isValidFileType = (file, allowedTypes) => {
  if (!file || !file.type) return false;
  return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSize - Maximum size in bytes
 * @returns {boolean} True if valid
 */
export const isValidFileSize = (file, maxSize) => {
  if (!file || !file.size) return false;
  return file.size <= maxSize;
};

/**
 * Create validation error object
 * @param {string} field - Field name
 * @param {string} message - Error message
 * @returns {object} Error object
 */
export const createValidationError = (field, message) => {
  return { [field]: message };
};

/**
 * Validate form data against rules
 * @param {object} data - Form data
 * @param {object} rules - Validation rules
 * @returns {object} Errors object (empty if valid)
 */
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];
    
    // Required validation
    if (fieldRules.required && !isRequired(value)) {
      errors[field] = fieldRules.requiredMessage || `${field} is required`;
      return;
    }
    
    // Skip other validations if field is empty and not required
    if (!isRequired(value)) return;
    
    // Email validation
    if (fieldRules.email && !isValidEmail(value)) {
      errors[field] = fieldRules.emailMessage || 'Please enter a valid email address';
      return;
    }
    
    // Length validation
    if (fieldRules.minLength && !isValidLength(value, fieldRules.minLength, Infinity)) {
      errors[field] = fieldRules.minLengthMessage || `Must be at least ${fieldRules.minLength} characters`;
      return;
    }
    
    if (fieldRules.maxLength && !isValidLength(value, 0, fieldRules.maxLength)) {
      errors[field] = fieldRules.maxLengthMessage || `Must be less than ${fieldRules.maxLength} characters`;
      return;
    }
    
    // URL validation
    if (fieldRules.url && !isValidUrl(value)) {
      errors[field] = fieldRules.urlMessage || 'Please enter a valid URL';
      return;
    }
    
    // Facebook URL validation
    if (fieldRules.facebookUrl && !isValidFacebookUrl(value)) {
      errors[field] = fieldRules.facebookUrlMessage || 'Please enter a valid Facebook URL';
      return;
    }
    
    // Date validation
    if (fieldRules.date && !isValidDate(value)) {
      errors[field] = fieldRules.dateMessage || 'Please enter a valid date';
      return;
    }
    
    // Future date validation
    if (fieldRules.futureDate && !isFutureDate(value)) {
      errors[field] = fieldRules.futureDateMessage || 'Date must be in the future';
      return;
    }
    
    // Past date validation
    if (fieldRules.pastDate && !isPastDate(value)) {
      errors[field] = fieldRules.pastDateMessage || 'Date must be in the past';
      return;
    }
    
    // Custom validation
    if (fieldRules.custom && typeof fieldRules.custom === 'function') {
      const customResult = fieldRules.custom(value, data);
      if (customResult !== true) {
        errors[field] = typeof customResult === 'string' ? customResult : `${field} is invalid`;
        return;
      }
    }
  });
  
  return errors;
};


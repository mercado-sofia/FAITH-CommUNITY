'use client';

import { useState, useEffect } from 'react';
import { FaEnvelope, FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa';
import styles from './EmailEditModal.module.css';

// Utility functions
const sanitizeEmail = (email) => {
  return email.trim().toLowerCase();
};

const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Rate limiting utility
class RateLimiter {
  constructor(maxAttempts = 3, windowMs = 10 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(timestamp => now - timestamp < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key) {
    this.attempts.delete(key);
  }
}

// Enhanced error handling
const handleApiError = (error, context) => {
  if (error.status === 401) {
    if (context === 'email_verification' || context === 'password_verification') {
      return {
        type: 'password_error',
        message: 'Incorrect password. Please try again.',
        action: 'show_error'
      };
    }
    return {
      type: 'authentication',
      message: 'Your session has expired. Please log in again.',
      action: 'redirect_to_login'
    };
  } else if (error.status === 403) {
    return {
      type: 'authorization',
      message: 'You do not have permission to perform this action.',
      action: 'show_error'
    };
  } else if (error.status === 409) {
    return {
      type: 'conflict',
      message: 'This email address is already in use.',
      action: 'show_error'
    };
  } else if (error.status === 429) {
    return {
      type: 'rate_limit',
      message: 'Too many attempts. Please try again later.',
      action: 'show_error'
    };
  } else if (error.status >= 500) {
    return {
      type: 'server_error',
      message: 'Server error. Please try again later.',
      action: 'show_error'
    };
  } else {
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      action: 'show_error'
    };
  }
};

export default function EmailEditModal({ 
  isOpen, 
  currentEmail, 
  adminId, 
  onClose, 
  onSuccess 
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailData, setEmailData] = useState({
    email: '',
    emailChangePassword: ''
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });
  const [emailPasswordVisibility, setEmailPasswordVisibility] = useState(false);

  const emailRateLimiter = new RateLimiter(3, 10 * 60 * 1000);

  useEffect(() => {
    if (isOpen && currentEmail) {
      setEmailData({
        email: currentEmail,
        emailChangePassword: ''
      });
    }
  }, [isOpen, currentEmail]);

  useEffect(() => {
    if (isOpen) {
      // Lock body scroll when modal is open
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore body scroll when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = name === 'email' ? sanitizeEmail(value) : value;
    
    setEmailData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleEmailPasswordVisibility = () => {
    setEmailPasswordVisibility(prev => !prev);
  };

  const hasEmailChanged = () => {
    return emailData.email !== currentEmail;
  };

  const validateEmail = () => {
    const newErrors = {};
    
    if (!emailData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmailFormat(emailData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (hasEmailChanged() && !emailData.emailChangePassword.trim()) {
      newErrors.emailChangePassword = 'Current password is required to change email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveEmail = async () => {
    if (!adminId) {
      setMessage({ text: 'Admin ID not found. Please refresh the page.', type: 'error' });
      return;
    }

    if (validateEmail()) {
      // Apply rate limiting for password verification attempts
      const rateLimitKey = `email_password_verification_${adminId}`;
      if (!emailRateLimiter.isAllowed(rateLimitKey)) {
        setMessage({
          text: `Too many password verification attempts. Please try again in 10 minutes.`,
          type: 'error'
        });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        return;
      }

      try {
        setIsVerifying(true);
        
        // Always verify password when provided (for email changes or security)
        if (emailData.emailChangePassword.trim()) {
          const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admins/${adminId}/verify-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ currentPassword: emailData.emailChangePassword })
          });

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json().catch(() => ({}));
            const errorInfo = handleApiError({ status: verifyResponse.status, message: errorData.message }, 'email_verification');
            
            if (errorInfo.type === 'password_error') {
              // Set password-specific error
              setErrors(prev => ({ ...prev, emailChangePassword: errorInfo.message }));
              setMessage({ text: '', type: '' });
            } else {
              // Set general error message
              setMessage({
                text: errorInfo.message,
                type: 'error'
              });
              setTimeout(() => setMessage({ text: '', type: '' }), 5000);
            }
            return;
          }
        }

        setIsVerifying(false);
        setIsUpdating(true);

        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admins/${adminId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            email: emailData.email,
            role: 'admin',
            status: 'ACTIVE'
          })
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          const errorInfo = handleApiError({ status: updateResponse.status, message: errorData.message }, 'email_update');
          throw new Error(errorInfo.message);
        }
        
        // Reset rate limiter on successful update
        emailRateLimiter.reset(rateLimitKey);
        
        setMessage({ text: 'Email updated successfully!', type: 'success' });
        setTimeout(() => {
          onSuccess(emailData.email);
          onClose();
        }, 2000);
      } catch (error) {
        setMessage({ 
          text: error.message || 'Failed to update email. Please try again.', 
          type: 'error' 
        });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
      } finally {
        setIsVerifying(false);
        setIsUpdating(false);
      }
    }
  };

  const handleCancel = () => {
    setEmailData({
      email: currentEmail || '',
      emailChangePassword: ''
    });
    setErrors({});
    setMessage({ text: '', type: '' });
    setEmailPasswordVisibility(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <FaEnvelope />
            </div>
            <div className={styles.headerText}>
              <h2>Edit Email Address</h2>
              <p>Update your email address for notifications and login</p>
            </div>
          </div>
          <button 
            className={styles.closeButton}
            onClick={handleCancel}
            disabled={isUpdating || isVerifying}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalContent}>
          {message.text && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          <div className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                name="email"
                value={emailData.email}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="admin@organization.org"
                disabled={isUpdating || isVerifying}
              />
              {errors.email && <span className={styles.errorText}>{errors.email}</span>}
            </div>

            {hasEmailChanged() && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Current Password <span className={styles.required}>*</span>
                </label>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={emailPasswordVisibility ? "text" : "password"}
                    name="emailChangePassword"
                    value={emailData.emailChangePassword}
                    onChange={handleInputChange}
                    className={`${styles.input} ${styles.passwordInput} ${errors.emailChangePassword ? styles.inputError : ''}`}
                    placeholder="Enter your current password to confirm"
                    disabled={isUpdating || isVerifying}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={toggleEmailPasswordVisibility}
                    disabled={isUpdating || isVerifying}
                  >
                    {emailPasswordVisibility ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.emailChangePassword && <span className={styles.errorText}>{errors.emailChangePassword}</span>}
                <div className={styles.helperText}>
                  Required to confirm email change
                </div>
              </div>
            )}

            <div className={styles.actionButtons}>
              <button 
                className={styles.cancelButton}
                onClick={handleCancel}
                disabled={isUpdating || isVerifying}
              >
                Cancel
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleSaveEmail}
                disabled={isUpdating || isVerifying}
              >
                {isUpdating ? 'Saving...' : isVerifying ? 'Verifying...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

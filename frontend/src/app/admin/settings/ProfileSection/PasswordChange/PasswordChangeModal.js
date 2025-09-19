'use client';

import { useState, useEffect } from 'react';
import { FaLock, FaEye, FaEyeSlash, FaTimes, FaCheck, FaSpinner } from 'react-icons/fa';
import styles from './PasswordChangeModal.module.css';
import { SuccessModal } from '../../../components';

// Utility functions
const sanitizePassword = (password) => {
  return password.replace(/[<>]/g, '');
};

// Rate limiting utility
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
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

// Password Requirements Component
const PasswordRequirements = ({ password }) => {
  const requirements = [
    {
      id: 'length',
      text: 'Minimum of 8 characters',
      met: password.length >= 8
    },
    {
      id: 'lowercase',
      text: 'At least one lowercase letter (a-z)',
      met: /[a-z]/.test(password)
    },
    {
      id: 'uppercase',
      text: 'At least one uppercase letter (A-Z)',
      met: /[A-Z]/.test(password)
    },
    {
      id: 'number',
      text: 'At least one number (0-9)',
      met: /\d/.test(password)
    }
  ];

  return (
    <div className={styles.passwordRequirements}>
      <h4 className={styles.passwordRequirementsTitle}>Password Requirements:</h4>
      <ul className={styles.requirementsList}>
        {requirements.map((requirement) => (
          <li key={requirement.id} className={styles.requirementItem}>
            <div className={`${styles.requirementIcon} ${requirement.met ? styles.met : styles.notMet}`}>
              {requirement.met ? <FaCheck /> : '•'}
            </div>
            <span className={styles.requirementText}>{requirement.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function PasswordChangeModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const rateLimiter = new RateLimiter(5, 15 * 60 * 1000);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordVisibility({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false
      });
      setErrors({});
      setErrorMessage('');
      setShowSuccessModal(false); // Reset success modal state
    }
  }, [isOpen]);

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

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizePassword(value);
    
    setPasswordData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePasswordVisibility = (fieldName) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const validatePasswordChange = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (validatePasswordChange()) {
      const rateLimitKey = `password_change_${Date.now()}`;
      if (!rateLimiter.isAllowed(rateLimitKey)) {
        setErrorMessage(`Too many password change attempts. Please try again in 15 minutes.`);
        setTimeout(() => setErrorMessage(''), 5000);
        return;
      }

      try {
        setIsVerifyingPassword(true);
        
        // Verify current password
        const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/profile/verify-password-change`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({ password: passwordData.currentPassword })
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json().catch(() => ({}));
          const errorInfo = handleApiError({ status: verifyResponse.status, message: errorData.message }, 'password_verification');
          
          if (errorInfo.type === 'password_error') {
            // Set password-specific error
            setErrors(prev => ({ ...prev, currentPassword: errorInfo.message }));
            setErrorMessage('');
          } else {
            // Set general error message
            setErrorMessage(errorInfo.message);
            setTimeout(() => setErrorMessage(''), 5000);
          }
          return;
        }

        setIsVerifyingPassword(false);
        setIsUpdating(true);

        // Update password
        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/profile/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
          })
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          const errorInfo = handleApiError({ status: updateResponse.status, message: errorData.message }, 'password_update');
          throw new Error(errorInfo.message);
        }
        
        rateLimiter.reset(rateLimitKey);
        
        // Show success modal
        setShowSuccessModal(true);
        
        // Call onSuccess callback
        onSuccess();
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (error) {
        setErrorMessage(error.message || 'Failed to change password. Please try again.');
        setTimeout(() => setErrorMessage(''), 5000);
      } finally {
        setIsVerifyingPassword(false);
        setIsUpdating(false);
      }
    }
  };

  const handleCancel = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordVisibility({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false
    });
    setErrors({});
    setErrorMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <FaLock />
            </div>
            <div className={styles.headerText}>
              <h2>Change Password</h2>
              <p>Update your password to keep your account secure</p>
            </div>
          </div>
          <button 
            className={styles.closeButton}
            onClick={handleCancel}
            disabled={isUpdating || isVerifyingPassword}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalContent}>
          {errorMessage && (
            <div className={`${styles.message} ${styles.error}`}>
              {errorMessage}
            </div>
          )}

          <div className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Current Password</label>
              <div className={styles.passwordInputContainer}>
                <input
                  type={passwordVisibility.currentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordInputChange}
                  className={`${styles.input} ${styles.passwordInput} ${errors.currentPassword ? styles.inputError : ''}`}
                  placeholder="Enter your current password"
                  disabled={isUpdating || isVerifyingPassword}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => togglePasswordVisibility('currentPassword')}
                  disabled={isUpdating || isVerifyingPassword}
                  tabIndex={-1}
                >
                  {passwordVisibility.currentPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.currentPassword && <span className={styles.errorText}>{errors.currentPassword}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>New Password</label>
              <div className={styles.passwordInputContainer}>
                <input
                  type={passwordVisibility.newPassword ? "text" : "password"}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange}
                  className={`${styles.input} ${styles.passwordInput} ${errors.newPassword ? styles.inputError : ''}`}
                  placeholder="Enter your new password"
                  disabled={isUpdating || isVerifyingPassword}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => togglePasswordVisibility('newPassword')}
                  disabled={isUpdating || isVerifyingPassword}
                  tabIndex={-1}
                >
                  {passwordVisibility.newPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.newPassword && <span className={styles.errorText}>{errors.newPassword}</span>}
              <PasswordRequirements password={passwordData.newPassword} />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Confirm New Password</label>
              <div className={styles.passwordInputContainer}>
                <input
                  type={passwordVisibility.confirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  className={`${styles.input} ${styles.passwordInput} ${errors.confirmPassword ? styles.inputError : ''}`}
                  placeholder="Confirm your new password"
                  disabled={isUpdating || isVerifyingPassword}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  disabled={isUpdating || isVerifyingPassword}
                  tabIndex={-1}
                >
                  {passwordVisibility.confirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
            </div>

            <div className={styles.actionButtons}>
              <button 
                className={styles.cancelButton}
                onClick={handleCancel}
                disabled={isUpdating || isVerifyingPassword}
              >
                Cancel
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleChangePassword}
                disabled={isUpdating || isVerifyingPassword}
              >
                {(isUpdating || isVerifyingPassword) ? <FaSpinner className={styles.spinner} /> : null}
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Success Modal */}
      <SuccessModal
        message="Password changed successfully!"
        isVisible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
        autoHideDuration={2000}
      />
    </div>
  );
}

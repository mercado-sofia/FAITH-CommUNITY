'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaLock, FaEye, FaEyeSlash, FaTimes, FaCheck, FaSpinner } from 'react-icons/fa';
import styles from './PasswordChange.module.css';
import { SuccessModal } from '@/components';

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

/**
 * Centralized Secure Password Change Component
 * Supports all user types: public, admin, superadmin
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {function} props.onClose - Close modal callback
 * @param {function} props.onSuccess - Success callback
 * @param {string} props.userType - 'public' | 'admin' | 'superadmin'
 * @param {object} props.currentUser - Current user object (for superadmin)
 * @param {string} props.userId - User ID (for superadmin)
 * @param {boolean} props.showSuccessModal - Whether to show success modal (public users)
 * @param {function} props.setUserData - Set user data callback (public users)
 * @param {function} props.setShowModal - Set modal state callback (public users)
 */
export default function PasswordChange({
  isOpen,
  onClose,
  onSuccess,
  userType = 'public',
  currentUser,
  userId,
  showSuccessModal = false,
  setUserData,
  setShowModal
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
    otp: false
  });
  
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModalState, setShowSuccessModalState] = useState(false);
  const [twofaEnabled, setTwofaEnabled] = useState(false);
  const [isLoading2FAStatus, setIsLoading2FAStatus] = useState(false);

  const rateLimiter = new RateLimiter(5, 15 * 60 * 1000);

  // Check 2FA status for superadmin users
  const check2FAStatus = useCallback(async () => {
    if (userType !== 'superadmin' || !currentUser) return;
    
    setIsLoading2FAStatus(true);
    try {
      // Use the currentUser data to check 2FA status
      setTwofaEnabled(currentUser.twofa_enabled || false);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      setTwofaEnabled(false);
    } finally {
      setIsLoading2FAStatus(false);
    }
  }, [userType, currentUser]);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        otp: ''
      });
      setPasswordVisibility({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
        otp: false
      });
      setErrors({});
      setErrorMessage('');
      setShowSuccessModalState(false);
      
      // Check 2FA status for superadmin users
      if (userType === 'superadmin' && currentUser) {
        check2FAStatus();
      }
    }
  }, [isOpen, userType, currentUser, check2FAStatus]);

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

    // Validate OTP for superadmin users with 2FA enabled
    if (userType === 'superadmin' && twofaEnabled) {
      if (!passwordData.otp.trim()) {
        newErrors.otp = '2FA code is required';
      } else if (!/^\d{6}$/.test(passwordData.otp.trim())) {
        newErrors.otp = '2FA code must be 6 digits';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getApiEndpoint = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    
    switch (userType) {
      case 'public':
        return `${baseUrl}/api/users/password`;
      case 'admin':
        return `${baseUrl}/api/admin/profile/password`;
      case 'superadmin':
        return `${baseUrl}/api/superadmin/auth/password/${userId}`;
      default:
        return `${baseUrl}/api/users/password`;
    }
  };

  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json'
    };

    switch (userType) {
      case 'public':
        const token = localStorage.getItem('userToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        break;
      case 'admin':
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
        break;
      case 'superadmin':
        const superAdminToken = localStorage.getItem('superAdminToken');
        if (superAdminToken) headers['Authorization'] = `Bearer ${superAdminToken}`;
        break;
    }

    return headers;
  };

  const handleChangePassword = async () => {
    if (validatePasswordChange()) {
      // Use a consistent key for rate limiting based on user type
      const rateLimitKey = `password_change_${userType}`;
      if (!rateLimiter.isAllowed(rateLimitKey)) {
        setErrorMessage(`Too many password change attempts. Please try again in 15 minutes.`);
        setTimeout(() => setErrorMessage(''), 5000);
        return;
      }

      try {
        setIsUpdating(true);

        // Prepare request body
        const requestBody = {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        };

        // Add OTP for superadmin users with 2FA enabled
        if (userType === 'superadmin' && twofaEnabled && passwordData.otp) {
          requestBody.otp = passwordData.otp;
        }

        const apiEndpoint = getApiEndpoint();
        const headers = getAuthHeaders();

        // Update password
        const updateResponse = await fetch(apiEndpoint, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify(requestBody)
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          console.error('Password Change Error:', {
            status: updateResponse.status,
            statusText: updateResponse.statusText,
            errorData,
            userType,
            endpoint: apiEndpoint
          });
          
          const errorInfo = handleApiError({ status: updateResponse.status, message: errorData.message }, 'password_update');
          
          // Handle 2FA-specific errors
          if (errorData.requireTwoFA) {
            setErrors(prev => ({ ...prev, otp: errorData.message }));
            setErrorMessage('');
          } else if (errorInfo.type === 'password_error') {
            setErrors(prev => ({ ...prev, currentPassword: errorInfo.message }));
            setErrorMessage('');
          } else {
            setErrorMessage(errorInfo.message);
            setTimeout(() => setErrorMessage(''), 5000);
          }
          return;
        }
        
        rateLimiter.reset(rateLimitKey);
        
        if (userType === 'public') {
          // For public users, show success message and close modal
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            otp: ''
          });
          setPasswordVisibility({
            currentPassword: false,
            newPassword: false,
            confirmPassword: false,
            otp: false
          });
          setErrors({});
          setErrorMessage('');
          if (setShowModal) setShowModal(false);
          document.body.classList.remove('modalOpen');
          
          // Show success modal
          setShowSuccessModalState(true);
        } else {
          // For admin/superadmin, show success modal and close
          setShowSuccessModalState(true);
          onSuccess();
          
          // Close modal after a short delay
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } catch (error) {
        setErrorMessage(error.message || 'Failed to change password. Please try again.');
        setTimeout(() => setErrorMessage(''), 5000);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleCancel = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      otp: ''
    });
    setPasswordVisibility({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
      otp: false
    });
    setErrors({});
    setErrorMessage('');
    
    if (setShowModal) {
      setShowModal(false);
      document.body.classList.remove('modalOpen');
    } else {
      onClose();
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModalState(false);
    if (showSuccessModal) {
      // For public users, you might want to show a toast or other notification
    }
  };

  if (!isOpen) return null;

  const modalContent = (
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
            disabled={isUpdating}
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
                  disabled={isUpdating}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => togglePasswordVisibility('currentPassword')}
                  disabled={isUpdating}
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
                  disabled={isUpdating}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => togglePasswordVisibility('newPassword')}
                  disabled={isUpdating}
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
                  disabled={isUpdating}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  disabled={isUpdating}
                  tabIndex={-1}
                >
                  {passwordVisibility.confirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
            </div>

            {/* 2FA OTP Field for Superadmin */}
            {userType === 'superadmin' && twofaEnabled && (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>2FA Code</label>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={passwordVisibility.otp ? "text" : "password"}
                    name="otp"
                    value={passwordData.otp}
                    onChange={handlePasswordInputChange}
                    className={`${styles.input} ${styles.passwordInput} ${errors.otp ? styles.inputError : ''}`}
                    placeholder="Enter 6-digit 2FA code"
                    disabled={isUpdating}
                    maxLength={6}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility('otp')}
                    disabled={isUpdating}
                    tabIndex={-1}
                  >
                    {passwordVisibility.otp ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.otp && <span className={styles.errorText}>{errors.otp}</span>}
                <div className={styles.helpText}>
                  Enter the 6-digit code from your authenticator app
                </div>
              </div>
            )}

            <div className={styles.actionButtons}>
              <button 
                className={styles.cancelButton}
                onClick={handleCancel}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleChangePassword}
                disabled={isUpdating}
              >
                {isUpdating ? <FaSpinner className={styles.spinner} /> : null}
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Success Modal */}
      <SuccessModal
        message="Password changed successfully!"
        isVisible={showSuccessModalState}
        onClose={handleSuccessModalClose}
        type="success"
        autoHideDuration={2000}
      />
    </div>
  );

  return (
    <>
      {/* Modal content - portal handling moved to parent component for public users */}
      {modalContent}
    </>
  );
}

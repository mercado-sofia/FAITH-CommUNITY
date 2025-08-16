'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaEdit, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAdminById } from '../../../hooks/useAdminData';
import { selectCurrentAdmin, updateAdminEmail } from '../../../rtk/superadmin/adminSlice';
import styles from './adminSettings.module.css';

// Utility functions for production enhancements
const sanitizeEmail = (email) => {
  return email.trim().toLowerCase();
};

const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sanitizePassword = (password) => {
  // Remove any potential script tags or dangerous characters
  return password.replace(/[<>]/g, '');
};

// Rate limiting utility
class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) { // 5 attempts per 15 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(timestamp => now - timestamp < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }

  getRemainingAttempts(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(timestamp => now - timestamp < this.windowMs);
    return Math.max(0, this.maxAttempts - recentAttempts.length);
  }

  reset(key) {
    this.attempts.delete(key);
  }
}

// Audit logging utility
const auditLogger = {
  log: (action, details, userId) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server-side',
      ip: 'client-side' // In production, this would come from server
    };
    
    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to your logging service (Sentry, LogRocket, etc.)
      console.log('AUDIT_LOG:', logEntry);
    } else {
      console.log('AUDIT_LOG:', logEntry);
    }
  }
};

// Enhanced error handling
const handleApiError = (error, context) => {
  if (error.status === 401) {
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

// Separate component for password change functionality
const PasswordChangeForm = ({ adminId, onCancel, onSuccess }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Password visibility states
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });

  // Rate limiting for password attempts
  const rateLimiter = useRef(new RateLimiter(5, 15 * 60 * 1000)); // 5 attempts per 15 minutes

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizePassword(value);
    
    setPasswordData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Toggle password visibility
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
      // Check rate limiting
      const rateLimitKey = `password_change_${adminId}`;
      if (!rateLimiter.current.isAllowed(rateLimitKey)) {
        const remainingAttempts = rateLimiter.current.getRemainingAttempts(rateLimitKey);
        setMessage({
          text: `Too many password change attempts. Please try again in 15 minutes.`,
          type: 'error'
        });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        return;
      }

      try {
        setIsVerifyingPassword(true);
        
        // Audit log: Password change attempt
        auditLogger.log('password_change_attempt', { adminId }, adminId);
        
        // First verify the current password
        const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admins/${adminId}/verify-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({ currentPassword: passwordData.currentPassword })
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json().catch(() => ({}));
          const errorInfo = handleApiError({ status: verifyResponse.status, message: errorData.message }, 'password_verification');
          
          setMessage({
            text: errorInfo.message,
            type: 'error'
          });
          
          // Audit log: Password verification failed
          auditLogger.log('password_verification_failed', { 
            adminId, 
            reason: errorInfo.type 
          }, adminId);
          
          setTimeout(() => setMessage({ text: '', type: '' }), 5000);
          return;
        }

        setIsVerifyingPassword(false);
        setIsUpdating(true);

        // If password verification succeeds, proceed with password update
        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admins/${adminId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            password: passwordData.newPassword,
            role: 'admin',
            status: 'ACTIVE'
          })
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          const errorInfo = handleApiError({ status: updateResponse.status, message: errorData.message }, 'password_update');
          throw new Error(errorInfo.message);
        }
        
        // Reset rate limiter on success
        rateLimiter.current.reset(rateLimitKey);
        
        // Audit log: Password change successful
        auditLogger.log('password_change_successful', { adminId }, adminId);
        
        setMessage({ text: 'Password changed successfully!', type: 'success' });
        setTimeout(() => {
          setMessage({ text: '', type: '' });
          onSuccess();
        }, 3000);
      } catch (error) {
        // Audit log: Password change failed
        auditLogger.log('password_change_failed', { 
          adminId, 
          error: error.message 
        }, adminId);
        
        setMessage({ 
          text: error.message || 'Failed to change password. Please try again.', 
          type: 'error' 
        });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
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
    setMessage({ text: '', type: '' });
    onCancel();
  };

  return (
    <div className={styles.passwordForm}>
      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}
      
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
          >
            {passwordVisibility.newPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {errors.newPassword && <span className={styles.errorText}>{errors.newPassword}</span>}
        <div className={styles.helperText}>
          Password must be at least 8 characters with uppercase, lowercase, and number
        </div>
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
          {isUpdating ? 'Updating...' : isVerifyingPassword ? 'Verifying...' : 'Update Password'}
        </button>
      </div>
    </div>
  );
};

export default function AdminSettings() {
  const dispatch = useDispatch();
  const currentAdmin = useSelector(selectCurrentAdmin);
  
  // Get admin data from API using SWR
  const { admin: adminFromApi, isLoading: isLoadingAdmin, error: apiError, mutate: refreshAdmin } = useAdminById(currentAdmin?.id);

  // Use currentAdmin as primary source, API as enhancement
  // If API returns empty email but Redux has it, use Redux data
  const effectiveAdminData = useMemo(() => {
    return adminFromApi ? {
      ...adminFromApi,
      email: adminFromApi.email || currentAdmin?.email || ''
    } : currentAdmin;
  }, [adminFromApi, currentAdmin]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [adminData, setAdminData] = useState({
    org: '',
    orgName: '',
    email: '',
    emailChangePassword: '', // New field for email change password verification
    status: 'ACTIVE'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [errors, setErrors] = useState({});
  
  // Password visibility state for email change
  const [emailPasswordVisibility, setEmailPasswordVisibility] = useState(false);

  // Rate limiting for email change attempts
  const emailRateLimiter = useRef(new RateLimiter(3, 10 * 60 * 1000)); // 3 attempts per 10 minutes

  // Helper function to check if email has changed
  const hasEmailChanged = () => {
    // Get the original email from the most reliable source
    const originalEmail = effectiveAdminData?.email || '';
    return adminData.email !== originalEmail;
  };

  // Helper function to calculate time since password was last changed
  const getPasswordChangeTime = () => {
    // Check if we have password change date from API
    const passwordChangedAt = effectiveAdminData?.password_changed_at || effectiveAdminData?.updated_at;
    
    if (!passwordChangedAt) {
      return 'Unknown';
    }

    const now = new Date();
    const changeDate = new Date(passwordChangedAt);
    const diffTime = Math.abs(now - changeDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return '1 day ago';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  };

  // Initialize admin data when API data is loaded
  useEffect(() => {
    if (effectiveAdminData) {
      setAdminData({
        org: effectiveAdminData.org || '',
        orgName: effectiveAdminData.orgName || '',
        email: effectiveAdminData.email || '',
        emailChangePassword: '', // Clear email change password
        status: effectiveAdminData.status || 'ACTIVE'
      });
    } else {
      // Set default values to prevent null errors
      setAdminData({
        org: '',
        orgName: '',
        email: '',
        emailChangePassword: '',
        status: 'ACTIVE'
      });
    }
  }, [effectiveAdminData]);

  // Clear email change password on mount
  useEffect(() => {
    setAdminData(prev => ({ ...prev, emailChangePassword: '' }));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Sanitize email input
    const sanitizedValue = name === 'email' ? sanitizeEmail(value) : value;
    
    setAdminData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Toggle email password visibility
  const toggleEmailPasswordVisibility = () => {
    setEmailPasswordVisibility(prev => !prev);
  };

  const validateProfile = () => {
    const newErrors = {};
    
    if (!adminData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmailFormat(adminData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Check if email has changed and require password verification
    if (hasEmailChanged()) {
      if (!adminData.emailChangePassword.trim()) {
        newErrors.emailChangePassword = 'Current password is required to change email address';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (validateProfile()) {
      // Check rate limiting for email changes
      const rateLimitKey = `email_change_${currentAdmin?.id}`;
      if (hasEmailChanged() && !emailRateLimiter.current.isAllowed(rateLimitKey)) {
        const remainingAttempts = emailRateLimiter.current.getRemainingAttempts(rateLimitKey);
        setMessage({
          text: `Too many email change attempts. Please try again in 10 minutes.`,
          type: 'error'
        });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        return;
      }

      try {
        setIsVerifying(true);
        
        // Audit log: Email change attempt
        if (hasEmailChanged()) {
          auditLogger.log('email_change_attempt', { 
            adminId: currentAdmin?.id,
            oldEmail: effectiveAdminData?.email,
            newEmail: adminData.email
          }, currentAdmin?.id);
        }
        
        // If email has changed, verify password first
        if (hasEmailChanged()) {
          const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admins/${currentAdmin.id}/verify-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ currentPassword: adminData.emailChangePassword })
          });

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json().catch(() => ({}));
            const errorInfo = handleApiError({ status: verifyResponse.status, message: errorData.message }, 'email_verification');
            
            setMessage({
              text: errorInfo.message,
              type: 'error'
            });
            
            // Audit log: Email change verification failed
            auditLogger.log('email_change_verification_failed', { 
              adminId: currentAdmin?.id,
              reason: errorInfo.type 
            }, currentAdmin?.id);
            
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
            return;
          }
        }

        setIsVerifying(false);
        setIsUpdating(true);

        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admins/${currentAdmin.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          },
          body: JSON.stringify({
            email: adminData.email,
            role: 'admin', // Ensure role remains admin
            status: adminData.status
          })
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          const errorInfo = handleApiError({ status: updateResponse.status, message: errorData.message }, 'email_update');
          throw new Error(errorInfo.message);
        }
        
        // Reset rate limiter on success
        if (hasEmailChanged()) {
          emailRateLimiter.current.reset(rateLimitKey);
        }
        
        // Update Redux store with new email
        if (hasEmailChanged()) {
          dispatch(updateAdminEmail({ email: adminData.email }));
          
          // Audit log: Email change successful
          auditLogger.log('email_change_successful', { 
            adminId: currentAdmin?.id,
            oldEmail: effectiveAdminData?.email,
            newEmail: adminData.email
          }, currentAdmin?.id);
        }
        
        setMessage({ text: 'Email updated successfully!', type: 'success' });
        setIsEditing(false);
        setAdminData(prev => ({ ...prev, emailChangePassword: '' })); // Clear password field
        refreshAdmin(); // Refresh data
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } catch (error) {
        // Audit log: Email change failed
        if (hasEmailChanged()) {
          auditLogger.log('email_change_failed', { 
            adminId: currentAdmin?.id,
            error: error.message 
          }, currentAdmin?.id);
        }
        
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
    setIsEditing(false);
    setShowPasswordChange(false);
    setErrors({});
    setEmailPasswordVisibility(false); // Reset email password visibility
    // Reset email to original value and clear password field
    setAdminData(prev => ({
      ...prev,
      email: effectiveAdminData?.email || '', // Reset to original email
      emailChangePassword: '' // Clear email change password field
    }));
  };

  const handlePasswordChangeSuccess = () => {
    setShowPasswordChange(false);
    setMessage({ text: 'Password changed successfully!', type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    // Refresh admin data to get updated password change time
    refreshAdmin();
  };

  return (
    <div className={styles.mainArea}>
      <div className={styles.header}>
        <h1>Settings</h1>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {isLoadingAdmin && (
        <div className={styles.loading}>
          Loading admin data...
        </div>
      )}

      {apiError && (
        <div className={`${styles.message} ${styles.error}`}>
          <strong>Error loading admin data:</strong> {apiError?.data?.message || apiError?.message || 'Unknown error'}
          <button 
            onClick={() => refreshAdmin()} 
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      )}

      <div className={styles.settingsGrid}>
        {/* Email Settings Panel */}
        <div className={styles.settingsPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelIcon}>
              <FaEnvelope />
            </div>
            <div className={styles.panelTitle}>
              <h2>Email Address</h2>
              <p>Update your email address for notifications and login</p>
            </div>
            {!isEditing && (
              <button 
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
              >
                <FaEdit />
                Edit
              </button>
            )}
          </div>

          <div className={styles.panelContent}>
            {isEditing ? (
              <div className={styles.editForm}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={adminData.email}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="admin@organization.org"
                    disabled={isUpdating || isVerifying}
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                {/* Password verification field - only show when email has changed */}
                {hasEmailChanged() && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Current Password <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.passwordInputContainer}>
                      <input
                        type={emailPasswordVisibility ? "text" : "password"}
                        name="emailChangePassword"
                        value={adminData.emailChangePassword}
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
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.saveButton}
                    onClick={handleSaveProfile}
                    disabled={isUpdating || isVerifying}
                  >
                    {isUpdating ? 'Saving...' : isVerifying ? 'Verifying...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.displayContent}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Current Email</label>
                  <div className={styles.displayValue}>{adminData.email}</div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Account Status</label>
                  <div className={`${styles.statusBadge} ${styles[adminData.status.toLowerCase()]}`}>
                    {adminData.status}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Password Settings Panel */}
        <div className={styles.settingsPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelIcon}>
              <FaLock />
            </div>
            <div className={styles.panelTitle}>
              <h2>Password & Security</h2>
              <p>Change your password and manage security settings</p>
            </div>
            {!showPasswordChange && (
              <button 
                className={styles.editButton}
                onClick={() => setShowPasswordChange(true)}
              >
                Change
              </button>
            )}
          </div>

          <div className={styles.panelContent}>
            {showPasswordChange ? (
              <PasswordChangeForm
                adminId={currentAdmin?.id}
                onCancel={() => setShowPasswordChange(false)}
                onSuccess={handlePasswordChangeSuccess}
              />
            ) : (
              <div className={styles.displayContent}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Password Status</label>
                  <div className={styles.passwordInfo}>
                    <p className={styles.infoText}>
                      Last changed: <strong>{getPasswordChangeTime()}</strong>
                    </p>
                    <p className={styles.infoText}>
                      For security, we recommend changing your password regularly.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
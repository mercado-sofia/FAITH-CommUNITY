'use client';

import { useState, useEffect } from 'react';
import { FaEnvelope, FaEye, FaEyeSlash, FaTimes, FaCheck, FaShieldAlt, FaClock } from 'react-icons/fa';
import { useAdminEmailChange } from '../../hooks/useAdminEmailChange';
import styles from './styles/SecureEmailChangeModal.module.css';

export default function SecureEmailChangeModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  currentEmail 
}) {
  const [currentStep, setCurrentStep] = useState(1); // 1: Password verification, 2: OTP verification
  const [showPassword, setShowPassword] = useState(false);
  const [otpToken, setOtpToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  
  // Email change states
  const [emailData, setEmailData] = useState({
    newEmail: '',
    currentPassword: '',
    otp: ''
  });
  
  // Field errors
  const [fieldErrors, setFieldErrors] = useState({});
  
  // Custom hooks
  const { requestEmailChange, verifyEmailChangeOTP, isLoading } = useAdminEmailChange();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setEmailData({
        newEmail: '',
        currentPassword: '',
        otp: ''
      });
      setFieldErrors({});
      setOtpToken(null);
      setExpiresAt(null);
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    
    // Reset field errors
    setFieldErrors({});
    
    // Validation
    if (!emailData.newEmail || !emailData.currentPassword) {
      const errors = {};
      if (!emailData.newEmail) errors.newEmail = 'This field is required';
      if (!emailData.currentPassword) errors.currentPassword = 'This field is required';
      setFieldErrors(errors);
      return;
    }

    if (emailData.newEmail === currentEmail) {
      setFieldErrors({ newEmail: 'New email must be different from current email' });
      return;
    }

    // Email validation
    if (!validateEmail(emailData.newEmail)) {
      setFieldErrors({ newEmail: 'Please enter a valid email address' });
      return;
    }

    try {
      const response = await requestEmailChange({
        newEmail: emailData.newEmail,
        currentPassword: emailData.currentPassword
      });

      // Store token and expiration for step 2
      setOtpToken(response.token);
      setExpiresAt(response.expiresAt);
      setCurrentStep(2);
      
    } catch (error) {
      // Handle server error by showing field-specific error
      let errorMessage = 'Failed to request email change';
      
      if (error.message) {
        if (error.message.toLowerCase().includes('password') && error.message.toLowerCase().includes('incorrect')) {
          errorMessage = 'Wrong password';
        } else if (error.message.toLowerCase().includes('unauthorized')) {
          errorMessage = 'Wrong password';
        } else {
          errorMessage = error.message;
        }
      }
      
      setFieldErrors({ currentPassword: errorMessage });
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    
    // Reset field errors
    setFieldErrors({});
    
    // Validation
    if (!emailData.otp) {
      setFieldErrors({ otp: 'Verification code is required' });
      return;
    }

    if (emailData.otp.length !== 6) {
      setFieldErrors({ otp: 'Verification code must be 6 digits' });
      return;
    }

    try {
      const response = await verifyEmailChangeOTP({
        token: otpToken,
        otp: emailData.otp
      });

      // Call success callback
      onSuccess(response.data.email);
      onClose();
      
    } catch (error) {
      let errorMessage = 'Failed to verify code';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      setFieldErrors({ otp: errorMessage });
    }
  };

  const goBackToStep1 = () => {
    setCurrentStep(1);
    setEmailData(prev => ({
      ...prev,
      otp: ''
    }));
    setOtpToken(null);
    setExpiresAt(null);
    setFieldErrors({});
  };

  const formatTimeRemaining = () => {
    if (!expiresAt) return '';
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <FaShieldAlt className={styles.securityIcon} />
            <h2>Secure Email Change</h2>
          </div>
          <button 
            className={styles.modalCloseButton}
            onClick={onClose}
            type="button"
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Progress Indicator */}
        <div className={styles.progressIndicator}>
          <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ''}`}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepLabel}>Verify Password</div>
          </div>
          <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ''}`}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepLabel}>Enter OTP</div>
          </div>
        </div>

        {/* Step 1: Password Verification */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className={styles.emailForm}>
            <div className={styles.stepHeader}>
              <h3>Step 1: Verify Your Identity</h3>
              <p>Enter your new email and current password to continue</p>
            </div>

            <div className={styles.passwordField}>
              <label>Current Email</label>
              <input
                type="email"
                value={currentEmail}
                readOnly
                className={styles.currentEmailInput}
              />
            </div>

            <div className={styles.passwordField}>
              <label>New Email Address</label>
              <input
                type="email"
                name="newEmail"
                value={emailData.newEmail}
                onChange={handleInputChange}
                placeholder="Enter new email address"
                className={`${styles.emailInput} ${fieldErrors.newEmail ? styles.error : ''}`}
              />
              {fieldErrors.newEmail && (
                <div className={styles.fieldErrorMessage}>
                  {fieldErrors.newEmail}
                </div>
              )}
            </div>

            <div className={styles.passwordField}>
              <label>Current Password</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={emailData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="Enter current password"
                  className={fieldErrors.currentPassword ? styles.error : ''}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={togglePasswordVisibility}
                  tabIndex={-1}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {fieldErrors.currentPassword && (
                <div className={styles.fieldErrorMessage}>
                  {fieldErrors.currentPassword}
                </div>
              )}
            </div>

            <div className={styles.emailModalButtons}>
              <button 
                type="button" 
                className={styles.cancelButton}
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={styles.continueButton}
                disabled={isLoading}
              >
                {isLoading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Submit} className={styles.emailForm}>
            <div className={styles.stepHeader}>
              <h3>Step 2: Enter Verification Code</h3>
              <p>We've sent a 6-digit code to <strong>{emailData.newEmail}</strong></p>
              {expiresAt && (
                <div className={styles.timer}>
                  <FaClock />
                  <span>Code expires in: {formatTimeRemaining()}</span>
                </div>
              )}
            </div>

            <div className={styles.otpField}>
              <label>Verification Code</label>
              <input
                type="text"
                name="otp"
                value={emailData.otp}
                onChange={handleInputChange}
                placeholder="Enter 6-digit code"
                maxLength="6"
                className={`${styles.otpInput} ${fieldErrors.otp ? styles.error : ''}`}
              />
              {fieldErrors.otp && (
                <div className={styles.fieldErrorMessage}>
                  {fieldErrors.otp}
                </div>
              )}
            </div>

            <div className={styles.securityNote}>
              <FaShieldAlt />
              <p>This code was sent to your new email address to verify ownership. Check your spam folder if you don't see it.</p>
            </div>

            <div className={styles.emailModalButtons}>
              <button 
                type="button" 
                className={styles.backButton}
                onClick={goBackToStep1}
              >
                Back
              </button>
              <button 
                type="submit" 
                className={styles.verifyButton}
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : (
                  <>
                    <FaCheck />
                    Verify & Change Email
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

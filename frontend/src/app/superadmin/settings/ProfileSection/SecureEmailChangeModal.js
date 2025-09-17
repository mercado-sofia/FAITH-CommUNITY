'use client';

import { useState, useEffect } from 'react';
import { FaEnvelope, FaEye, FaEyeSlash, FaTimes, FaCheck, FaShieldAlt, FaClock, FaMobile } from 'react-icons/fa';
import { makeAuthenticatedRequest, clearAuthAndRedirect, showAuthError } from '../../../../utils/adminAuth';
import styles from './styles/SecureEmailChangeModal.module.css';

export default function SecureEmailChangeModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  currentUser 
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
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);

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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      
      return () => {
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

    if (emailData.newEmail === (currentUser?.email || currentUser?.username)) {
      setFieldErrors({ newEmail: 'New email must be different from current email' });
      return;
    }

    // Email validation
    if (!validateEmail(emailData.newEmail)) {
      setFieldErrors({ newEmail: 'Please enter a valid email address' });
      return;
    }


    setIsLoading(true);

    try {
      const requestData = {
        newEmail: emailData.newEmail,
        currentPassword: emailData.currentPassword
      };


      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/auth/email/request-change/${currentUser.id}`,
        {
          method: 'POST',
          body: JSON.stringify(requestData)
        },
        'superadmin'
      );

      if (!response) {
        // Authentication utility handled redirect
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request email change');
      }

      // Store token and expiration for step 2
      setOtpToken(data.token);
      setExpiresAt(data.expiresAt);
      setCurrentStep(2);
      
    } catch (error) {
      // Handle server error by showing field-specific error
      let errorMessage = 'Failed to request email change';
      
      if (error.message) {
        if (error.message.toLowerCase().includes('password') && error.message.toLowerCase().includes('incorrect')) {
          errorMessage = 'Wrong password';
        } else if (error.message.toLowerCase().includes('unauthorized')) {
          errorMessage = 'Wrong password';
        } else if (error.message.includes('session has expired') || error.message.includes('token')) {
          showAuthError('Your session has expired. Please log in again.');
          clearAuthAndRedirect('superadmin');
          return;
        } else {
          errorMessage = error.message;
        }
      }
      
      setFieldErrors({ currentPassword: errorMessage });
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/auth/email/verify-otp/${currentUser.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            token: otpToken,
            otp: emailData.otp
          })
        },
        'superadmin'
      );

      if (!response) {
        // Authentication utility handled redirect
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      // Call success callback
      onSuccess(data.data.email);
      onClose();
      
    } catch (error) {
      let errorMessage = 'Failed to verify code';
      
      if (error.message) {
        if (error.message.includes('session has expired') || error.message.includes('token')) {
          showAuthError('Your session has expired. Please log in again.');
          clearAuthAndRedirect('superadmin');
          return;
        } else {
          errorMessage = error.message;
        }
      }
      
      setFieldErrors({ otp: errorMessage });
    } finally {
      setIsLoading(false);
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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.securityIcon}>
              <FaShieldAlt />
            </div>
            <div className={styles.headerText}>
              <h2>Secure Email Change</h2>
              <p>Update your email address with enhanced security verification</p>
            </div>
          </div>
          <button 
            className={styles.modalCloseButton}
            onClick={onClose}
            type="button"
            disabled={isLoading}
          >
            <FaTimes />
          </button>
        </div>
        
        {/* Progress Indicator */}
        <div className={styles.progressIndicator}>
          <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ''}`}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepLabel}>Enter New Email & Verify Identity</div>
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
              <h3>Step 1: Enter New Email & Verify Your Identity</h3>
              <p>Enter your new email address and current password to continue</p>
            </div>

            <div className={styles.passwordField}>
              <label>Current Email</label>
              <input
                type="email"
                value={currentUser?.email || currentUser?.username || ''}
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
                disabled={isLoading}
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
              <p>We&apos;ve sent a 6-digit code to <strong>{emailData.newEmail}</strong></p>
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
              <p>This code was sent to your new email address to verify ownership. Check your spam folder if you don&apos;t see it.</p>
            </div>

            <div className={styles.emailModalButtons}>
              <button 
                type="button" 
                className={styles.backButton}
                onClick={goBackToStep1}
                disabled={isLoading}
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

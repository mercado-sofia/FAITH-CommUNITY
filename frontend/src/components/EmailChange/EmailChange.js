'use client';

import { useState, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaTimes, FaCheck, FaShieldAlt, FaClock, FaSpinner } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import { useEmailChange } from '@/hooks/useEmailChange';
import { useFormValidation } from '@/app/(public)/profile/hooks/useFormValidation';
import { useToast } from '@/app/(public)/components/Toast';
import LoadingSpinner from '@/components/Loader';
import styles from './EmailChange.module.css';

/**
 * Centralized Secure Email Change Component
 * Supports all user types: public, admin, superadmin
 * 
 * @param {object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {function} props.onClose - Close modal callback
 * @param {function} props.onSuccess - Success callback
 * @param {string} props.userType - 'public' | 'admin' | 'superadmin'
 * @param {string} props.currentEmail - Current user email
 * @param {object} props.currentUser - Current user object (for superadmin)
 * @param {string} props.userId - User ID (for superadmin)
 * @param {boolean} props.showSuccessModal - Whether to show success modal (public users)
 * @param {function} props.setUserData - Set user data callback (public users)
 * @param {function} props.setShowModal - Set modal state callback (public users)
 */
export default function EmailChange({
  isOpen,
  onClose,
  onSuccess,
  userType = 'public',
  currentEmail,
  currentUser,
  userId,
  showSuccessModal = false,
  setUserData,
  setShowModal
}) {
  const [showSuccessModalState, setShowSuccessModalState] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [otpToken, setOtpToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [emailChangeData, setEmailChangeData] = useState({ oldEmail: '', newEmail: '' });
  
  // Email change states
  const [emailData, setEmailData] = useState({
    newEmail: '',
    currentPassword: '',
    otp: ''
  });
  
  // Custom hooks
  const { requestEmailChange, verifyEmailChangeOTP, isLoading } = useEmailChange(userType);
  const { validateEmail, fieldErrors, setFieldError, clearAllErrors } = useFormValidation();
  const { showSuccess, showError } = useToast();

  // Get current email based on user type
  const getCurrentEmail = () => {
    if (userType === 'superadmin') {
      return currentUser?.email || currentUser?.username || '';
    }
    return currentEmail || '';
  };

  // Handle success modal close (for public users)
  const handleSuccessModalClose = () => {
    setShowSuccessModalState(false);
    if (showSuccessModal) {
      showSuccess('Your email has been successfully changed.');
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setEmailData({
        newEmail: '',
        currentPassword: '',
        otp: ''
      });
      clearAllErrors();
      setOtpToken(null);
      setExpiresAt(null);
      setShowPassword(false);
    }
  }, [isOpen, clearAllErrors]);

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
      setFieldError(name, '');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    
    // Reset field errors
    clearAllErrors();
    
    // Validation
    if (!emailData.newEmail || !emailData.currentPassword) {
      if (!emailData.newEmail) setFieldError('newEmail', 'This field is required');
      if (!emailData.currentPassword) setFieldError('currentPassword', 'This field is required');
      return;
    }

    if (emailData.newEmail === getCurrentEmail()) {
      setFieldError('newEmail', 'New email must be different from current email');
      return;
    }

    // Email validation
    if (!validateEmail(emailData.newEmail)) {
      setFieldError('newEmail', 'Please enter a valid email address');
      return;
    }

    try {
      const response = await requestEmailChange({
        newEmail: emailData.newEmail,
        currentPassword: emailData.currentPassword
      }, userId);

      // Store token and expiration for step 2
      setOtpToken(response.token || response.data?.token);
      setExpiresAt(response.expiresAt || response.data?.expiresAt);
      setCurrentStep(2);
      
      if (userType === 'public') {
        showSuccess('Verification code sent to your new email address! Check your email or console for the code.');
      }
      
    } catch (error) {
      console.error('Email change request failed:', error);
      
      // Handle server error by showing field-specific error
      let errorMessage = 'Failed to request email change';
      let targetField = 'currentPassword'; // Default to password field
      
      if (error.message) {
        const lowerMessage = error.message.toLowerCase();
        
        if (lowerMessage.includes('password') && lowerMessage.includes('incorrect')) {
          errorMessage = 'Wrong password';
          targetField = 'currentPassword';
        } else if (lowerMessage.includes('unauthorized')) {
          errorMessage = 'Wrong password';
          targetField = 'currentPassword';
        } else if (lowerMessage.includes('email') && (lowerMessage.includes('taken') || lowerMessage.includes('exists') || lowerMessage.includes('already'))) {
          errorMessage = error.message;
          targetField = 'newEmail';
        } else if (lowerMessage.includes('email') && (lowerMessage.includes('invalid') || lowerMessage.includes('format'))) {
          errorMessage = error.message;
          targetField = 'newEmail';
        } else {
          errorMessage = error.message;
          targetField = 'newEmail'; // Default email-related errors to email field
        }
      }
      
      setFieldError(targetField, errorMessage);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    
    // Reset field errors
    clearAllErrors();
    
    // Validation
    if (!emailData.otp) {
      setFieldError('otp', 'Verification code is required');
      return;
    }

    if (emailData.otp.length !== 6) {
      setFieldError('otp', 'Verification code must be 6 digits');
      return;
    }

    try {
      const response = await verifyEmailChangeOTP({
        token: otpToken,
        otp: emailData.otp
      }, userId);

      const newEmail = response.data?.email || response.data?.newEmail || response.newEmail || response.email;

      if (userType === 'public') {
        // Store email change data for the success modal
        setEmailChangeData({
          oldEmail: getCurrentEmail(),
          newEmail: newEmail
        });
        
        // Update user data in localStorage
        const updatedUserData = {
          ...JSON.parse(localStorage.getItem('userData')),
          email: newEmail
        };
        
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        if (setUserData) setUserData(updatedUserData);
        
        // Update token if provided
        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        
        // Reset form and close email change modal
        setEmailData({
          newEmail: '',
          currentPassword: '',
          otp: ''
        });
        setCurrentStep(1);
        setOtpToken(null);
        setExpiresAt(null);
        if (setShowModal) setShowModal(false);
        document.body.classList.remove('modalOpen');
        
        // Show success modal
        setShowSuccessModalState(true);
      } else {
        // Admin/Superadmin - handle new token if provided
        if (response.data?.token) {
          // Update token in localStorage for admin users
          if (userType === 'admin') {
            localStorage.setItem('adminToken', response.data.token);
            // Update admin data in localStorage if provided
            if (response.data.admin) {
              localStorage.setItem('adminData', JSON.stringify(response.data.admin));
            }
          }
        }
        
        onSuccess(newEmail);
        onClose();
      }
      
    } catch (error) {
      let errorMessage = 'Failed to verify code';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      setFieldError('otp', errorMessage);
    }
  };

  const closeEmailModal = () => {
    if (setShowModal) {
      setShowModal(false);
    } else {
      onClose();
    }
    setCurrentStep(1);
    setEmailData({
      newEmail: '',
      currentPassword: '',
      otp: ''
    });
    setShowPassword(false);
    setOtpToken(null);
    setExpiresAt(null);
    clearAllErrors();
    document.body.classList.remove('modalOpen');
  };

  const goBackToStep1 = () => {
    setCurrentStep(1);
    setEmailData(prev => ({
      ...prev,
      otp: ''
    }));
    setOtpToken(null);
    setExpiresAt(null);
    clearAllErrors();
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

  const modalContent = (
    <div className={styles.modalOverlay} onClick={closeEmailModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.securityIcon}>
              <FaShieldAlt />
            </div>
            <div className={styles.headerText}>
              <h2>Secure Email Change</h2>
              <p>Update your email address securely with verification</p>
            </div>
          </div>
          <button 
            className={styles.modalCloseButton}
            onClick={closeEmailModal}
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
          <>
            <form onSubmit={handleStep1Submit} className={styles.emailForm}>
              <div className={styles.stepHeader}>
                <h3>Step 1: Enter New Email & Verify Your Identity</h3>
                <p>Enter your new email address and current password to continue</p>
              </div>

              <div className={styles.passwordField}>
                <label>Current Email</label>
                <input
                  type="email"
                  value={getCurrentEmail()}
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
            </form>
            
            <div className={styles.emailModalButtons}>
              <button 
                type="button" 
                className={styles.cancelButton}
                onClick={closeEmailModal}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className={styles.continueButton}
                onClick={handleStep1Submit}
                disabled={isLoading}
              >
                {isLoading ? 'Sending' : 'Send Verification Code'}
                {isLoading && <FaSpinner className={styles.spinner} />}
              </button>
            </div>
          </>
        )}

        {/* Step 2: OTP Verification */}
        {currentStep === 2 && (
          <>
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
            </form>
            
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
                type="button" 
                className={styles.verifyButton}
                onClick={handleStep2Submit}
                disabled={isLoading}
              >
                <FaCheck />
                Verify & Change Email
                {isLoading && <FaSpinner className={styles.spinner} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Render modal with portal for public users, inline for admin/superadmin */}
      {userType === 'public' ? createPortal(modalContent, document.body) : modalContent}

    </>
  );
}

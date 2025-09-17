'use client';

import { useState, useEffect } from 'react';
import { FaEnvelope, FaEye, FaEyeSlash, FaTimes, FaCheck, FaShieldAlt, FaClock } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import { useProfileApi } from '../../../hooks/useApiCall';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { useToast } from '../../../components/Toast';
import LoadingSpinner from '../../../components/LoadingSpinner';
import EmailChangeSuccessModal from './EmailChangeSuccessModal';
import styles from './SecureEmailChange.module.css';

export default function SecureEmailChange({ userData, setUserData }) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Password verification, 2: OTP verification
  const [otpToken, setOtpToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [emailChangeData, setEmailChangeData] = useState({ oldEmail: '', newEmail: '' });
  
  // Email change states
  const [emailData, setEmailData] = useState({
    newEmail: '',
    currentPassword: '',
    otp: ''
  });
  
  // Custom hooks
  const { requestEmailChange, verifyEmailChangeOTP, isLoading } = useProfileApi();
  const { validateEmail, fieldErrors, setFieldError, clearAllErrors } = useFormValidation();
  const { showSuccess, showError } = useToast();

  // Handle success modal close
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Show toast notification after modal is closed
    showSuccess('Your email has been successfully changed.');
  };

  // Debug userData changes
  useEffect(() => {
    console.log('UserData changed in SecureEmailChange:', userData);
    console.log('Force update count:', forceUpdate);
  }, [userData, forceUpdate]);

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

    if (emailData.newEmail === userData.email) {
      setFieldError('newEmail', 'New email must be different from current email');
      return;
    }

    // Email validation
    if (!validateEmail(emailData.newEmail)) {
      setFieldError('newEmail', 'Please enter a valid email address');
      return;
    }

    try {
      console.log('Sending email change request with data:', {
        newEmail: emailData.newEmail,
        currentPassword: emailData.currentPassword ? '[HIDDEN]' : '[MISSING]'
      });
      
      const response = await requestEmailChange({
        newEmail: emailData.newEmail,
        currentPassword: emailData.currentPassword
      });

      console.log('Email change request successful:', response);
      console.log('Response data structure:', {
        hasData: !!response.data,
        hasToken: !!response.data?.token,
        hasExpiresAt: !!response.data?.expiresAt,
        token: response.data?.token,
        expiresAt: response.data?.expiresAt
      });

      // Store token and expiration for step 2
      setOtpToken(response.data.token);
      setExpiresAt(response.data.expiresAt);
      setCurrentStep(2);
      
      showSuccess('Verification code sent to your new email address! Check your email or console for the code.');
      
    } catch (error) {
      console.error('Email change request failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      
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
      
      setFieldError('currentPassword', errorMessage);
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
      console.log('Verifying OTP with data:', {
        token: otpToken,
        otp: emailData.otp,
        tokenExists: !!otpToken,
        otpLength: emailData.otp?.length
      });
      
      const response = await verifyEmailChangeOTP({
        token: otpToken,
        otp: emailData.otp
      });

      console.log('Email change verification successful:', response);
      console.log('New email from response:', response.data?.newEmail);

      // Store email change data for the success modal
      setEmailChangeData({
        oldEmail: userData.email,
        newEmail: response.data.newEmail
      });
      
      // Update user data in localStorage
      const updatedUserData = {
        ...userData,
        email: response.data.newEmail
      };
      
      console.log('Updating user data:', {
        oldEmail: userData.email,
        newEmail: response.data.newEmail,
        updatedUserData
      });
      
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      setUserData(updatedUserData);
      
      // Force component re-render
      setForceUpdate(prev => prev + 1);
      
      // Verify the update worked
      console.log('UserData before update:', userData);
      console.log('Updated userData being set:', updatedUserData);
      
      // Reset form and close email change modal
      setEmailData({
        newEmail: '',
        currentPassword: '',
        otp: ''
      });
      setCurrentStep(1);
      setOtpToken(null);
      setExpiresAt(null);
      setShowEmailModal(false);
      document.body.classList.remove('modalOpen');
      
      // Show success modal
      setShowSuccessModal(true);
      
    } catch (error) {
      let errorMessage = 'Failed to verify code';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      setFieldError('otp', errorMessage);
    }
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
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


  return (
    <div className={styles.emailSection}>
      <div className={styles.sectionHeader}>
        <h2>Email</h2>
      </div>

      <div className={styles.emailContent}>
        {/* Current Email Display */}
        <div className={styles.infoItem}>
          <div className={styles.infoContent}>
            <label>Current Email</label>
            <p>{userData.email}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className={styles.actionButtons}>
          <button 
            onClick={() => {
              setShowEmailModal(true);
              document.body.classList.add('modalOpen');
            }} 
            className={styles.changeEmailButton}
          >
            <FaEnvelope />
            <span>Change Email</span>
          </button>
        </div>
      </div>

      {/* Secure Email Change Modal */}
      {showEmailModal && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.headerContent}>
                <FaShieldAlt className={styles.securityIcon} />
                <h2>Secure Email Change</h2>
              </div>
              <button 
                className={styles.modalCloseButton}
                onClick={closeEmailModal}
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
                    value={userData.email}
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
                    onClick={closeEmailModal}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.continueButton}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="small" message="" />
                        Sending Code...
                      </>
                    ) : (
                      'Send Verification Code'
                    )}
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
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className={styles.verifyButton}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="small" message="" />
                        Verifying...
                      </>
                    ) : (
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
        </div>,
        document.body
      )}

      {/* Success Confirmation Modal */}
      {showSuccessModal && emailChangeData.newEmail && emailChangeData.oldEmail && (
        <EmailChangeSuccessModal
          isOpen={showSuccessModal}
          onClose={handleSuccessModalClose}
          newEmail={emailChangeData.newEmail}
          oldEmail={emailChangeData.oldEmail}
        />
      )}
    </div>
  );
}

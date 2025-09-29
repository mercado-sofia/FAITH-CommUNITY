'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaShieldAlt, FaQrcode, FaCheck, FaTimes, FaSpinner, FaMobile } from 'react-icons/fa';
import Image from 'next/image';
import styles from './TwoFAModal.module.css';

export default function TwoFAModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  currentUser 
}) {
  const [secret, setSecret] = useState("");
  const [otpauth, setOtpauth] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [twofaEnabled, setTwofaEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState(1); // 1: Setup, 2: Verify, 3: Complete

  const checkTwoFAStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/superadmin/auth/profile/${currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setTwofaEnabled(data.twofa_enabled || false);
        }
      }
    } catch (error) {
      // Handle error silently in production
    }
  }, [currentUser.id]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSetupStep(1);
      setSecret("");
      setOtpauth("");
      setQrCode("");
      setToken("");
      setShowQRCode(false);
      setMessage("");
      checkTwoFAStatus();
    }
  }, [isOpen, checkTwoFAStatus]);

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

  const handleSetup = async () => {
    setLoading(true);
    setMessage("");
    try {
      const token = localStorage.getItem('superAdminToken');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const resp = await fetch(`${baseUrl}/api/superadmin/auth/2fa/setup/${currentUser.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      // Check if response is JSON before parsing
      const contentType = resp.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response. Please try again.');
      }
      
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Setup failed');
      
      setSecret(data.secret);
      setOtpauth(data.otpauth);
      setQrCode(data.qrCode || "");
      setSetupStep(2);
      setMessage(data.message);
    } catch (e) {
      setMessage(e.message);
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!token || token.length !== 6) {
      setMessage('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const authToken = localStorage.getItem('superAdminToken');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const resp = await fetch(`${baseUrl}/api/superadmin/auth/2fa/verify/${currentUser.id}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });
      
      // Check if response is JSON before parsing
      const contentType = resp.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response. Please try again.');
      }
      
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Verification failed');
      
      setSetupStep(3);
      setTwofaEnabled(true);
      setMessage(data.message);
    } catch (e) {
      setMessage(e.message);
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    setMessage("");
    try {
      const token = localStorage.getItem('superAdminToken');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const resp = await fetch(`${baseUrl}/api/superadmin/auth/2fa/disable/${currentUser.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      // Check if response is JSON before parsing
      const contentType = resp.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response. Please try again.');
      }
      
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Disable failed');
      
      setTwofaEnabled(false);
      setSetupStep(1);
      setSecret("");
      setOtpauth("");
      setQrCode("");
      setToken("");
      setShowQRCode(false);
      setMessage(data.message);
      onSuccess(); // Refresh the parent component
    } catch (e) {
      setMessage(e.message);
    }
    setLoading(false);
  };

  const resetSetup = () => {
    setSetupStep(1);
    setSecret("");
    setOtpauth("");
    setQrCode("");
    setToken("");
    setShowQRCode(false);
    setMessage("");
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <FaShieldAlt />
            </div>
            <div className={styles.headerText}>
              <h2>Two-Factor Authentication</h2>
              <p>Add an extra layer of security to your account</p>
            </div>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            disabled={loading}
          >
            <FaTimes />
          </button>
        </div>

        {/* Modal Content */}
        <div className={styles.modalContent}>
          {message && (
            <div className={`${styles.message} ${
              message.includes('success') || message.includes('enabled') 
                ? styles.success 
                : styles.error
            }`}>
              {message}
            </div>
          )}

          {!twofaEnabled ? (
            <>
              {setupStep === 1 && (
                <div className={styles.setupContainer}>
                  <div className={styles.setupInfo}>
                    <div className={styles.setupIcon}>
                      <FaShieldAlt />
                    </div>
                    <h3 className={styles.setupTitle}>Enable Two-Factor Authentication</h3>
                    <p className={styles.setupDescription}>
                      Protect your account with an authenticator app (TOTP). 
                      Codes change every 30 seconds for enhanced security.
                    </p>
                  </div>
                  
                  <button 
                    className={styles.setupButton}
                    onClick={handleSetup} 
                    disabled={loading}
                  >
                    {loading ? <FaSpinner className={styles.spinner} /> : <FaShieldAlt />}
                    Setup 2FA
                  </button>
                </div>
              )}

              {setupStep === 2 && (
                <div className={styles.verificationContainer}>
                  <div className={styles.setupInfo}>
                    <div className={styles.setupIcon}>
                      <FaMobile />
                    </div>
                    <h3 className={styles.setupTitle}>Add to Authenticator App</h3>
                    <p className={styles.setupDescription}>
                      Add this account to your authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                  </div>
                  
                  <div className={styles.manualEntryContainer}>
                    <h4 className={styles.manualEntryTitle}>Manual Entry Instructions:</h4>
                    <ol className={styles.instructionsList}>
                      <li>Open your authenticator app (Google Authenticator, Authy, etc.)</li>
                      <li>Select &quot;Add Account&quot; or &quot;Manual Entry&quot;</li>
                      <li>Enter the account name and secret key below</li>
                      <li>Save the account and get your 6-digit code</li>
                    </ol>
                    
                    <div className={styles.accountInfo}>
                      <div className={styles.accountField}>
                        <label className={styles.accountLabel}>Account Name:</label>
                        <div className={styles.accountValue}>
                          FAITH-CommUNITY:superadmin-{currentUser.id}
                        </div>
                      </div>
                      <div className={styles.accountField}>
                        <label className={styles.accountLabel}>Secret Key:</label>
                        <div className={styles.secretKey}>
                          {secret}
                        </div>
                      </div>
                    </div>
                  </div>

                  {qrCode && (
                    <>
                      <button 
                        className={styles.qrToggleButton}
                        onClick={() => setShowQRCode(!showQRCode)}
                      >
                        <FaQrcode />
                        {showQRCode ? 'Hide' : 'Show'} QR Code (Optional)
                      </button>

                      {showQRCode && (
                        <div className={styles.qrContainer}>
                          <p className={styles.qrDescription}>
                            Scan this QR code as an alternative to manual entry:
                          </p>
                          <div className={styles.qrImage}>
                            <Image src={qrCode} alt="2FA QR Code" width={150} height={150} />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Verification Code</label>
                    <input 
                      value={token} 
                      onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))} 
                      maxLength={6} 
                      placeholder="Enter 6-digit code from your app"
                      className={styles.verificationInput}
                    />
                  </div>
                  
                  <div className={styles.actionButtons}>
                    <button 
                      className={styles.saveButton}
                      onClick={handleVerify} 
                      disabled={loading || !token || token.length !== 6}
                    >
                      {loading ? <FaSpinner className={styles.spinner} /> : <FaCheck />}
                      Verify & Enable
                    </button>
                    <button 
                      className={styles.cancelButton}
                      onClick={resetSetup}
                      disabled={loading}
                    >
                      <FaTimes />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {setupStep === 3 && (
                <div className={styles.successContainer}>
                  <div className={styles.successIcon}>
                    <FaCheck />
                  </div>
                  <h3 className={styles.successTitle}>2FA Enabled Successfully!</h3>
                  <p className={styles.successDescription}>
                    Your account is now protected with two-factor authentication.
                  </p>
                  <button 
                    className={styles.setupButton}
                    onClick={resetSetup}
                  >
                    Setup Another Device
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.enabledContainer}>
              <div className={styles.enabledIcon}>
                <FaShieldAlt />
              </div>
              <h3 className={styles.enabledTitle}>2FA is Active</h3>
              <p className={styles.enabledDescription}>
                Your account is protected with two-factor authentication.
              </p>
              <button 
                className={styles.disableButton}
                onClick={handleDisable}
                disabled={loading}
              >
                {loading ? <FaSpinner className={styles.spinner} /> : <FaTimes />}
                Disable 2FA
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

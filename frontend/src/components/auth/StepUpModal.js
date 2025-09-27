"use client";

import { useState, useEffect } from 'react';
import styles from '../styles/StepUpModal.module.css';

export default function StepUpModal({ 
  open, 
  mode = "otp", 
  onClose, 
  onSubmit, 
  loading = false,
  title,
  description,
  error = null
}) {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (open) {
      setOtp("");
      setPassword("");
      setLocalError("");
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");
    
    if (mode === 'otp') {
      if (!otp.trim() || otp.length !== 6) {
        setLocalError('Please enter a valid 6-digit code');
        return;
      }
    } else if (mode === 'password') {
      if (!password.trim()) {
        setLocalError('Please enter your password');
        return;
      }
    }
    
    onSubmit(mode === 'otp' ? { otp } : { password });
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setLocalError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setLocalError("");
  };

  if (!open) return null;

  const modalTitle = title || (mode === 'otp' ? 'Confirm with OTP' : 'Confirm with Password');
  const modalDescription = description || (mode === 'otp' 
    ? 'Enter the 6-digit code from your authenticator app to continue.' 
    : 'Enter your current password to proceed with this action.');

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{modalTitle}</h3>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close">
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.description}>{modalDescription}</p>
          
          {(error || localError) && (
            <div className={styles.errorMessage}>
              {error || localError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              {mode === 'otp' ? (
                <>
                  <label htmlFor="otp-code" className={styles.label}>
                    Enter 6-digit OTP code:
                  </label>
                  <input
                    id="otp-code"
                    type="text"
                    value={otp}
                    onChange={handleOtpChange}
                    placeholder="123456"
                    maxLength={6}
                    className={styles.otpInput}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                  />
                  <div className={styles.otpHelp}>
                    Open your authenticator app and enter the 6-digit code
                  </div>
                </>
              ) : (
                <>
                  <label htmlFor="password" className={styles.label}>
                    Enter your current password:
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Enter your password"
                    className={styles.passwordInput}
                    autoComplete="current-password"
                  />
                </>
              )}
            </div>
            
            <div className={styles.actions}>
              <button 
                type="button" 
                onClick={onClose} 
                className={styles.cancelButton}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading || (mode === 'otp' ? otp.length !== 6 : !password.trim())}
                className={styles.submitButton}
              >
                {loading ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

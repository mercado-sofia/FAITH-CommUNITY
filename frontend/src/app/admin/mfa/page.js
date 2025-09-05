"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import QRCode from 'qrcode';
import styles from './mfa.module.css';

export default function AdminMfaPage() {
  const router = useRouter();
  const [setupData, setSetupData] = useState(null);
  const [otp, setOtp] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mfaStatus, setMfaStatus] = useState(null);

  const checkMfaStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/admin/check-mfa', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMfaStatus(data.mfaEnabled);
      }
    } catch (err) {
      console.error('Error checking MFA status:', err);
    }
  }, [router]);

  useEffect(() => {
    checkMfaStatus();
  }, [checkMfaStatus]);


  const handleSetupMfa = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/setup-mfa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSetupData(data);
        
        // Generate QR code
        const qrUrl = await QRCode.toDataURL(data.otpauthUri);
        setQrCodeUrl(qrUrl);
        setMessage('Scan the QR code with your authenticator app');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to setup MFA');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/verify-mfa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otp })
      });

      if (response.ok) {
        setMessage('MFA enabled successfully!');
        setSetupData(null);
        setQrCodeUrl('');
        setOtp('');
        checkMfaStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Invalid OTP code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will reduce your account security.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/disable-mfa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('MFA disabled successfully');
        checkMfaStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to disable MFA');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/admin/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.logoContainer}>
          <Image src="/logo/faith_community_logo.png" alt="FAITH Community" width={120} height={120} className={styles.logo} />
        </div>
        <div className={styles.panelContent}>
          <h2 className={styles.panelTitle}>Multi-Factor Authentication</h2>
          <p className={styles.panelDescription}>
            Secure your admin account with an additional layer of protection using authenticator apps like Google Authenticator or Authy.
          </p>
          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🔐</span>
              <span>Enhanced Security</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📱</span>
              <span>Authenticator App</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>⚡</span>
              <span>Quick Setup</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.rightContent}>
        <div className={styles.contentContainer}>
          <div className={styles.header}>
            <button onClick={handleBack} className={styles.backButton}>
              ← Back to Dashboard
            </button>
            <h1 className={styles.title}>MFA Management</h1>
          </div>

          <div className={styles.statusCard}>
            <div className={styles.statusHeader}>
              <span className={styles.statusIcon}>
                {mfaStatus ? '🟢' : '🔴'}
              </span>
              <span className={styles.statusText}>
                MFA Status: {mfaStatus ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className={styles.statusDescription}>
              {mfaStatus 
                ? 'Your account is protected with multi-factor authentication.'
                : 'Your account is not protected with multi-factor authentication.'
              }
            </p>
          </div>

          {message && (
            <div className={styles.successMessage}>
              {message}
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.actions}>
            {!mfaStatus && !setupData && (
              <button 
                onClick={handleSetupMfa}
                disabled={loading}
                className={styles.primaryButton}
              >
                {loading ? 'Setting up...' : 'Setup MFA'}
              </button>
            )}

            {setupData && (
              <div className={styles.setupSection}>
                <h3 className={styles.sectionTitle}>Setup Instructions</h3>
                <div className={styles.qrContainer}>
                  {qrCodeUrl && (
                    <Image src={qrCodeUrl} alt="MFA QR Code" width={200} height={200} className={styles.qrCode} />
                  )}
                </div>
                <p className={styles.instructionText}>
                  1. Open your authenticator app (Google Authenticator, Authy, etc.)<br/>
                  2. Scan the QR code above<br/>
                  3. Enter the 6-digit code from your app below
                </p>
                <div className={styles.otpInput}>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className={styles.otpField}
                  />
                </div>
                <div className={styles.setupActions}>
                  <button 
                    onClick={handleVerifyMfa}
                    disabled={loading || otp.length !== 6}
                    className={styles.primaryButton}
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                  <button 
                    onClick={() => {
                      setSetupData(null);
                      setQrCodeUrl('');
                      setOtp('');
                      setError('');
                      setMessage('');
                    }}
                    className={styles.secondaryButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {mfaStatus && (
              <button 
                onClick={handleDisableMfa}
                disabled={loading}
                className={styles.dangerButton}
              >
                {loading ? 'Disabling...' : 'Disable MFA'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

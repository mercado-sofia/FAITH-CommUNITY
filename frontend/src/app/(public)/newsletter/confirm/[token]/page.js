'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { FaRegCircleXmark } from 'react-icons/fa6';
import { MdErrorOutline } from 'react-icons/md';
import styles from './confirmPage.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8080';

export default function SubscriptionConfirmPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid confirmation link. Please check your email and try again.');
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/subscription/confirm/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: ac.signal,
        });
        const data = await res.json();

        if (ac.signal.aborted) return;

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Subscription confirmed successfully!');
          setEmail(data.email || '');
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to confirm subscription. Please try again.');
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        setStatus('error');
        setMessage('Network error. Please check your connection and try again.');
      }
    })();

    return () => ac.abort();
  }, [token]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className={styles.loadingContainer}>
            <FaSpinner className={styles.spinner} />
            <h2>Confirming your subscription...</h2>
            <p>Please wait while we verify your email address.</p>
          </div>
        );

      case 'success':
        return (
          <div className={styles.successContainer}>
            <FaCheckCircle className={styles.successIcon} />
            <h2>Welcome to FAITH CommUNITY!</h2>
            <p className={styles.successMessage}>{message}</p>
            {email && (
              <p className={styles.emailInfo}>
                Email: <strong>{email}</strong>
              </p>
            )}
            <div className={styles.successDetails}>
              <p>You&apos;re now subscribed to our newsletter and will receive updates about:</p>
              <ul>
                <li>Upcoming programs and events</li>
                <li>Volunteer opportunities</li>
                <li>Community impact stories</li>
                <li>Organization news and updates</li>
              </ul>
            </div>
            <div className={styles.actionButtons}>
              <Link href="/" className={styles.primaryButton}>
                Return to Home
              </Link>
              <Link href="/news" className={styles.secondaryButton}>
                Browse News
              </Link>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className={styles.errorContainer}>
            <FaRegCircleXmark className={styles.headingIcon} />
            <h2>Confirmation Failed</h2>
            <div className={styles.errorMessage}>
              <MdErrorOutline className={styles.errorMessageIcon} />
              <span className={styles.errorMessageText}>{message}</span>
            </div>
            <div className={styles.errorDetails}>
              <p>This could happen if:</p>
              <ul>
                <li>The confirmation link has expired</li>
                <li>The link has already been used</li>
                <li>There was a temporary issue with our servers</li>
              </ul>
            </div>
            <div className={styles.actionButtons}>
              <Link href="/" className={styles.primaryButton}>
                Return to Home
              </Link>
              <button 
                onClick={() => window.location.reload()} 
                className={styles.secondaryButton}
              >
                Try Again
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.mainContent}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

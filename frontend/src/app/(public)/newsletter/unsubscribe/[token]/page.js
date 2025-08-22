'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { FaRegCircleXmark } from 'react-icons/fa6';
import { MdErrorOutline } from 'react-icons/md';
import styles from './unsubscribePage.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8080";

export default function NewsletterUnsubscribePage() {
  const params = useParams();
  const token = params.token;
  
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid unsubscribe link. Please check your email and try again.');
      return;
    }

    unsubscribeFromNewsletter();
  }, [token]);

  const unsubscribeFromNewsletter = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/newsletter/unsubscribe/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Successfully unsubscribed from newsletter.');
        setEmail(data.email || '');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to unsubscribe. Please try again.');
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className={styles.loadingContainer}>
            <FaSpinner className={styles.spinner} />
            <h2>Processing your request...</h2>
            <p>Please wait while we unsubscribe you from our newsletter.</p>
          </div>
        );

      case 'success':
        return (
          <div className={styles.successContainer}>
            <FaCheckCircle className={styles.successIcon} />
            <h2>Unsubscribed Successfully</h2>
            <p className={styles.successMessage}>{message}</p>
            {email && (
              <p className={styles.emailInfo}>
                Email: <strong>{email}</strong>
              </p>
            )}
            <div className={styles.successDetails}>
              <p>You have been removed from our newsletter mailing list. You will no longer receive:</p>
              <ul>
                <li>Program and event updates</li>
                <li>Volunteer opportunity notifications</li>
                <li>Community impact stories</li>
                <li>Organization news and updates</li>
              </ul>
              <p className={styles.resubscribeNote}>
                If you change your mind, you can always resubscribe through our website or by contacting us directly.
              </p>
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
            <h2>Unsubscribe Failed</h2>
            <div className={styles.errorMessage}>
              <MdErrorOutline className={styles.errorMessageIcon} />
              <span className={styles.errorMessageText}>{message}</span>
            </div>
            <div className={styles.errorDetails}>
              <p>This could happen if:</p>
              <ul>
                <li>The unsubscribe link has expired</li>
                <li>The link has already been used</li>
                <li>There was a temporary issue with our servers</li>
                <li>You're not currently subscribed to our newsletter</li>
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

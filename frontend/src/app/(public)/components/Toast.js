"use client";

import { useState, useEffect } from 'react';
import { FiCheckCircle, FiX, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import styles from './styles/Toast.module.css';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`${styles.toast} ${styles[type]} ${isVisible ? styles.show : styles.hide}`}>
      <div className={styles.toastContent}>
        <div className={styles.toastIcon}>
          {type === 'success' && <FiCheckCircle />}
          {type === 'error' && <FiAlertCircle />}
          {type === 'warning' && <FiAlertTriangle />}
          {type === 'info' && <FiInfo />}
        </div>
        <div className={styles.toastMessage}>
          {message}
        </div>
        <button 
          className={styles.toastClose} 
          onClick={handleClose}
          aria-label="Close toast"
        >
          <FiX />
        </button>
      </div>
      <div className={styles.toastProgress}>
        <div 
          className={styles.progressBar} 
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}

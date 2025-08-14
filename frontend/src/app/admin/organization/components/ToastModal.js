'use client'

import { useEffect } from 'react'
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa'
import styles from './styles/ToastModal.module.css'

export default function ToastModal({
  isOpen,
  message,
  onClose
}) {
  // Auto-close modal after 3 seconds
  useEffect(() => {
    if (isOpen && message?.text) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, message, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen || !message?.text) return null;

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <FaCheckCircle className={styles.successIcon} />;
      case 'error':
        return <FaExclamationTriangle className={styles.errorIcon} />;
      case 'info':
        return <FaInfoCircle className={styles.infoIcon} />;
      default:
        return <FaInfoCircle className={styles.infoIcon} />;
    }
  };

  const getTitle = () => {
    switch (message.type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'info':
        return 'Information';
      default:
        return 'Message';
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.titleContainer}>
            {getIcon()}
            <h3 className={styles.modalTitle}>{getTitle()}</h3>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <p className={styles.messageText}>{message.text}</p>
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            className={styles.okButton}
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

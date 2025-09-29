'use client';

import { useEffect, useRef } from 'react';
import { FaCircleCheck } from "react-icons/fa6";
import { TiDelete } from "react-icons/ti";
import { FiX } from 'react-icons/fi';
import styles from './SuccessModal.module.css';

export default function SuccessModal({ 
  message, 
  isVisible, 
  onClose, 
  type = 'success',
  autoHideDuration = 0 
}) {
  const scrollPositionRef = useRef(0);
  const isError = type === 'error' || type === 'failed';

  // Auto-hide functionality
  useEffect(() => {
    if (isVisible && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideDuration, onClose]);

  // Preserve scroll position and lock body scroll when modal opens/closes
  useEffect(() => {
    if (isVisible) {
      // Save current scroll position when modal opens
      scrollPositionRef.current = window.scrollY;
      
      // Lock body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal closes
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      
      // Restore scroll position
      window.scrollTo(0, scrollPositionRef.current);
    }

    // Cleanup function
    return () => {
      if (isVisible) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollPositionRef.current);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.topRow}>
          <div className={`${styles.successIconContainer} ${isError ? styles.errorIconContainer : ''}`}>
            <div className={`${styles.successIconInner} ${isError ? styles.errorIconInner : ''}`}>
              {isError ? <TiDelete /> : <FaCircleCheck />}
            </div>
          </div>
          
          <button 
            className={styles.closeBtn}
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>
        
        <div className={styles.content}>
          <h3>{isError ? 'Error' : 'Success'}</h3>
          
          <p>{message}</p>
        </div>

        <div className={styles.actions}>
          <button
            onClick={onClose}
            className={`${styles.confirmBtn} ${isError ? styles.errorBtn : ''}`}
          >
            {isError ? 'Close' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

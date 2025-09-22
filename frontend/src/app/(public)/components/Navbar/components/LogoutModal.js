'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import styles from './styles/LogoutModal.module.css';

export default function LogoutModal({ isOpen, onClose, onConfirm, isMounted }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleOverlayClick = () => {
    if (!isLoggingOut) onClose();
  };
  
  const stop = (e) => e.stopPropagation();
  
  const handleConfirm = async () => {
    setIsLoggingOut(true);
    await onConfirm();
  };

  if (!isOpen || !isMounted) {
    return null;
  }

  return createPortal(
    <div 
      className={styles.logoutModalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      onClick={handleOverlayClick}
    >
      <div className={styles.logoutModal} role="document" onClick={stop}>
        
        <div id="logout-title" className={styles.logoutModalTitle}>
          Logout
        </div>
        
        <div className={styles.logoutModalText}>
          {isLoggingOut ? 'Logging out...' : 'Are you sure you want to logout?'}
        </div>

        <div className={styles.logoutButtonGroup}>
          <button 
            className={styles.logoutTextBtn} 
            onClick={handleConfirm}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <div className={styles.spinner}></div>
                Logging out...
              </>
            ) : (
              'Logout'
            )}
          </button>
          <button 
            className={styles.cancelBtn} 
            onClick={onClose}
            disabled={isLoggingOut}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

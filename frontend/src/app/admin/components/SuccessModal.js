import { useEffect } from 'react';
import { FaCircleCheck } from "react-icons/fa6";
import { FiX } from 'react-icons/fi';
import styles from './styles/SuccessModal.module.css';

export default function SuccessModal({ 
  message, 
  isVisible, 
  onClose, 
  type = 'success',
  autoHideDuration = 0 
}) {
  useEffect(() => {
    if (isVisible && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHideDuration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.topRow}>
          <div className={styles.successIconContainer}>
            <div className={styles.successIconInner}>
              <FaCircleCheck />
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
          <h3>Success</h3>
          
          <p>{message}</p>
        </div>

        <div className={styles.actions}>
          <button
            onClick={onClose}
            className={styles.confirmBtn}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

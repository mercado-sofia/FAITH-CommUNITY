import { useEffect } from 'react';
import { FiCheckCircle, FiX } from 'react-icons/fi';
import styles from './styles/SuccessModal.module.css';

export default function SuccessModal({ 
  message, 
  isVisible, 
  onClose, 
  type = 'success',
  autoHideDuration = 3000 
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

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className={styles.successIcon} />;
      case 'error':
        return <FiX className={styles.errorIcon} />;
      case 'warning':
        return <FiX className={styles.warningIcon} />;
      default:
        return <FiCheckCircle className={styles.successIcon} />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'success':
        return 'Success!';
      case 'error':
        return 'Error!';
      case 'warning':
        return 'Warning!';
      default:
        return 'Success!';
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} ${styles[type] || ''}`}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {getIcon()}
            <span>{getTitle()}</span>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close notification"
          >
            <FiX size={20} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalMessage}>{message}</p>
        </div>
      </div>
    </div>
  );
}

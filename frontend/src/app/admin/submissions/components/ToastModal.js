import { useEffect } from 'react';
import { FiCheckCircle, FiX } from 'react-icons/fi';
import styles from './styles/ToastModal.module.css';

export default function ToastModal({ 
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

  return (
    <div className={styles.toastOverlay}>
      <div className={`${styles.toastModal} ${styles[type]}`}>
        <div className={styles.toastContent}>
          {getIcon()}
          <span className={styles.toastMessage}>{message}</span>
        </div>
        <button 
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close notification"
        >
          <FiX size={16} />
        </button>
      </div>
    </div>
  );
}

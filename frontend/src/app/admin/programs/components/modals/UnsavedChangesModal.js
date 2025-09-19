'use client';

import styles from './UnsavedChangesModal.module.css';

const UnsavedChangesModal = ({ onConfirm, onCancel }) => {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Unsaved Changes</h3>
        </div>
        
        <div className={styles.modalBody}>
          <p className={styles.message}>
            You have unsaved changes. Are you sure you want to close?
          </p>
          <p className={styles.submessage}>
            Your changes will be lost if you continue.
          </p>
        </div>
        
        <div className={styles.modalActions}>
          <button 
            className={styles.cancelButton} 
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button 
            className={styles.confirmButton} 
            onClick={onConfirm}
            type="button"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;

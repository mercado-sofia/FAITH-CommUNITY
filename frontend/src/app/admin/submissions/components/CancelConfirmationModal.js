'use client';
import styles from './cancelModal.module.css';

export default function CancelConfirmationModal({ onConfirm, onClose }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <p className={styles.message}>Are you sure you want to cancel this submission?</p>
        <div className={styles.actions}>
          <button onClick={onConfirm} className={styles.confirmBtn}>Yes</button>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

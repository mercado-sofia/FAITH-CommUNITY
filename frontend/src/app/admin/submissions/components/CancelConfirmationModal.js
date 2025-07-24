import styles from './cancelModal.module.css';

export default function CancelConfirmation({ onConfirm, onCancel }) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalBox}>
        <h3>Are you sure you want to cancel this submission?</h3>
        <div className={styles.actionButtons}>
          <button onClick={onConfirm} className={styles.confirmBtn}>Yes, Cancel</button>
          <button onClick={onCancel} className={styles.cancelBtn}>No, Go Back</button>
        </div>
      </div>
    </div>
  );
}
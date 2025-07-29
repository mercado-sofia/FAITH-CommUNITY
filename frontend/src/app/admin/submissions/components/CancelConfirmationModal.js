import styles from './styles/ConfirmationModal.module.css';

export default function CancelConfirmation({ onConfirm, onCancel }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Cancel Submission</h3>
        </div>
        <div className={styles.body}>
          <p>Are you sure you want to cancel this submission?</p>
          <p>This will withdraw the submission from superadmin review.</p>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Keep Submission
          </button>
          <button className={styles.deleteBtn} onClick={onConfirm}>
            Cancel Submission
          </button>
        </div>
      </div>
    </div>
  );
}
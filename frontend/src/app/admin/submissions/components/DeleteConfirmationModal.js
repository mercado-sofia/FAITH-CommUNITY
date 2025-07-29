import styles from './styles/ConfirmationModal.module.css';

export default function DeleteConfirmation({ onConfirm, onCancel }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Delete Submission</h3>
        </div>
        <div className={styles.body}>
          <p>Are you sure you want to permanently delete this submission?</p>
          <p className={styles.warning}>
            <strong>Warning:</strong> This action cannot be undone. The submission will be completely removed from your records.
          </p>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.deleteBtn} onClick={onConfirm}>
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}

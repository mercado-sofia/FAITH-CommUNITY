import styles from '../../styles/volunteers.module.css';

export default function ConfirmationModal({ action, onConfirm, onCancel }) {
  const text =
    action === 'Approved'
      ? 'Do you accept the application?'
      : 'Do you reject the application?';

  return (
    <div className={styles.modal}>
      <div className={styles.ConfirmmodalContent}>
        <h3 className={styles.ConfirmmodalHeading}>Confirm Action</h3>
        <p className={styles.ConfirmmodalText}>{text}</p>
        <div className={styles.actions}>
          <button className={styles.actionButton} onClick={onConfirm}>
            Yes
          </button>
          <button className={styles.actionButton} onClick={onCancel}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}

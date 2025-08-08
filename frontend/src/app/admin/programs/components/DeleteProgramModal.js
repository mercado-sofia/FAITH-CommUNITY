'use client';

import styles from './styles/DeleteProgramModal.module.css';

const DeleteProgramModal = ({ program, onConfirm, onCancel, isDeleting }) => {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Delete Program</h3>
        </div>
        
        <div className={styles.body}>
          <p>Are you sure you want to permanently delete this program?</p>
          {program && (
            <p className={styles.programTitle}>
              <strong>&ldquo;{program.title}&rdquo;</strong>
            </p>
          )}
          <p className={styles.warning}>
            <strong>Warning:</strong> This action cannot be undone. The program will be completely removed from your records.
          </p>
        </div>
        
        <div className={styles.footer}>
          <button 
            className={styles.cancelBtn} 
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button 
            className={styles.deleteBtn} 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProgramModal;

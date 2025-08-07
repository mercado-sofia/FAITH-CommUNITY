import styles from './styles/DeleteNewsModal.module.css';

export default function DeleteNewsModal({ news, onConfirm, onCancel }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Delete News</h3>
        </div>
        <div className={styles.body}>
          <p>Are you sure you want to delete this news item?</p>
          {news && (
            <div className={styles.newsPreview}>
              <h4>{news.title}</h4>
              <p className={styles.newsDescription}>
                {news.description?.length > 100 
                  ? `${news.description.substring(0, 100)}...` 
                  : news.description}
              </p>
            </div>
          )}
          <p className={styles.warning}>
            <strong>Warning:</strong> This action cannot be undone. The news item will be permanently removed.
          </p>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.deleteBtn} onClick={onConfirm}>
            Delete News
          </button>
        </div>
      </div>
    </div>
  );
}

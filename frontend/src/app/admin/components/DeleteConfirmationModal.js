'use client'

import { useEffect } from 'react'
import { FaExclamationTriangle } from 'react-icons/fa'
import styles from './styles/DeleteConfirmationModal.module.css'

export default function DeleteConfirmationModal({
  isOpen,
  itemName,
  itemType = 'item', // 'program', 'submission', 'organization head', 'news', etc.
  onConfirm,
  onCancel,
  isDeleting = false
}) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  // Capitalize first letter of itemType for display
  const capitalizedItemType = itemType.charAt(0).toUpperCase() + itemType.slice(1)

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Delete {capitalizedItemType}</h3>
        </div>

        <div className={styles.body}>
          <p>
            Are you sure you want to permanently delete <strong>&ldquo;{itemName}&rdquo;</strong>?
          </p>
          <p className={styles.warning}>
            Warning: This action cannot be undone. The {itemType} will be completely removed from your records.
          </p>
        </div>

        <div className={styles.footer}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onCancel && typeof onCancel === 'function') {
                onCancel();
              }
            }}
            className={styles.cancelBtn}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onConfirm && typeof onConfirm === 'function') {
                onConfirm();
              }
            }}
            className={styles.deleteBtn}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

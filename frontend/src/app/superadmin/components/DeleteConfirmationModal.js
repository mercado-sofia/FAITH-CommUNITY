'use client'

import { useEffect } from 'react'
import { FiTrash2, FiX } from 'react-icons/fi'
import { FaSpinner } from 'react-icons/fa'
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
        <div className={styles.topRow}>
          <div className={styles.trashIconContainer}>
            <div className={styles.trashIconInner}>
              <FiTrash2 />
            </div>
          </div>
          
          <button 
            className={styles.closeBtn}
            onClick={onCancel}
            disabled={isDeleting}
          >
            <FiX />
          </button>
        </div>
        
        <div className={styles.content}>
          <h3>Delete {itemType === 'organization head' ? 'Org Head' : capitalizedItemType}{itemName && /\d/.test(itemName) ? `: ${itemName}` : ''}</h3>
          
          <p>
            Are you sure you want to delete {(() => {
              // Extract the count from itemName (e.g., "1 submission" -> 1)
              if (itemName && /\d/.test(itemName)) {
                const countMatch = itemName.match(/^(\d+)/);
                if (countMatch) {
                  const count = parseInt(countMatch[1]);
                  return count === 1 ? 'this' : 'these';
                }
              }
              return 'this';
            })()} {itemType}{(() => {
              // Handle pluralization - special case for "news" which doesn't need 's'
              if (itemName && /\d/.test(itemName)) {
                const countMatch = itemName.match(/^(\d+)/);
                if (countMatch) {
                  const count = parseInt(countMatch[1]);
                  if (count > 1) {
                    // Special case for "news" - it's already plural
                    if (itemType === 'news') {
                      return ' items';
                    }
                    return 's';
                  }
                }
              }
              return '';
            })()}? This action cannot be undone.
          </p>
        </div>

        <div className={styles.actions}>
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
            {isDeleting ? <FaSpinner className={styles.spinner} /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

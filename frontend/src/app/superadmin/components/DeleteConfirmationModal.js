'use client'

import { useEffect } from 'react'
import { FiTrash2, FiX, FiUserX } from 'react-icons/fi'
import { FaSpinner } from 'react-icons/fa'
import styles from './styles/DeleteConfirmationModal.module.css'

export default function DeleteConfirmationModal({
  isOpen,
  itemName,
  itemType = 'item', // 'program', 'submission', 'organization head', 'news', etc.
  actionType = 'delete', // 'delete', 'deactivate', 'cancel'
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

  // Get action-specific content
  const getActionContent = () => {
    switch (actionType) {
      case 'deactivate':
        return {
          icon: <FiUserX />,
          title: `Deactivate Account${itemName && /\d/.test(itemName) ? `: ${itemName}` : ''}`,
          message: `Are you sure you want to deactivate this account? The account will no longer be active and won't be available for logins.`,
          buttonText: 'Deactivate'
        }
      case 'cancel':
        return {
          icon: <FiX />,
          title: `Cancel ${itemType === 'organization head' ? 'Org Head' : capitalizedItemType}${itemName && /\d/.test(itemName) ? `: ${itemName}` : ''}`,
          message: `Are you sure you want to cancel ${(() => {
            if (itemName && /\d/.test(itemName)) {
              const countMatch = itemName.match(/^(\d+)/);
              if (countMatch) {
                const count = parseInt(countMatch[1]);
                return count === 1 ? 'this' : 'these';
              }
            }
            return 'this';
          })()} ${itemType}${(() => {
            if (itemName && /\d/.test(itemName)) {
              const countMatch = itemName.match(/^(\d+)/);
              if (countMatch) {
                const count = parseInt(countMatch[1]);
                if (count > 1) {
                  if (itemType === 'news') {
                    return ' items';
                  }
                  return 's';
                }
              }
            }
            return '';
          })()}? This action cannot be undone.`,
          buttonText: 'Cancel'
        }
      default: // 'delete'
        return {
          icon: <FiTrash2 />,
          title: `Delete ${itemType === 'organization head' ? 'Org Head' : capitalizedItemType}${itemName && /\d/.test(itemName) ? `: ${itemName}` : ''}`,
          message: `Are you sure you want to delete ${(() => {
            if (itemName && /\d/.test(itemName)) {
              const countMatch = itemName.match(/^(\d+)/);
              if (countMatch) {
                const count = parseInt(countMatch[1]);
                return count === 1 ? 'this' : 'these';
              }
            }
            return 'this';
          })()} ${itemType}${(() => {
            if (itemName && /\d/.test(itemName)) {
              const countMatch = itemName.match(/^(\d+)/);
              if (countMatch) {
                const count = parseInt(countMatch[1]);
                if (count > 1) {
                  if (itemType === 'news') {
                    return ' items';
                  }
                  return 's';
                }
              }
            }
            return '';
          })()}? This action cannot be undone.`,
          buttonText: 'Delete'
        }
    }
  }

  const actionContent = getActionContent()

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.topRow}>
          <div className={styles.trashIconContainer}>
            <div className={styles.trashIconInner}>
              {actionContent.icon}
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
          <h3>{actionContent.title}</h3>
          
          <p>
            {actionContent.message}
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
            {actionContent.buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

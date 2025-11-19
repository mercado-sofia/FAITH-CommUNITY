'use client'

import { useEffect } from 'react'
import { FiTrash2, FiX, FiUserX, FiUserCheck, FiEdit3, FiArchive, FiRotateCw } from 'react-icons/fi'
import { FaSpinner } from 'react-icons/fa'
import styles from './ConfirmationModal.module.css'

export default function ConfirmationModal({
  isOpen,
  itemName,
  itemType = 'item', // 'program', 'submission', 'organization head', 'news', etc.
  actionType = 'delete', // 'delete', 'deactivate', 'cancel', 'update', 'activate'
  onConfirm,
  onCancel,
  isDeleting = false, // Legacy prop name, kept for backward compatibility
  isLoading = false, // Generic loading state prop
  customMessage = null
}) {
  // Use isLoading if provided, otherwise fall back to isDeleting for backward compatibility
  const loading = isLoading || isDeleting
  // Lock body scroll when modal is open
  useEffect(() => {
    // Check for document to avoid SSR errors
    if (!isOpen || typeof document === 'undefined' || !document.body) {
      return;
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = prev;
      }
    };
  }, [isOpen])

  if (!isOpen) return null

  // Capitalize first letter of itemType for display
  const capitalizedItemType = itemType.charAt(0).toUpperCase() + itemType.slice(1)

  // Get action-specific content
  const getActionContent = () => {
    const getButtonText = (baseText) => {
      if (loading) {
        // Add "ing..." to the button text when loading
        if (baseText.endsWith('e')) {
          return baseText.slice(0, -1) + 'ing...'
        }
        return baseText + 'ing...'
      }
      return baseText
    }

    switch (actionType) {
      case 'activate':
        return {
          icon: <FiUserCheck />,
          title: `Activate Account${itemName && /\d/.test(itemName) ? `: ${itemName}` : ''}`,
          message: `Are you sure you want to activate this account? The account will become active and available for logins.`,
          buttonText: getButtonText('Activate')
        }
      case 'deactivate':
        return {
          icon: <FiUserX />,
          title: `Deactivate Account${itemName && /\d/.test(itemName) ? `: ${itemName}` : ''}`,
          message: `Are you sure you want to deactivate this account? The account will no longer be active and won't be available for logins.`,
          buttonText: getButtonText('Deactivate')
        }
      case 'update':
        return {
          icon: <FiEdit3 />,
          title: `Update ${capitalizedItemType}${itemName ? `: "${itemName}"` : ''}`,
          message: customMessage || `Are you sure you want to update this ${itemType}?`,
          buttonText: getButtonText('Update')
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
          buttonText: getButtonText('Cancel')
        }
      case 'decline':
        return {
          icon: <FiX />,
          title: `Decline ${capitalizedItemType}${itemName ? `: "${itemName}"` : ''}`,
          message: customMessage || `Are you sure you want to decline this ${itemType}?`,
          buttonText: getButtonText('Decline')
        }
      case 'archive':
        return {
          icon: <FiArchive />,
          title: `Archive ${capitalizedItemType}${itemName ? `: "${itemName}"` : ''}`,
          message: customMessage || `Are you sure you want to archive this ${itemType}? This will remove it from the website display.`,
          buttonText: getButtonText('Archive')
        }
      case 'unarchive':
        return {
          icon: <FiRotateCw />,
          title: `Unarchive ${capitalizedItemType}${itemName ? `: "${itemName}"` : ''}`,
          message: customMessage || `Are you sure you want to unarchive this ${itemType}? It will be restored and visible on the website again.`,
          buttonText: getButtonText('Unarchive')
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
                  if (itemType === 'admin account and invitation data') {
                    return '';
                  }
                  return 's';
                }
              }
            }
            return '';
          })()}? This action cannot be undone.`,
          buttonText: getButtonText('Delete')
        }
    }
  }

  const actionContent = getActionContent()

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.topRow}>
          <div className={
            actionType === 'activate' ? styles.activateIconContainer : 
            actionType === 'archive' ? styles.archiveIconContainer :
            actionType === 'unarchive' ? styles.unarchiveIconContainer :
            styles.trashIconContainer
          }>
            <div className={
              actionType === 'activate' ? styles.activateIconInner : 
              actionType === 'archive' ? styles.archiveIconInner :
              actionType === 'unarchive' ? styles.unarchiveIconInner :
              styles.trashIconInner
            }>
              {actionContent.icon}
            </div>
          </div>
          
          <button 
            className={styles.closeBtn}
            onClick={onCancel}
            disabled={loading}
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
            disabled={loading}
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
            className={
              actionType === 'activate' ? styles.activateBtn : 
              actionType === 'update' ? styles.updateBtn : 
              actionType === 'decline' ? styles.declineBtn :
              actionType === 'archive' ? styles.archiveBtn :
              actionType === 'unarchive' ? styles.unarchiveBtn :
              styles.deleteBtn
            }
            disabled={loading}
          >
            {actionContent.buttonText}
            {loading ? <FaSpinner className={styles.spinner} /> : null}
          </button>
        </div>
      </div>
    </div>
  )
}

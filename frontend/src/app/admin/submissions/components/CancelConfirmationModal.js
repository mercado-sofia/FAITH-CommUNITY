import { MdCancel } from "react-icons/md";
import { FiX } from 'react-icons/fi';
import styles from './styles/CancelConfirmationModal.module.css';

export default function CancelConfirmation({ isOpen, itemName, itemType = 'submission', onConfirm, onCancel }) {
  if (!isOpen) return null;

  // Capitalize first letter of itemType for display
  const capitalizedItemType = itemType.charAt(0).toUpperCase() + itemType.slice(1);
  
  // Determine if we're dealing with multiple items
  const isMultiple = itemName && itemName.includes('s') && !itemName.includes('1 ');
  const pronoun = isMultiple ? 'these' : 'this';
  const itemTypePlural = isMultiple ? `${itemType}s` : itemType;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.topRow}>
          <div className={styles.cancelIconContainer}>
            <div className={styles.cancelIconInner}>
              <MdCancel />
            </div>
          </div>
          
          <button 
            className={styles.closeBtn}
            onClick={onCancel}
          >
            <FiX />
          </button>
        </div>
        
        <div className={styles.content}>
          <h3>Cancel {capitalizedItemType}{itemName ? `: ${itemName}` : ''}</h3>
          
          <p>Are you sure you want to cancel {pronoun} {itemTypePlural}? This will withdraw {pronoun} {itemTypePlural} from superadmin review.</p>
        </div>

        <div className={styles.actions}>
          <button
            onClick={onCancel}
            className={styles.keepBtn}
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className={styles.cancelBtn}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
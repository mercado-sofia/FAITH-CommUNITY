'use client';

import { useState } from 'react';
import { FiEdit2, FiTrash2, FiClipboard } from 'react-icons/fi';
import { IoCloseOutline } from "react-icons/io5";
import { formatDateTime } from '../../../../utils/dateUtils';
import { ConfirmationModal } from '@/components';
import styles from './styles/FAQTable.module.css';

export default function FAQTable({ 
  faqs, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  selectedItems,
  onSelectAll,
  onSelectItem,
  isDeleting,
  isUpdating
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItemForDelete, setSelectedItemForDelete] = useState(null);

  const handleDeleteClick = (faq) => {
    setSelectedItemForDelete(faq);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedItemForDelete) {
      onDelete(selectedItemForDelete.id);
      setShowDeleteModal(false);
      setSelectedItemForDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSelectedItemForDelete(null);
  };

  const handleBulkDelete = () => {
    const selectedFaqIds = Array.from(selectedItems);
    if (selectedFaqIds.length === 0) return;
    // Pass selected FAQ IDs to parent for confirmation modal
    if (onBulkDelete) {
      onBulkDelete(selectedFaqIds);
    }
  };

  const cancelSelection = () => {
    // Notify parent to clear selections
    if (onSelectAll) {
      onSelectAll({ target: { checked: false } });
    }
  };

  // Custom function to preserve exact date/time split format for UI
  const formatDate = (dateString) => {
    if (!dateString) return { datePart: 'N/A', timePart: 'N/A' };
    try {
      const date = new Date(dateString);
      const datePart = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      const timePart = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return { datePart, timePart };
    } catch (error) {
      return { datePart: 'Invalid', timePart: 'Invalid' };
    }
  };

  const truncateText = (text, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    
    // Find the last complete sentence within the limit
    const truncated = text.substring(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    // If we found a sentence ending within the last 50 characters, use it
    if (lastSentenceEnd > maxLength - 50 && lastSentenceEnd > 0) {
      return text.substring(0, lastSentenceEnd + 1);
    }
    
    // Otherwise, find the last complete word
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength - 30 && lastSpace > 0) {
      return text.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  };

  const isAllSelected = faqs.length > 0 && selectedItems.size === faqs.length;

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <div className={styles.bulkActionsLeft}>
            <span className={styles.selectedCount}>
              {selectedItems.size} FAQ{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className={styles.bulkActionsRight}>
            <button 
              className={`${styles.bulkButton} ${styles.deleteButton}`}
              onClick={handleBulkDelete}
              title="Delete selected FAQs"
            >
              <FiTrash2 size={16} />
              Delete Selected
            </button>
            <button 
              className={styles.cancelButton}
              onClick={cancelSelection}
              title="Cancel selection"
            >
              <IoCloseOutline />
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.faqTable}>
          <thead>
            <tr>
              <th className={styles.checkboxColumn}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  className={styles.checkbox}
                />
              </th>
              <th className={styles.questionColumn}>Question</th>
              <th className={styles.answerColumn}>Answer</th>
              <th className={styles.dateColumn}>Created</th>
              <th className={styles.actionsColumn}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {faqs.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.emptyState}>
                  <div className={styles.emptyContent}>
                    <div className={styles.emptyIcon}>
                      <FiClipboard />
                    </div>
                    <h3>No FAQs Found</h3>
                    <p>No FAQs have been created yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              faqs.map((faq) => (
                <tr key={faq.id} className={styles.tableRow}>
                  <td className={styles.checkboxColumn}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(faq.id)}
                      onChange={() => onSelectItem(faq.id)}
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.questionColumn}>
                    <div className={styles.questionText}>
                      {truncateText(faq.question, 80)}
                    </div>
                  </td>
                  <td className={styles.answerColumn}>
                    <div className={styles.answerText}>
                      {truncateText(faq.answer, 300)}
                    </div>
                  </td>
                  <td className={styles.dateColumn}>
                    <div className={styles.dateText}>
                      <span>{formatDate(faq.created_at).datePart}</span>
                      <span>{formatDate(faq.created_at).timePart}</span>
                    </div>
                  </td>
                  <td className={styles.actionsColumn}>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => onEdit(faq)}
                        className={`${styles.actionButton} ${styles.editButton}`}
                        disabled={isUpdating}
                        title="Edit FAQ"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(faq)}
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        disabled={isDeleting}
                        title="Delete FAQ"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        itemName={selectedItemForDelete?.question}
        itemType="FAQ"
        actionType="delete"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </>
  );
}

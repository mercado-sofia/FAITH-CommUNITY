'use client';

import { useState } from 'react';
import { FiEdit2, FiTrash2, FiEye, FiClipboard } from 'react-icons/fi';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
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
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

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

  const handleBulkDeleteClick = () => {
    if (selectedItems.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleBulkDeleteConfirm = () => {
    const selectedIds = Array.from(selectedItems);
    onBulkDelete(selectedIds);
    setShowBulkDeleteModal(false);
  };

  const handleBulkDeleteCancel = () => {
    setShowBulkDeleteModal(false);
  };

  const formatDate = (dateString) => {
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

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.faqTable}>
          <thead>
            <tr>
              <th className={styles.checkboxColumn}>
                <input
                  type="checkbox"
                  checked={selectedItems.size === faqs.length && faqs.length > 0}
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
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        itemName={selectedItemForDelete?.question}
        itemType="FAQ"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showBulkDeleteModal}
        itemName={`${selectedItems.size} FAQ${selectedItems.size > 1 ? 's' : ''}`}
        itemType="FAQ"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={handleBulkDeleteCancel}
        isDeleting={isDeleting}
      />
    </>
  );
}

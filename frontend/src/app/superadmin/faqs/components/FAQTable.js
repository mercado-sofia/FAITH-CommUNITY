'use client';

import { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import { IoCloseOutline } from "react-icons/io5";
import { ConfirmationModal } from '@/components';
import { formatDateTime } from '@/utils/shared/dateUtils';
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
  startIndex = 0,
  showDropdown = null,
  setShowDropdown,
  dropdownPosition = {},
  setDropdownPosition,
  calculateDropdownPosition,
  sortBy = 'newest',
  totalCount = 0
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

  // Helper function to abbreviate month names
  const abbreviateMonth = (monthName) => {
    const monthMap = {
      'January': 'Jan',
      'February': 'Feb',
      'March': 'Mar',
      'April': 'Apr',
      'May': 'May',
      'June': 'Jun',
      'July': 'Jul',
      'August': 'Aug',
      'September': 'Sep',
      'October': 'Oct',
      'November': 'Nov',
      'December': 'Dec'
    };
    return monthMap[monthName] || monthName;
  };

  // Custom function to preserve exact date/time split format for UI
  const formatDate = (dateString) => {
    if (!dateString) return { datePart: 'N/A', timePart: 'N/A' };
    
    // Use formatDateTime which handles invalid dates properly
    const formatted = formatDateTime(dateString);
    
    if (formatted === 'Invalid date' || formatted === 'Not specified') {
      return { datePart: formatted, timePart: 'N/A' };
    }
    
    // Parse the formatted string to extract date and time parts
    // formatDateTime returns: "Month Day, Year, Hour:Minute AM/PM"
    // Example: "September 18, 2004, 9:26 AM"
    try {
      const parts = formatted.split(', ');
      if (parts.length >= 3) {
        // Extract month name and abbreviate it
        // parts[0] is "Month Day" (e.g., "November 18")
        const datePartWithMonth = parts[0]; // "November 18"
        const monthDayMatch = datePartWithMonth.match(/^(\w+)\s+(\d+)$/);
        
        if (monthDayMatch) {
          const fullMonthName = monthDayMatch[1];
          const day = monthDayMatch[2];
          const abbreviatedMonth = abbreviateMonth(fullMonthName);
          // Date part: "Nov 18, Year"
          const datePart = `${abbreviatedMonth} ${day}, ${parts[1]}`;
          // Time part: "Hour:Minute AM/PM"
          const timePart = parts[2];
          return { datePart, timePart };
        } else {
          // Fallback: if pattern doesn't match, try to abbreviate month in the string
          const abbreviatedDatePart = datePartWithMonth.replace(
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/,
            (match) => abbreviateMonth(match)
          );
          const datePart = `${abbreviatedDatePart}, ${parts[1]}`;
          const timePart = parts[2];
          return { datePart, timePart };
        }
      } else if (parts.length === 2) {
        // If only 2 parts, assume date and time are combined differently
        // Try to abbreviate month if present
        const abbreviatedDatePart = parts[0].replace(
          /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/,
          (match) => abbreviateMonth(match)
        );
        const datePart = abbreviatedDatePart;
        const timePart = parts[1];
        return { datePart, timePart };
      } else {
        // Fallback: return the whole string as date part with abbreviated month
        const abbreviatedFormatted = formatted.replace(
          /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/,
          (match) => abbreviateMonth(match)
        );
        return { datePart: abbreviatedFormatted, timePart: 'N/A' };
      }
    } catch (error) {
      return { datePart: formatted, timePart: 'N/A' };
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
              <th className={styles.numberColumn}>#</th>
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
                <td colSpan="6" className={styles.emptyStateCell}>
                  <div className={styles.emptyState}>
                    <h3 className={styles.emptyStateTitle}>No FAQs found</h3>
                    <p className={styles.emptyStateText}>
                      No FAQs found matching your current filters. New FAQs will appear here when you create them.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              faqs.map((faq, index) => {
                const rowNumber = sortBy === 'oldest' 
                  ? totalCount - (startIndex + index)
                  : startIndex + index + 1;
                return (
                <tr key={faq.id} className={styles.tableRow}>
                  <td className={styles.numberCell}>
                    {rowNumber}
                  </td>
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
                    <div className={styles.actionDropdownWrapper} data-faq-action-dropdown>
                      <div className={styles.actionDropdownButtonWrapper}>
                        <div
                          className={styles.actionDropdown}
                          onClick={(e) => {
                            if (!setShowDropdown || !setDropdownPosition || !calculateDropdownPosition) {
                              return;
                            }
                            const dropdownId = `action-${faq.id}`;
                            if (showDropdown === dropdownId) {
                              setShowDropdown(null);
                            } else {
                              const position = calculateDropdownPosition(e.currentTarget);
                              setDropdownPosition(prev => ({
                                ...prev,
                                [dropdownId]: position
                              }));
                              setShowDropdown(dropdownId);
                            }
                          }}
                        >
                          <HiOutlineDotsHorizontal className={styles.actionDropdownIcon} />
                        </div>
                        {showDropdown === `action-${faq.id}` && (
                          <ul 
                            className={`${styles.actionDropdownOptions} ${dropdownPosition[`action-${faq.id}`]?.position === 'above' ? styles.above : ''}`}
                            data-faq-action-dropdown-options
                            style={{
                              top: `${dropdownPosition[`action-${faq.id}`]?.top || 0}px`,
                              right: `${dropdownPosition[`action-${faq.id}`]?.right || 0}px`
                            }}
                          >
                            <li 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onEdit) {
                                  onEdit(faq);
                                }
                                if (setShowDropdown) {
                                  setShowDropdown(null);
                                }
                                if (setDropdownPosition) {
                                  setDropdownPosition({});
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              Edit
                            </li>
                            <li 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteClick(faq);
                                if (setShowDropdown) {
                                  setShowDropdown(null);
                                }
                                if (setDropdownPosition) {
                                  setDropdownPosition({});
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              Delete
                            </li>
                          </ul>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
              })
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
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { IoCloseOutline } from "react-icons/io5"
import { FiTrash2, FiX } from "react-icons/fi"
import { FaEdit, FaEye } from "react-icons/fa"
import PaginationControls from "../../components/PaginationControls"
import styles from "./styles/NewsTable.module.css"

// Security utilities
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').substring(0, 200); // Basic XSS protection + length limit
};

const validateNewsData = (news) => {
  if (!news || typeof news !== 'object') return false;
  if (!news.id || !news.title) return false;
  return true;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

export default function NewsTable({ 
  news = [], 
  onView, 
  onEdit, 
  onDelete, 
  onBulkDelete, 
  itemsPerPage = 10,
  onSelectionChange,
  selectedItems = []
}) {
  const [selectedNews, setSelectedNews] = useState([])
  const [showDropdown, setShowDropdown] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const dropdownRefs = useRef({})

  // Reset to page 1 when news data changes or when current page exceeds total pages
  useEffect(() => {
    const totalPages = Math.ceil(news.length / itemsPerPage)
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [news.length, currentPage, itemsPerPage])

  // Reset to page 1 when itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  // Reset selections when navigating to a different page
  useEffect(() => {
    setSelectedNews([])
  }, [currentPage])

  // Sync with parent's selectedItems state only when they differ
  const prevSelectedItemsRef = useRef();
  useEffect(() => {
    const selectedItemsStr = JSON.stringify(selectedItems);
    const prevSelectedItemsStr = JSON.stringify(prevSelectedItemsRef.current);
    
    if (selectedItemsStr !== prevSelectedItemsStr) {
      setSelectedNews(selectedItems);
      prevSelectedItemsRef.current = selectedItems;
    }
  }, [selectedItems]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown !== null) {
        const dropdownWrapper = dropdownRefs.current[showDropdown]
        if (
          dropdownWrapper &&
          !dropdownWrapper.contains(event.target)
        ) {
          setShowDropdown(null)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showDropdown])

  const toggleSelectAll = () => {
    const newSelection = isAllSelected ? [] : currentNews.map((n) => n.id);
    setSelectedNews(newSelection);
    
    // Use setTimeout to move the parent notification out of render phase
    setTimeout(() => {
      if (onSelectionChange) {
        onSelectionChange(newSelection);
      }
    }, 0);
  }

  const handleSelectNews = (newsId) => {
    setSelectedNews(prev => {
      const newSelection = prev.includes(newsId) 
        ? prev.filter(id => id !== newsId)
        : [...prev, newsId];
      
      // Use setTimeout to move the parent notification out of render phase
      setTimeout(() => {
        if (onSelectionChange) {
          onSelectionChange(newSelection);
        }
      }, 0);
      
      return newSelection;
    })
  }

  const handleAction = (newsItem, action) => {
    // Validate news data before processing
    if (!validateNewsData(newsItem)) {
      console.error('Invalid news data:', newsItem);
      return;
    }
    
    setShowDropdown(null)
    
    switch (action) {
      case 'view':
        onView && onView(newsItem);
        break;
      case 'edit':
        onEdit && onEdit(newsItem);
        break;
      case 'delete':
        onDelete && onDelete(newsItem);
        break;
      default:
        break;
    }
  }

  const handleBulkDelete = () => {
    if (selectedNews.length === 0) return
    // Pass selected news IDs to parent for confirmation modal
    if (onBulkDelete) {
      onBulkDelete(selectedNews)
    }
  }


  const cancelSelection = () => {
    setSelectedNews([])
    // Notify parent to clear selections as well
    if (onSelectionChange) {
      onSelectionChange([])
    }
  }

  const handleDropdownToggle = (newsId) => {
    if (showDropdown === newsId) return setShowDropdown(null)

    const buttonElement = dropdownRefs.current[newsId]
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect()
      const top = rect.bottom + 4
      const left = rect.right - 192
    }

    setShowDropdown(newsId)
  }

  const totalPages = Math.ceil(news.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, news.length)
  const currentNews = news.slice(startIndex, endIndex)
  const isAllSelected = currentNews.length > 0 && selectedNews.length === currentNews.length

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedNews.length > 0 && (
        <div className={styles.bulkActionsBar}>
          <div className={styles.bulkActionsLeft}>
            <span className={styles.selectedCount}>
              {selectedNews.length} news item{selectedNews.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className={styles.bulkActionsRight}>
            <button 
              className={`${styles.bulkButton} ${styles.deleteButton}`}
              onClick={handleBulkDelete}
              title="Delete selected news items"
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
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th>
                <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} />
              </th>
              <th>Title</th>
              <th>Date Published</th>
              <th></th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {currentNews.length === 0 ? (
              <tr>
                <td colSpan="4" className={styles.noNews}>
                  No news found
                </td>
              </tr>
            ) : currentNews.map((newsItem) => {
              // Validate news data before rendering
              if (!validateNewsData(newsItem)) {
                console.error('Invalid news data:', newsItem);
                return null;
              }

              // Sanitize data for display
              const sanitizedTitle = sanitizeInput(newsItem.title);
              const sanitizedDescription = sanitizeInput(newsItem.description);

              return (
                <tr key={newsItem.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedNews.includes(newsItem.id)}
                      onChange={() => handleSelectNews(newsItem.id)}
                    />
                  </td>
                  <td className={styles.titleCell}>
                    <div className={styles.titleContent}>
                      <div className={styles.newsTitle} title={sanitizedTitle}>
                        {sanitizedTitle}
                      </div>
                      {sanitizedDescription && (
                        <div className={styles.newsDescription} title={sanitizedDescription}>
                          {sanitizedDescription === '****' 
                            ? '<bold> Text </bold>'
                            : sanitizedDescription.length > 100 
                              ? `${sanitizedDescription.substring(0, 100)}...` 
                              : sanitizedDescription
                          }
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ color: "#8a919c", fontWeight: "400" }}>
                    {formatDate(newsItem.date || newsItem.created_at)}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        className={`${styles.actionButton} ${styles.viewButton}`}
                        onClick={() => handleAction(newsItem, 'view')}
                        title="View details"
                      >
                        <FaEye /> View
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.editButton}`}
                        onClick={() => handleAction(newsItem, 'edit')}
                        title="Edit news"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleAction(newsItem, 'delete')}
                        title="Delete news"
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        startIndex={startIndex}
        endIndex={endIndex}
        totalCount={news.length}
      />

    </>
  )
}

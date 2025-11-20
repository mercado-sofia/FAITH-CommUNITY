"use client"

import React, { useState, useEffect, useRef } from 'react';
import { IoCloseOutline } from "react-icons/io5"
import { FiTrash2 } from "react-icons/fi"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { formatDateLong } from '@/utils/dateUtils.js';
import PaginationControls from "../../../components/PaginationControls/PaginationControls"
import styles from "./NewsTable.module.css"

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
  return formatDateLong(dateString);
};

const formatStatus = (status) => {
  if (!status) return 'Draft';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusBadgeClass = (status) => {
  const normalizedStatus = (status || 'draft').toLowerCase();
  switch (normalizedStatus) {
    case 'published':
      return styles.statusPublished;
    case 'scheduled':
      return styles.statusScheduled;
    case 'archived':
      return styles.statusArchived;
    case 'draft':
    default:
      return styles.statusDraft;
  }
};

export default function NewsTable({ 
  news = [], 
  onEdit, 
  onDelete,
  onView,
  onArchive,
  onUnarchive,
  onBulkDelete, 
  itemsPerPage = 10,
  onSelectionChange,
  selectedItems = []
}) {
  const [selectedNews, setSelectedNews] = useState([])
  const [showDropdown, setShowDropdown] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [dropdownPosition, setDropdownPosition] = useState({})
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
      return;
    }
    
    setShowDropdown(null)
    
    switch (action) {
      case 'view':
        if (onView) {
          onView(newsItem);
        } else if (newsItem.slug) {
          // Fallback: open in new tab if slug exists
          window.open(`/news/${newsItem.slug}`, '_blank');
        }
        break;
      case 'edit':
        onEdit && onEdit(newsItem);
        break;
      case 'archive':
        onArchive && onArchive(newsItem);
        break;
      case 'unarchive':
        onUnarchive && onUnarchive(newsItem);
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
      const viewportHeight = window.innerHeight
      const dropdownHeight = 160 // Approximate height of dropdown
      
      // Check if there's enough space below
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      
      let top, position
      
      // If not enough space below but enough above, show above
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        position = 'above'
        top = -dropdownHeight - 4 // 4px gap above the button
      } else {
        position = 'below'
        top = rect.height + 4 // 4px gap below the button
      }
      
      setDropdownPosition({ [newsId]: { top, position } })
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
                  <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {currentNews.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.noNews}>
                  No news found
                </td>
              </tr>
            ) : currentNews.map((newsItem) => {
              // Validate news data before rendering
              if (!validateNewsData(newsItem)) {
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
                    {(() => {
                      const status = (newsItem.status || 'draft').toLowerCase();
                      // Always use published_at (not date field) - published_at is the source of truth
                      const publishedAt = newsItem.published_at;
                      
                      if (status === 'published' || (status === 'archived' && publishedAt)) {
                        // Published or archived (was published before) - show published date
                        return formatDate(publishedAt);
                      } else if (status === 'scheduled' && publishedAt) {
                        // Scheduled - show scheduled date
                        return formatDate(publishedAt);
                      } else {
                        // Draft - show created date
                        return formatDate(newsItem.created_at);
                      }
                    })()}
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(newsItem.status)}`}>
                      {formatStatus(newsItem.status)}
                    </span>
                  </td>
                  <td>
                    <div
                      className={styles.dropdownWrapper}
                      ref={(el) => (dropdownRefs.current[newsItem.id] = el)}
                    >
                      <div className={styles.dropdownButtonWrapper}>
                        <div
                          className={styles.dropdown}
                          onClick={() => handleDropdownToggle(newsItem.id)}
                        >
                          <HiOutlineDotsHorizontal className={styles.icon} />
                        </div>

                        {showDropdown === newsItem.id && (
                          <ul 
                            className={`${styles.options} ${dropdownPosition[newsItem.id]?.position === 'above' ? styles.above : ''}`}
                            style={{
                              top: `${dropdownPosition[newsItem.id]?.top || 0}px`,
                              right: '0px'
                            }}
                          >
                            <li onClick={() => handleAction(newsItem, "view")}>View</li>
                            <li onClick={() => handleAction(newsItem, "edit")}>Edit</li>
                            {/* Only show Archive option for published news */}
                            {(newsItem.status || '').toLowerCase() === 'published' && (
                              <li onClick={() => handleAction(newsItem, "archive")}>Archive</li>
                            )}
                            {/* Only show Unarchive option for archived news */}
                            {(newsItem.status || '').toLowerCase() === 'archived' && (
                              <li onClick={() => handleAction(newsItem, "unarchive")}>Unarchive</li>
                            )}
                            <li 
                              onClick={() => handleAction(newsItem, "delete")}
                              style={{ color: '#dc3545', borderTop: '1px solid #eee', marginTop: '4px', paddingTop: '4px' }}
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

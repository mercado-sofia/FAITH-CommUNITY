'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiSearch, FiPlus, FiTrash2, FiEdit2, FiChevronDown } from 'react-icons/fi';
import { RiArrowLeftSLine, RiArrowRightSLine, RiArrowLeftDoubleFill, RiArrowRightDoubleFill } from "react-icons/ri";
import {
  useGetAllFaqsQuery,
  useCreateFaqMutation,
  useUpdateFaqMutation,
  useDeleteFaqMutation,
} from "../../../rtk/superadmin/faqApi";
import FAQTable from './components/FAQTable';
import CreateFAQModal from './components/CreateFAQModal';
import styles from './faqs.module.css';

export default function ManageFaqs() {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [showEntries, setShowEntries] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [notification, setNotification] = useState({ message: '', type: '' });
  
  // Bulk actions
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isBulkActionsVisible, setIsBulkActionsVisible] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  
  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(null);
  
  // API hooks
  const { data: faqs = [], error: fetchError, isLoading: isFetching, refetch } = useGetAllFaqsQuery();
  const [createFaq, { isLoading: isCreating }] = useCreateFaqMutation();
  const [updateFaq, { isLoading: isUpdating }] = useUpdateFaqMutation();
  const [deleteFaq, { isLoading: isDeleting }] = useDeleteFaqMutation();

  // Filter and search functionality
  const filteredFaqs = useMemo(() => {
    // Create a copy of the array to avoid mutating the original
    let filtered = [...faqs];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(searchLower) ||
        faq.answer.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'question':
          return a.question.localeCompare(b.question);
        default:
          return 0;
      }
    });

    return filtered;
  }, [faqs, searchTerm, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredFaqs.length / showEntries);
  const startIndex = (currentPage - 1) * showEntries;
  const endIndex = startIndex + showEntries;
  const paginatedFaqs = filteredFaqs.slice(startIndex, endIndex);

  // Statistics
  const faqCounts = useMemo(() => {
    return { total: faqs.length };
  }, [faqs]);

  // Notification handler
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  // FAQ CRUD operations
  const handleCreateFaq = async (formData) => {
    try {
      await createFaq(formData).unwrap();
      showNotification('FAQ created successfully!');
      setShowCreateModal(false);
      refetch();
    } catch (error) {
      console.error('Create failed:', error);
      showNotification('Failed to create FAQ', 'error');
    }
  };

  const handleUpdateFaq = async (faqData) => {
    try {
      await updateFaq(faqData).unwrap();
      showNotification('FAQ updated successfully!');
      setEditingFaq(null);
      refetch();
    } catch (error) {
      console.error('Update failed:', error);
      showNotification('Failed to update FAQ', 'error');
    }
  };

  const handleDeleteFaq = async (id) => {
    try {
      await deleteFaq(id).unwrap();
      showNotification('FAQ deleted successfully!');
      refetch();
    } catch (error) {
      console.error('Delete failed:', error);
      showNotification('Failed to delete FAQ', 'error');
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      setIsBulkActionLoading(true);
      await Promise.all(ids.map(id => deleteFaq(id).unwrap()));
      showNotification(`${ids.length} FAQ(s) deleted successfully!`);
      setSelectedItems(new Set());
      refetch();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      showNotification('Failed to delete selected FAQs', 'error');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(new Set(paginatedFaqs.map(faq => faq.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Bulk actions visibility
  useEffect(() => {
    if (selectedItems.size > 0) {
      setIsBulkActionsVisible(true);
      setShowBulkActions(true);
    } else {
      setIsBulkActionsVisible(false);
      setShowBulkActions(false);
    }
  }, [selectedItems]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, showEntries]);

  // Event handlers
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handleShowEntriesChange = (e) => {
    setShowEntries(Number(e.target.value));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRefresh = () => {
    refetch();
    showNotification('Data refreshed!');
  };

  // Loading and error states
  if (isFetching) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.loading}>Loading FAQs...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.error}>
          <h2>Error loading FAQs</h2>
          <p>{fetchError?.data?.error || fetchError?.message || 'Failed to fetch data'}</p>
          <button onClick={handleRefresh} className={styles.btnRefresh}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainArea}>
      {/* Header */}
      <div className={styles.header}>
          <h1>Manage FAQs</h1>
        </div>

      {/* Controls and Stats Section */}
      <div className={styles.controlsAndStatsSection}>
        <div className={styles.headerLeft}>
          {/* Search and Filters */}
          <div className={styles.controlsSection}>
            <div className={styles.searchAndFilters}>
              <div className={styles.searchGroup}>
                <div className={styles.searchInputWrapper}>
                  <FiSearch className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search FAQs..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className={styles.searchInput}
                  />
        </div>
      </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Sort by:</label>
                <div className={styles.dropdownWrapper}>
                  <div
                    className={styles.dropdown}
                    onClick={() => setShowDropdown(showDropdown === "sort" ? null : "sort")}
                  >
                    {sortBy === "latest" ? "Latest" : sortBy === "oldest" ? "Oldest" : "Question A-Z"}
                    <FiChevronDown className={styles.icon} />
                  </div>
                  {showDropdown === "sort" && (
                    <ul className={styles.options}>
                      <li onClick={() => {
                        setSortBy("latest");
                        setShowDropdown(null);
                      }}>
                        Latest
                      </li>
                      <li onClick={() => {
                        setSortBy("oldest");
                        setShowDropdown(null);
                      }}>
                        Oldest
                      </li>
                      <li onClick={() => {
                        setSortBy("question");
                        setShowDropdown(null);
                      }}>
                        Question A-Z
                      </li>
                    </ul>
                  )}
                </div>
              </div>

          <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Show:</label>
                <div className={styles.dropdownWrapper}>
                  <div
                    className={`${styles.dropdown} ${styles.showDropdown}`}
                    onClick={() => setShowDropdown(showDropdown === "show" ? null : "show")}
                  >
                    {showEntries}
                    <FiChevronDown className={styles.icon} />
                  </div>
                  {showDropdown === "show" && (
                    <ul className={styles.options}>
                      <li onClick={() => {
                        setShowEntries(5);
                        setShowDropdown(null);
                      }}>
                        5
                      </li>
                      <li onClick={() => {
                        setShowEntries(10);
                        setShowDropdown(null);
                      }}>
                        10
                      </li>
                      <li onClick={() => {
                        setShowEntries(25);
                        setShowDropdown(null);
                      }}>
                        25
                      </li>
                      <li onClick={() => {
                        setShowEntries(50);
                        setShowDropdown(null);
                      }}>
                        50
                      </li>
                    </ul>
                  )}
                </div>
          </div>

          <button onClick={handleRefresh} className={styles.refreshButton}>
                Refresh
          </button>
        </div>
      </div>
            </div>

        <div className={styles.headerRight}>
          {/* Statistics Card */}
          <div className={styles.statsCard}>
            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <div className={`${styles.statNumber} ${styles.totalCount}`}>
                  {faqCounts.total}
                </div>
                <div className={styles.statLabel}>Total FAQs</div>
              </div>
            </div>
            </div>
            </div>
          </div>

      {/* Notification */}
      {notification.message && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.message}
          </div>
      )}

      {/* Table Section */}
      <div className={styles.tableSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <h2>FAQ List</h2>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className={styles.addButton}
          >
            <FiPlus size={16} />
            Add New
          </button>
        </div>

        {/* Bulk Actions */}
        {isBulkActionsVisible && (
          <div className={`${styles.bulkActions} ${showBulkActions ? styles.visible : ''}`}>
            <div className={styles.bulkActionsContent}>
              <span className={styles.bulkActionsText}>
                {selectedItems.size} item(s) selected
              </span>
              <div className={styles.bulkActionsButtons}>
                <button
                  onClick={() => handleBulkDelete(Array.from(selectedItems))}
                  className={`${styles.bulkButton} ${styles.deleteButton}`}
                  disabled={isBulkActionLoading}
                >
                  <FiTrash2 size={16} />
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className={`${styles.bulkButton} ${styles.cancelButton}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Table */}
        <FAQTable
          faqs={paginatedFaqs}
          onEdit={setEditingFaq}
                onDelete={handleDeleteFaq}
          onBulkDelete={handleBulkDelete}
          selectedItems={selectedItems}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
                isDeleting={isDeleting}
                isUpdating={isUpdating}
              />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              Showing {startIndex + 1} to {Math.min(endIndex, filteredFaqs.length)} of {filteredFaqs.length} entries
            </div>
            <div className={styles.paginationControls}>
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className={styles.paginationButton}
              >
                <RiArrowLeftDoubleFill size={16} />
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={styles.paginationButton}
              >
                <RiArrowLeftSLine size={16} />
              </button>
              
              <div className={styles.pageNumbers}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    const start = Math.max(1, currentPage - 2);
                    const end = Math.min(totalPages, currentPage + 2);
                    return page >= start && page <= end;
                  })
                  .map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`${styles.paginationButton} ${currentPage === page ? styles.active : ''}`}
                    >
                      {page}
                    </button>
                  ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={styles.paginationButton}
              >
                <RiArrowRightSLine size={16} />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className={styles.paginationButton}
              >
                <RiArrowRightDoubleFill size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateFAQModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateFaq}
        isCreating={isCreating}
      />

      {editingFaq && (
        <CreateFAQModal
          isOpen={!!editingFaq}
          onClose={() => setEditingFaq(null)}
          onCreate={handleUpdateFaq}
          isCreating={isUpdating}
          initialData={editingFaq}
        />
      )}
    </div>
  );
}
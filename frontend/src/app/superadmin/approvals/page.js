'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiClipboard, FiSearch, FiChevronDown, FiCheck, FiX, FiTrash2 } from 'react-icons/fi';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import { RiArrowLeftSLine, RiArrowRightSLine, RiArrowLeftDoubleFill, RiArrowRightDoubleFill } from "react-icons/ri";
import ApprovalsTable from './components/ApprovalsTable';
import ViewDetailsModal from './components/ViewDetailsModal';
import BulkActionConfirmationModal from './components/BulkActionConfirmationModal';
import styles from '../styles/approvals.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function PendingApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ type: '', text: '' });
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  
  // Filter and search states
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [showEntries, setShowEntries] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Bulk actions
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isBulkActionsVisible, setIsBulkActionsVisible] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isBulkActionsHiding, setIsBulkActionsHiding] = useState(false);
  
  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({});
  
  // View details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);
  
  // Bulk action confirmation modal state
  const [showBulkConfirmation, setShowBulkConfirmation] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState(null);
  
  const [filteredApprovals, setFilteredApprovals] = useState([]);

  // Function to calculate dropdown position
  const calculateDropdownPosition = (buttonElement) => {
    if (!buttonElement) return { position: 'below', top: 0, right: 0 };
    
    const rect = buttonElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const dropdownHeight = 120; // Approximate height of dropdown with 3 items
    const dropdownWidth = 140; // min-width from CSS
    
    // Calculate horizontal position (right-aligned to button)
    const right = viewportWidth - rect.right;
    
    // Check if there's enough space below
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    let top, position;
    
    // If not enough space below but enough above, show above
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      position = 'above';
      top = rect.top - dropdownHeight - 4; // 4px gap
    } else {
      position = 'below';
      top = rect.bottom + 4; // 4px gap
    }
    
    return { position, top, right };
  };

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/approvals/pending`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch approvals');
      }

      const formatted = result.data.map((item) => ({
        ...item,
        submitted_at: new Date(item.submitted_at)
      }));

      setApprovals(formatted);
      setError(null);
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setError(err.message || 'Failed to load approvals');
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      setOrgsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/organizations`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch organizations');
      }

      setOrganizations(result.data);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    } finally {
      setOrgsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    fetchOrganizations();
  }, []);

  // Handle smooth bulk actions bar transition
  useEffect(() => {
    if (selectedItems.size > 0) {
      setIsBulkActionsHiding(false);
      setIsBulkActionsVisible(true);
    } else {
      // Start hiding animation
      setIsBulkActionsHiding(true);
      // Hide after animation completes
      const timer = setTimeout(() => {
        setIsBulkActionsVisible(false);
        setIsBulkActionsHiding(false);
      }, 400); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [selectedItems.size]);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicking on dropdown options or inside dropdown containers
      if (e.target.closest(`.${styles.actionDropdownOptions}`) ||
          e.target.closest(`.${styles.options}`)) {
        return;
      }
      
      if (!e.target.closest(`.${styles.dropdownWrapper}`) && 
          !e.target.closest(`.${styles.actionDropdownWrapper}`)) {
        setShowDropdown(null);
        setDropdownPosition({});
      }
    };

    const handleResize = () => {
      // Close dropdowns on window resize to prevent positioning issues
      setShowDropdown(null);
      setDropdownPosition({});
    };

    const handleScroll = (e) => {
      // Only close dropdowns if scrolling outside of dropdown containers
      if (showDropdown && !e.target.closest(`.${styles.dropdownWrapper}`) && 
          !e.target.closest(`.${styles.actionDropdownWrapper}`)) {
        setShowDropdown(null);
        setDropdownPosition({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Filter and search logic
  useEffect(() => {
    let filtered = [...approvals];

    // Filter by organization
    if (selectedOrganization !== 'all') {
      filtered = filtered.filter(approval => 
        approval.organization_acronym === selectedOrganization ||
        approval.org === selectedOrganization
      );
    }

    // Filter by section
    if (selectedSection !== 'all') {
      filtered = filtered.filter(approval => 
        approval.section === selectedSection
      );
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(approval => 
        approval.organization_acronym?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.org?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.section?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.submitted_at) - new Date(a.submitted_at);
      } else if (sortBy === 'oldest') {
        return new Date(a.submitted_at) - new Date(b.submitted_at);
      }
      return 0;
    });

      setFilteredApprovals(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [approvals, selectedOrganization, selectedSection, searchTerm, sortBy]);

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Approval failed');
      }

      setNotification({ 
        type: 'success', 
        text: 'Changes have been approved and applied.' 
      });
      fetchApprovals(); // Refresh the list
      
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('❌ Approve error:', err);
      setNotification({ 
        type: 'error', 
        text: 'Failed to approve changes: ' + err.message 
      });
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    }
  };

  const handleReject = async (id, rejectComment = '') => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_comment: rejectComment })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Rejection failed');
      }

      setNotification({ 
        type: 'success', 
        text: 'Submission has been rejected.' 
      });
      fetchApprovals();
      
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('❌ Reject error:', err);
      setNotification({ 
        type: 'error', 
        text: 'Failed to reject submission: ' + err.message 
      });
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    }
  };

  // Bulk action handlers
  const handleBulkApprove = async (ids) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/bulk/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk approval failed');
      }

      setNotification({ 
        type: 'success', 
        text: `Bulk approval completed: ${result.details.successCount} approved, ${result.details.errorCount} failed` 
      });
      fetchApprovals();
      
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('❌ Bulk approve error:', err);
      setNotification({ 
        type: 'error', 
        text: 'Failed to bulk approve submissions: ' + err.message 
      });
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    }
  };

  const handleBulkReject = async (ids, rejectComment = '') => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/bulk/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, rejection_comment: rejectComment })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk rejection failed');
      }

      setNotification({ 
        type: 'success', 
        text: `Bulk rejection completed: ${result.details.successCount} rejected, ${result.details.errorCount} failed` 
      });
      fetchApprovals();
      
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('❌ Bulk reject error:', err);
      setNotification({ 
        type: 'error', 
        text: 'Failed to bulk reject submissions: ' + err.message 
      });
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/bulk/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk deletion failed');
      }

      setNotification({ 
        type: 'success', 
        text: `Bulk deletion completed: ${result.details.successCount} deleted, ${result.details.errorCount} failed` 
      });
      fetchApprovals();
      
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('❌ Bulk delete error:', err);
      setNotification({ 
        type: 'error', 
        text: 'Failed to bulk delete submissions: ' + err.message 
      });
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredApprovals.length / showEntries);
  const startIndex = (currentPage - 1) * showEntries;
  const endIndex = startIndex + showEntries;
  const currentApprovals = filteredApprovals.slice(startIndex, endIndex);

  // Bulk action handlers - optimized with useCallback
  const handleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      setSelectedItems(new Set(currentApprovals.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [currentApprovals]);

  const handleSelectItem = useCallback((id) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  // View details modal handlers
  const handleViewDetails = (approval) => {
    setSelectedItemForDetails(approval);
    setShowDetailsModal(true);
    setShowDropdown(null); // Close any open dropdowns
  };

  const handleDetailsClose = () => {
    setShowDetailsModal(false);
    setSelectedItemForDetails(null);
  };

  const handleBulkApproveSelected = useCallback(() => {
    if (selectedItems.size === 0 || isBulkActionLoading) return;
    setPendingBulkAction('approve');
    setShowBulkConfirmation(true);
  }, [selectedItems.size, isBulkActionLoading]);

  const handleBulkRejectSelected = useCallback(() => {
    if (selectedItems.size === 0 || isBulkActionLoading) return;
    setPendingBulkAction('reject');
    setShowBulkConfirmation(true);
  }, [selectedItems.size, isBulkActionLoading]);

  const handleBulkDeleteSelected = useCallback(() => {
    if (selectedItems.size === 0 || isBulkActionLoading) return;
    setPendingBulkAction('delete');
    setShowBulkConfirmation(true);
  }, [selectedItems.size, isBulkActionLoading]);

  // Confirmation modal handlers
  const handleBulkConfirmationCancel = useCallback(() => {
    setShowBulkConfirmation(false);
    setPendingBulkAction(null);
  }, []);

  const handleBulkConfirmationConfirm = useCallback(async (rejectComment) => {
    if (!pendingBulkAction || selectedItems.size === 0) return;
    
    setIsBulkActionLoading(true);
    setShowBulkConfirmation(false);
    
    try {
      const selectedIds = Array.from(selectedItems);
      
      switch (pendingBulkAction) {
        case 'approve':
          await handleBulkApprove(selectedIds);
          break;
        case 'reject':
          await handleBulkReject(selectedIds, rejectComment || 'Bulk rejection');
          break;
        case 'delete':
          await handleBulkDelete(selectedIds);
          break;
        default:
          throw new Error('Invalid bulk action');
      }
      
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Bulk action error:', error);
      // Error handling is already done in the individual handlers
    } finally {
      setIsBulkActionLoading(false);
      setPendingBulkAction(null);
    }
  }, [pendingBulkAction, selectedItems, handleBulkApprove, handleBulkReject, handleBulkDelete]);

  // Event handlers
  const handleOrganizationChange = (e) => {
    setSelectedOrganization(e.target.value);
  };

  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handleShowEntriesChange = (e) => {
    setShowEntries(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading pending submissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.mainArea}>
      {/* Notification Display */}
      {notification.text && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.text}
        </div>
      )}

      {/* Header Section */}
      <div className={styles.header}>
          <h1 className={styles.pageTitle}>Pending Submissions</h1>
        </div>

      {/* Controls and Stats Section */}
      <div className={styles.controlsAndStatsSection}>
        <div className={styles.controlsLeft}>
          <span className={styles.inlineLabel}>Show</span>
          <div className={styles.dropdownWrapper}>
            <div
              className={styles.dropdown}
              onClick={() => setShowDropdown(showDropdown === "show" ? null : "show")}
            >
              {showEntries}
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "show" && (
              <ul className={styles.options}>
                {[10, 25, 50, 100].map((count) => (
                  <li key={count} onClick={() => {
                    setShowEntries(count);
                    setShowDropdown(null);
                  }}>
                    {count}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.dropdownWrapper}>
            <div
              className={styles.organizationDropdown}
              onClick={() => setShowDropdown(showDropdown === "organization" ? null : "organization")}
            >
              {orgsLoading ? "Loading..." : selectedOrganization === "all" ? "All Organizations" : selectedOrganization}
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "organization" && (
              <ul className={styles.options}>
                <li key="all" onClick={() => {
                  setSelectedOrganization("all");
                  setShowDropdown(null);
                }}>
                  All Organizations
                </li>
                {organizations.map(org => (
                  <li key={org.id} onClick={() => {
                    setSelectedOrganization(org.acronym);
                    setShowDropdown(null);
                  }}>
                    {org.acronym} - {org.name.length > 30 ? org.name.substring(0, 30) + "..." : org.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.dropdownWrapper}>
            <div
              className={styles.dropdown}
              onClick={() => setShowDropdown(showDropdown === "section" ? null : "section")}
            >
              {selectedSection === "all" ? "All Section" : selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)}
              <FiChevronDown className={styles.icon} />
          </div>
            {showDropdown === "section" && (
              <ul className={styles.options}>
                <li key="all" onClick={() => {
                  setSelectedSection("all");
                  setShowDropdown(null);
                }}>
                  All Section
                </li>
                {["programs", "competency", "advocacy"].map((section) => (
                  <li key={section} onClick={() => {
                    setSelectedSection(section);
                    setShowDropdown(null);
                  }}>
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

        <div className={styles.searchWrapper}>
          <div className={styles.searchInputContainer}>
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
            {searchTerm ? (
              <FiX className={styles.clearIcon} onClick={() => setSearchTerm('')} />
            ) : (
              <FiSearch className={styles.searchIcon} />
            )}
          </div>

          <div className={styles.dropdownWrapper}>
            <div
              className={styles.dropdown}
              onClick={() => setShowDropdown(showDropdown === "sort" ? null : "sort")}
            >
              Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "sort" && (
              <ul className={styles.options}>
                {["latest", "oldest"].map((option) => (
                  <li key={option} onClick={() => {
                    setSortBy(option);
                    setShowDropdown(null);
                  }}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.statsCard}>
            <div className={styles.cardContent}>
              <h3 className={styles.statLabel}>Total Submissions</h3>
              <p className={styles.statNumber}>{approvals.length}</p>
            </div>
          </div>
        </div>
      </div>
      

      {/* Bulk Actions Bar */}
      {isBulkActionsVisible && (
        <div className={`${styles.bulkActionsBar} ${isBulkActionsHiding ? styles.hiding : ''}`}>
          <div className={styles.bulkActionsLeft}>
            <span className={styles.selectedCount}>
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className={styles.bulkActionsRight}>
            <button 
              onClick={handleBulkApproveSelected}
              disabled={isBulkActionLoading}
              className={`${styles.bulkActionBtn} ${styles.bulkApproveBtn} ${isBulkActionLoading ? styles.loading : ''}`}
            >
              <FiCheck />
              {isBulkActionLoading ? 'Processing...' : 'Approve All'}
            </button>
            <button 
              onClick={handleBulkRejectSelected}
              disabled={isBulkActionLoading}
              className={`${styles.bulkActionBtn} ${styles.bulkRejectBtn} ${isBulkActionLoading ? styles.loading : ''}`}
            >
              <FiX />
              {isBulkActionLoading ? 'Processing...' : 'Reject All'}
            </button>
            <button 
              onClick={handleBulkDeleteSelected}
              disabled={isBulkActionLoading}
              className={`${styles.bulkActionBtn} ${styles.bulkDeleteBtn} ${isBulkActionLoading ? styles.loading : ''}`}
            >
              <FiTrash2 />
              {isBulkActionLoading ? 'Processing...' : 'Delete All'}
            </button>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className={styles.tableSection}>
      {filteredApprovals.length === 0 ? (
        <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              <FiClipboard />
            </div>
          <h3 className={styles.emptyStateTitle}>No pending submissions</h3>
          <p className={styles.emptyStateText}>
            All submissions have been reviewed. New submissions will appear here when administrators submit updates.
          </p>
        </div>
      ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.selectColumn}>
                      <input
                        type="checkbox"
                        checked={selectedItems.size === currentApprovals.length && currentApprovals.length > 0}
                        onChange={handleSelectAll}
                        className={styles.checkbox}
                      />
                    </th>
                    <th className={styles.organizationColumn}>Organization</th>
                    <th className={styles.sectionColumn}>Section</th>
                    <th className={styles.dateColumn}>Date</th>
                    <th className={styles.statusColumn}>Status</th>
                    <th className={styles.actionsColumn}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentApprovals.map((approval) => (
                    <tr key={approval.id} className={styles.tableRow}>
                      <td className={styles.selectCell}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(approval.id)}
                          onChange={() => handleSelectItem(approval.id)}
                          className={styles.checkbox}
                        />
                      </td>
                      <td className={styles.organizationCell}>
                        <span className={styles.orgAcronym}>
                          {approval.organization_acronym || approval.org || 'N/A'}
                        </span>
                      </td>
                      <td className={styles.sectionCell}>
                        {approval.section?.charAt(0).toUpperCase() + approval.section?.slice(1) || 'N/A'}
                      </td>
                      <td className={styles.dateCell}>
                        {new Date(approval.submitted_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className={styles.statusCell}>
                        <span className={`${styles.statusBadge} ${styles.pending}`}>
                          Pending
              </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          
                          <div className={styles.actionDropdownWrapper}>
                            <div className={styles.actionDropdownButtonWrapper}>
                              <div
                                className={styles.actionDropdown}
                                onClick={(e) => {
                                  const dropdownId = `action-${approval.id}`;
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
                              {showDropdown === `action-${approval.id}` && (
                                <ul 
                                  className={`${styles.actionDropdownOptions} ${dropdownPosition[`action-${approval.id}`]?.position === 'above' ? styles.above : ''}`}
                                  style={{
                                    top: `${dropdownPosition[`action-${approval.id}`]?.top || 0}px`,
                                    right: `${dropdownPosition[`action-${approval.id}`]?.right || 0}px`
                                  }}
                                >
                                  <li onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowDropdown(null);
                                    setDropdownPosition({});
                                    handleViewDetails(approval);
                                  }}>
                                    View Details
                                  </li>
                                  <li onClick={() => {
                                    setShowDropdown(null);
                                    setDropdownPosition({});
                                    handleApprove(approval.id);
                                  }}>
                                    Approve
                                  </li>
                                  <li onClick={() => {
                                    setShowDropdown(null);
                                    setDropdownPosition({});
                                    handleReject(approval.id, '');
                                  }}>
                                    Reject
                                  </li>
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                Showing {startIndex + 1} to {Math.min(endIndex, filteredApprovals.length)} of {filteredApprovals.length} entries
              </div>
              <div className={styles.paginationControls}>
                {/* First Page Button */}
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className={styles.navButton}
                  aria-label="Go to first page"
                  title="First page"
                >
                  <RiArrowLeftDoubleFill size={16}/>
                </button>
                
                {/* Previous Page Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={styles.navButton}
                  aria-label="Go to previous page"
                  title="Previous page"
                >
                  <RiArrowLeftSLine size={16}/>
                </button>
                
                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`${styles.paginationButton} ${currentPage === page ? 'active' : ''}`}
                    aria-label={`Go to page ${page}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}
                
                {/* Next Page Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={styles.navButton}
                  aria-label="Go to next page"
                  title="Next page"
                >
                  <RiArrowRightSLine size={16}/>
                </button>
                
                {/* Last Page Button */}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className={styles.navButton}
                  aria-label="Go to last page"
                  title="Last page"
                >
                  <RiArrowRightDoubleFill size={16}/>
                </button>
            </div>
          </div>
          </>
        )}
      </div>


      {/* View Details Modal */}
      <ViewDetailsModal 
        isOpen={showDetailsModal}
        onClose={handleDetailsClose}
        submissionData={selectedItemForDetails}
      />

      {/* Bulk Action Confirmation Modal */}
      <BulkActionConfirmationModal
        isOpen={showBulkConfirmation}
        actionType={pendingBulkAction}
        selectedCount={selectedItems.size}
        onConfirm={handleBulkConfirmationConfirm}
        onCancel={handleBulkConfirmationCancel}
        isProcessing={isBulkActionLoading}
      />
    </div>
  );
}
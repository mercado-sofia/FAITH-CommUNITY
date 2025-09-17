'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FiCheck, FiX, FiTrash2 } from 'react-icons/fi';
import { IoCloseOutline } from 'react-icons/io5';
import { RiArrowLeftSLine, RiArrowRightSLine, RiArrowLeftDoubleFill, RiArrowRightDoubleFill } from "react-icons/ri";
import BulkActionConfirmationModal from './components/BulkActionConfirmationModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import ApprovalsTable from './components/ApprovalsTable';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import styles from './approvals.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Helper function to make authenticated API calls
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('superAdminToken');
  if (!token) {
    // Clear invalid data and redirect to login
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminData');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/login';
    return null;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  // Check if response is JSON before parsing
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Server returned an invalid response. Please try again.');
  }

  if (response.status === 401) {
    // Token expired or invalid - redirect to login
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminData');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/login';
    return null;
  }

  return response;
};

export default function PendingApprovalsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '' });
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  
  // Filter and search states
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [showEntries, setShowEntries] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Bulk actions
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isBulkActionsVisible, setIsBulkActionsVisible] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  
  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({});
  
  
  // Bulk action confirmation modal state
  const [showBulkConfirmation, setShowBulkConfirmation] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState(null);
  
  
  // Individual action modal state
  const [showIndividualModal, setShowIndividualModal] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState(null);
  const [pendingIndividualAction, setPendingIndividualAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Individual delete modal state
  const [showIndividualDeleteModal, setShowIndividualDeleteModal] = useState(false);
  const [isIndividualDeleting, setIsIndividualDeleting] = useState(false);
  
  // Bulk delete modal state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const [filteredApprovals, setFilteredApprovals] = useState([]);

  // Function to calculate dropdown position
  const calculateDropdownPosition = (buttonElement) => {
    if (!buttonElement) return { position: 'below', top: 0, right: 0 };
    
    const rect = buttonElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 120;
    const right = 0;
    
    // Check if there's enough space below
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    let top, position;
    
    // If not enough space below but enough above, show above
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      position = 'above';
      top = -dropdownHeight - 4; // 4px gap above the button
    } else {
      position = 'below';
      top = rect.height + 4; // 4px gap below the button
    }
    
    return { position, top, right };
  };

  const fetchApprovals = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const res = await makeAuthenticatedRequest(`${API_BASE_URL}/api/approvals`);
      if (!res) return; // Helper function handled redirect
      
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
  }, []);

  const fetchOrganizations = async () => {
    try {
      setOrgsLoading(true);
      
      const res = await makeAuthenticatedRequest(`${API_BASE_URL}/api/organizations`);
      if (!res) return; // Helper function handled redirect
      
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

  // Success modal handlers
  const showSuccessModal = useCallback((message) => {
    setSuccessModal({ isVisible: true, message });
  }, []);

  const closeSuccessModal = () => {
    setSuccessModal({ isVisible: false, message: '' });
  };

  useEffect(() => {
    fetchApprovals();
    fetchOrganizations();
  }, [fetchApprovals]);

  // Function to update URL parameters
  const updateURLParams = useCallback((newParams) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newParams).forEach(([key, value]) => {
      // Define default values for each parameter
      const defaults = {
        organization: 'all',
        section: 'all', 
        status: 'all',
        search: '',
        sort: 'latest',
        show: 10,
        page: 1
      };
      
      // Only add to URL if value is not default and not empty
      if (value && value !== defaults[key] && value !== '') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    const newURL = `${pathname}?${params.toString()}`;
    router.replace(newURL, { scroll: false });
  }, [searchParams, pathname, router]);

  // Handle URL parameters for all filters
  useEffect(() => {
    const urlParams = {
      organization: searchParams.get('organization'),
      section: searchParams.get('section'),
      status: searchParams.get('status'),
      search: searchParams.get('search'),
      sort: searchParams.get('sort'),
      show: searchParams.get('show'),
      page: searchParams.get('page')
    };

    // Set filters based on URL parameters
    if (urlParams.organization) {
      setSelectedOrganization(urlParams.organization);
    }
    if (urlParams.section) {
      setSelectedSection(urlParams.section);
    }
    if (urlParams.status) {
      setSelectedStatus(urlParams.status);
    }
    if (urlParams.search) {
      setSearchTerm(urlParams.search);
    }
    if (urlParams.sort) {
      setSortBy(urlParams.sort);
    }
    if (urlParams.show) {
      setShowEntries(parseInt(urlParams.show));
    }
    if (urlParams.page) {
      setCurrentPage(parseInt(urlParams.page));
    }
  }, [searchParams]);

  // Handle bulk actions bar visibility - no delay, instant show/hide
  useEffect(() => {
    setIsBulkActionsVisible(selectedItems.size > 0);
  }, [selectedItems.size]);

  // Handle click outside for dropdowns (excluding SearchAndFilterControls)
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if target is a valid element with closest method
      if (!e.target || !e.target.closest) {
        return;
      }
      
      // Don't close if clicking on SearchAndFilterControls dropdowns
      if (e.target.closest('[data-search-filter-controls]')) {
        return;
      }
      
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
      if (showDropdown && e.target && e.target.closest) {
        if (!e.target.closest(`.${styles.dropdownWrapper}`) && 
            !e.target.closest(`.${styles.actionDropdownWrapper}`)) {
          setShowDropdown(null);
          setDropdownPosition({});
        }
      } else if (showDropdown) {
        // If we can't determine the target, close dropdowns to be safe
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
  }, [showDropdown]);

  // Filter and search logic
  useEffect(() => {
    let filtered = [...approvals];

    // Filter by organization
    if (selectedOrganization !== 'all') {
      filtered = filtered.filter(approval => 
        approval.org === selectedOrganization
      );
    }

    // Filter by section
    if (selectedSection !== 'all') {
      filtered = filtered.filter(approval => 
        approval.section === selectedSection
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(approval => 
        approval.status === selectedStatus
      );
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(approval => 
        approval.org?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.orgName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.id?.toString().includes(searchTerm) ||
        approval.submission_id?.toString().includes(searchTerm)
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
  }, [approvals, selectedOrganization, selectedSection, selectedStatus, searchTerm, sortBy]);

  const handleApprove = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Approval failed');
      }

      showSuccessModal('Changes have been approved and applied.');
      fetchApprovals(); // Refresh the list
    } catch (err) {
      console.error('❌ Approve error:', err);
      showSuccessModal('Failed to approve changes: ' + err.message);
    }
  }, [showSuccessModal, fetchApprovals]);

  const handleReject = useCallback(async (id, rejectComment = '') => {
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

      showSuccessModal('Submission has been rejected.');
      fetchApprovals();
    } catch (err) {
      console.error('❌ Reject error:', err);
      showSuccessModal('Failed to reject submission: ' + err.message);
    }
  }, [showSuccessModal, fetchApprovals]);

  // Bulk action handlers
  const handleBulkApprove = useCallback(async (ids) => {
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

      showSuccessModal(`Bulk approval completed: ${result.details.successCount} approved`);
      fetchApprovals();
    } catch (err) {
      console.error('❌ Bulk approve error:', err);
      showSuccessModal('Failed to bulk approve approvals: ' + err.message);
    }
  }, [showSuccessModal, fetchApprovals]);

  const handleBulkReject = useCallback(async (ids, rejectComment = '') => {
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

      showSuccessModal(`Bulk rejection completed: ${result.details.successCount} rejected`);
      fetchApprovals();
    } catch (err) {
      console.error('❌ Bulk reject error:', err);
      showSuccessModal('Failed to bulk reject approvals: ' + err.message);
    }
  }, [showSuccessModal, fetchApprovals]);

  const handleBulkDelete = useCallback(async (ids) => {
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

      showSuccessModal(`Bulk deletion completed: ${result.details.successCount} deleted`);
      fetchApprovals();
    } catch (err) {
      console.error('❌ Bulk delete error:', err);
      showSuccessModal('Failed to bulk delete approvals: ' + err.message);
    }
  }, [showSuccessModal, fetchApprovals]);


  // Individual action handlers
  const handleApproveClick = useCallback((approval) => {
    setSelectedItemForAction(approval);
    setPendingIndividualAction('approve');
    setShowIndividualModal(true);
  }, []);

  const handleRejectClick = useCallback((approval) => {
    setSelectedItemForAction(approval);
    setPendingIndividualAction('reject');
    setShowIndividualModal(true);
  }, []);

  const handleIndividualActionConfirm = useCallback(async (rejectComment) => {
    if (!selectedItemForAction || !pendingIndividualAction) return;
    
    setIsProcessing(true);
    setShowIndividualModal(false);
    
    try {
      switch (pendingIndividualAction) {
        case 'approve':
          await handleApprove(selectedItemForAction.id);
          break;
        case 'reject':
          await handleReject(selectedItemForAction.id, rejectComment || '');
          break;
        default:
          throw new Error('Invalid individual action');
      }
      
      setSelectedItemForAction(null);
      setPendingIndividualAction(null);
    } catch (error) {
      console.error('Individual action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedItemForAction, pendingIndividualAction, handleApprove, handleReject]);

  const handleIndividualActionCancel = useCallback(() => {
    setShowIndividualModal(false);
    setSelectedItemForAction(null);
    setPendingIndividualAction(null);
  }, []);

  // Individual delete handlers
  const handleDeleteClick = useCallback((item) => {
    setSelectedItemForAction(item);
    setShowIndividualDeleteModal(true);
  }, []);

  // Bulk delete handlers
  const handleBulkDeleteClick = useCallback(() => {
    if (selectedItems.size === 0) return;
    setShowBulkDeleteModal(true);
  }, [selectedItems.size]);

  const handleBulkDeleteConfirm = async () => {
    if (selectedItems.size === 0) return;
    
    setIsBulkDeleting(true);
    try {
      const selectedIds = Array.from(selectedItems);
      await handleBulkDelete(selectedIds);
      setShowBulkDeleteModal(false);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Bulk delete failed:', error);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDeleteCancel = () => {
    setShowBulkDeleteModal(false);
  };

  // Individual delete confirmation handlers
  const handleIndividualDeleteConfirm = async () => {
    if (!selectedItemForAction) return;
    
    setIsIndividualDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/${selectedItemForAction.id}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Deletion failed');
      }

      showSuccessModal('Submission deleted successfully');
      fetchApprovals();
      setShowIndividualDeleteModal(false);
      setSelectedItemForAction(null);
    } catch (error) {
      console.error('Individual delete failed:', error);
      showSuccessModal('Failed to delete submission: ' + error.message);
    } finally {
      setIsIndividualDeleting(false);
    }
  };

  const handleIndividualDeleteCancel = () => {
    setShowIndividualDeleteModal(false);
    setSelectedItemForAction(null);
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

  // Get pending items from current approvals for bulk actions
  const pendingApprovals = currentApprovals.filter(approval => approval.status === 'pending');
  const hasPendingItems = pendingApprovals.length > 0;

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
    handleBulkDeleteClick();
  }, [selectedItems.size, isBulkActionLoading, handleBulkDeleteClick]);

  const cancelSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

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
  }, [pendingBulkAction, selectedItems, handleBulkApprove, handleBulkReject]);

  // Event handlers
  const handleOrganizationChange = useCallback((e) => {
    const value = e.target.value;
    setSelectedOrganization(value);
    updateURLParams({ organization: value });
  }, [updateURLParams]);

  const handleSectionChange = useCallback((e) => {
    const value = e.target.value;
    setSelectedSection(value);
    updateURLParams({ section: value });
  }, [updateURLParams]);

  const handleStatusChange = useCallback((e) => {
    const value = e.target.value;
    setSelectedStatus(value);
    updateURLParams({ status: value });
  }, [updateURLParams]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    updateURLParams({ search: value });
  }, [updateURLParams]);

  const handleSortChange = useCallback((e) => {
    const value = e.target.value;
    setSortBy(value);
    updateURLParams({ sort: value });
  }, [updateURLParams]);

  const handleShowEntriesChange = useCallback((value) => {
    setShowEntries(value);
    setCurrentPage(1);
    updateURLParams({ show: value, page: 1 });
  }, [updateURLParams]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    updateURLParams({ page });
  }, [updateURLParams]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading approvals...</div>
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
      {/* Success Modal */}
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={closeSuccessModal}
      />

      {/* Header Section */}
      <div className={styles.header}>
          <h1 className={styles.pageTitle}>Approvals</h1>
        </div>

      {/* Search and Filter Controls */}
      <SearchAndFilterControls
        selectedOrganization={selectedOrganization}
        selectedSection={selectedSection}
        selectedStatus={selectedStatus}
        searchTerm={searchTerm}
        sortBy={sortBy}
        showEntries={showEntries}
        organizations={organizations}
        orgsLoading={orgsLoading}
        showDropdown={showDropdown}
        setShowDropdown={setShowDropdown}
        onOrganizationChange={handleOrganizationChange}
        onSectionChange={handleSectionChange}
        onStatusChange={handleStatusChange}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        onShowEntriesChange={handleShowEntriesChange}
        onUpdateURLParams={updateURLParams}
      />
      

      {/* Bulk Actions Bar */}
      {isBulkActionsVisible && (
        <div className={styles.bulkActionsBar}>
          <div className={styles.bulkActionsLeft}>
            <span className={styles.selectedCount}>
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className={styles.bulkActionsRight}>
            {hasPendingItems && (
              <>
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
              </>
            )}
            <button 
              onClick={handleBulkDeleteSelected}
              disabled={isBulkActionLoading}
              className={`${styles.bulkActionBtn} ${styles.bulkDeleteBtn} ${isBulkActionLoading ? styles.loading : ''}`}
            >
              <FiTrash2 />
              {isBulkActionLoading ? 'Processing...' : 'Delete All'}
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

      {/* Table Section */}
      <div className={styles.tableSection}>
        <ApprovalsTable
          approvals={currentApprovals}
          onApprove={handleApprove}
          onRejectClick={handleRejectClick}
          onDeleteClick={handleDeleteClick}
          selectedItems={selectedItems}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          dropdownPosition={dropdownPosition}
          setDropdownPosition={setDropdownPosition}
          calculateDropdownPosition={calculateDropdownPosition}
        />

        {/* Pagination - Only show if there are items */}
        {filteredApprovals.length > 0 && (
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
        )}
      </div>

      {/* Bulk Action Confirmation Modal */}
      <BulkActionConfirmationModal
        isOpen={showBulkConfirmation}
        actionType={pendingBulkAction}
        selectedCount={selectedItems.size}
        onConfirm={handleBulkConfirmationConfirm}
        onCancel={handleBulkConfirmationCancel}
        isProcessing={isBulkActionLoading}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        itemName={`${selectedItems.size} submission${selectedItems.size > 1 ? 's' : ''}`}
        itemType="submission"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={handleBulkDeleteCancel}
        isDeleting={isBulkDeleting}
      />

      {/* Individual Action Confirmation Modal */}
      <BulkActionConfirmationModal
        isOpen={showIndividualModal}
        actionType={pendingIndividualAction}
        selectedCount={1}
        selectedItem={selectedItemForAction}
        onConfirm={handleIndividualActionConfirm}
        onCancel={handleIndividualActionCancel}
        isProcessing={isProcessing}
      />

      {/* Individual Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showIndividualDeleteModal}
        itemName={selectedItemForAction?.org || selectedItemForAction?.organization_acronym || 'this submission'}
        itemType="submission"
        onConfirm={handleIndividualDeleteConfirm}
        onCancel={handleIndividualDeleteCancel}
        isDeleting={isIndividualDeleting}
      />
    </div>
  );
}
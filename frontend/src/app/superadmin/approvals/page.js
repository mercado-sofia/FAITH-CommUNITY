'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FiClipboard, FiSearch, FiChevronDown, FiCheck, FiX, FiTrash2 } from 'react-icons/fi';
import { RiArrowLeftSLine, RiArrowRightSLine, RiArrowLeftDoubleFill, RiArrowRightDoubleFill } from "react-icons/ri";
import BulkActionConfirmationModal from './components/BulkActionConfirmationModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import ApprovalsTable from './components/ApprovalsTable';
import styles from './approvals.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isBulkActionsVisible, setIsBulkActionsVisible] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isBulkActionsHiding, setIsBulkActionsHiding] = useState(false);
  
  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({});
  
  
  // Bulk action confirmation modal state
  const [showBulkConfirmation, setShowBulkConfirmation] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState(null);
  
  
  // Individual approve/reject/delete modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState(null);
  const [selectedItemForDelete, setSelectedItemForDelete] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Bulk delete modal state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const [filteredApprovals, setFilteredApprovals] = useState([]);

  // Function to calculate dropdown position
  const calculateDropdownPosition = (buttonElement) => {
    if (!buttonElement) return { position: 'below', top: 0, right: 0 };
    
    const rect = buttonElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 120; // Approximate height of dropdown with 3 items
    
    // Calculate horizontal position (right-aligned to button)
    // For absolute positioning, we need to position relative to the button
    const right = 0; // Align to the right edge of the button
    
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
      const res = await fetch(`${API_BASE_URL}/api/approvals`);
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
      // Check if target is a valid element with closest method
      if (!e.target || !e.target.closest) {
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


  // Individual approve/reject modal handlers
  const handleApproveClick = useCallback((approval) => {
    setSelectedItemForAction(approval);
    setShowApproveModal(true);
  }, []);

  const handleRejectClick = useCallback((approval) => {
    setSelectedItemForAction(approval);
    setRejectComment('');
    setShowRejectModal(true);
  }, []);

  const handleApproveConfirm = async () => {
    if (!selectedItemForAction) return;
    
    setIsProcessing(true);
    try {
      await handleApprove(selectedItemForAction.id);
      setShowApproveModal(false);
      setSelectedItemForAction(null);
    } catch (error) {
      console.error('Approve failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedItemForAction) return;
    
    setIsProcessing(true);
    try {
      await handleReject(selectedItemForAction.id, rejectComment);
      setShowRejectModal(false);
      setSelectedItemForAction(null);
      setRejectComment('');
    } catch (error) {
      console.error('Reject failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveCancel = () => {
    setShowApproveModal(false);
    setSelectedItemForAction(null);
  };

  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setSelectedItemForAction(null);
    setRejectComment('');
  };

  // Individual delete handlers
  const handleDeleteClick = useCallback((item) => {
    setSelectedItemForDelete(item);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedItemForDelete) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/${selectedItemForDelete.id}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Deletion failed');
      }

      showSuccessModal('Submission deleted successfully');
      fetchApprovals();
      setShowDeleteModal(false);
      setSelectedItemForDelete(null);
    } catch (err) {
      console.error('❌ Delete error:', err);
      showSuccessModal('Failed to delete submission: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItemForDelete, showSuccessModal, fetchApprovals]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false);
    setSelectedItemForDelete(null);
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

  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    updateURLParams({ search: value });
  }, [updateURLParams]);

  const handleSortChange = useCallback((e) => {
    const value = e.target.value;
    setSortBy(value);
    updateURLParams({ sort: value });
  }, [updateURLParams]);

  const handleShowEntriesChange = useCallback((e) => {
    const value = parseInt(e.target.value);
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

      {/* Controls and Stats Section */}
      <div className={styles.controlsAndStatsSection}>
        <div className={styles.controlsLeft}>
          <span className={styles.inlineLabel}>Show</span>
          <div className={styles.dropdownWrapper}>
            <div
              className={`${styles.dropdown} ${showDropdown === "show" ? styles.open : ""}`}
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
                    setCurrentPage(1);
                    updateURLParams({ show: count, page: 1 });
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
              className={`${styles.organizationDropdown} ${showDropdown === "organization" ? styles.open : ""}`}
              onClick={() => setShowDropdown(showDropdown === "organization" ? null : "organization")}
            >
              {orgsLoading ? "Loading..." : selectedOrganization === "all" ? "All Organizations" : selectedOrganization}
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "organization" && (
              <ul className={styles.options}>
                <li key="all" onClick={() => {
                  setSelectedOrganization("all");
                  updateURLParams({ organization: "all" });
                  setShowDropdown(null);
                }}>
                  All Organizations
                </li>
                {organizations.map(org => (
                  <li key={org.id} onClick={() => {
                    setSelectedOrganization(org.acronym);
                    updateURLParams({ organization: org.acronym });
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
              className={`${styles.dropdown} ${showDropdown === "section" ? styles.open : ""}`}
              onClick={() => setShowDropdown(showDropdown === "section" ? null : "section")}
            >
              {selectedSection === "all" ? "All Section" : selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)}
              <FiChevronDown className={styles.icon} />
          </div>
            {showDropdown === "section" && (
              <ul className={styles.options}>
                <li key="all" onClick={() => {
                  setSelectedSection("all");
                  updateURLParams({ section: "all" });
                  setShowDropdown(null);
                }}>
                  All Section
                </li>
                {["programs", "competency", "advocacy"].map((section) => (
                  <li key={section} onClick={() => {
                    setSelectedSection(section);
                    updateURLParams({ section });
                    setShowDropdown(null);
                  }}>
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.dropdownWrapper}>
            <div
              className={`${styles.dropdown} ${showDropdown === "status" ? styles.open : ""}`}
              onClick={() => setShowDropdown(showDropdown === "status" ? null : "status")}
            >
              {selectedStatus === "all" ? "All Status" : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "status" && (
              <ul className={styles.options}>
                <li key="all" onClick={() => {
                  setSelectedStatus("all");
                  updateURLParams({ status: "all" });
                  setShowDropdown(null);
                }}>
                  All Status
                </li>
                {["pending", "approved", "rejected"].map((status) => (
                  <li key={status} onClick={() => {
                    setSelectedStatus(status);
                    updateURLParams({ status });
                    setShowDropdown(null);
                  }}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
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
              <FiX className={styles.clearIcon} onClick={() => {
                setSearchTerm('');
                updateURLParams({ search: '' });
              }} />
            ) : (
              <FiSearch className={styles.searchIcon} />
            )}
          </div>

          <div className={styles.dropdownWrapper}>
            <div
              className={`${styles.dropdown} ${showDropdown === "sort" ? styles.open : ""}`}
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
                    updateURLParams({ sort: option });
                    setShowDropdown(null);
                  }}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </li>
                ))}
              </ul>
            )}
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
          <h3 className={styles.emptyStateTitle}>No submissions found</h3>
          <p className={styles.emptyStateText}>
            {selectedStatus === 'pending' 
              ? 'No pending submissions found. New submissions will appear here when administrators submit updates.'
              : selectedStatus === 'approved'
              ? 'No approved submissions found.'
              : selectedStatus === 'rejected'
              ? 'No rejected submissions found.'
              : 'No submissions found matching your current filters. New submissions will appear here when administrators submit updates.'
            }
          </p>
        </div>
      ) : (
          <>
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
      <DeleteConfirmationModal
        isOpen={showBulkDeleteModal}
        itemName={`${selectedItems.size} submission${selectedItems.size > 1 ? 's' : ''}`}
        itemType="submission"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={handleBulkDeleteCancel}
        isDeleting={isBulkDeleting}
      />

      {/* Individual Approve Confirmation Modal */}
      {showApproveModal && selectedItemForAction && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <button 
              className={styles.modalCloseBtn}
              onClick={handleApproveCancel}
            >
              <FiX />
            </button>
            
            <div className={styles.modalContent}>
              <h2>
                <span 
                  className={styles.approveHeading}
                  style={{ color: '#10b981' }}
                >
                  Approve
                </span> Submission
              </h2>
              <p>
                Are you sure you want to approve <strong>
                  {selectedItemForAction.org || 'this submission'}
                </strong>&apos;s submission?
              </p>
            </div>

            <div className={styles.modalActions}>
              <button 
                className={styles.modalCancelBtn}
                onClick={handleApproveCancel}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                className={styles.modalApproveBtn}
                onClick={handleApproveConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Reject Confirmation Modal */}
      {showRejectModal && selectedItemForAction && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <button 
              className={styles.modalCloseBtn}
              onClick={handleRejectCancel}
            >
              <FiX />
            </button>
            
            <div className={styles.modalContent}>
              <h2>
                <span 
                  className={styles.declineHeading}
                  style={{ color: '#d50808' }}
                >
                  Reject
                </span> Submission
              </h2>
              <p>
                Are you sure you want to reject <strong>
                  {selectedItemForAction.org || 'this submission'}
                </strong>&apos;s submission? You can optionally provide a reason below.
              </p>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Enter rejection reason (optional)..."
                className={styles.rejectTextarea}
                rows={4}
                disabled={isProcessing}
              />
            </div>

            <div className={styles.modalActions}>
              <button 
                className={styles.modalCancelBtn}
                onClick={handleRejectCancel}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                className={styles.modalDeclineBtn}
                onClick={handleRejectConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        itemName={selectedItemForDelete?.org || 'Submission'}
        itemType="submission"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </div>
  );
}
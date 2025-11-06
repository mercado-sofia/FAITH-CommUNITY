'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FiCheck, FiX, FiTrash2, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { IoCloseOutline } from 'react-icons/io5';
import { RiArrowLeftSLine, RiArrowRightSLine, RiArrowLeftDoubleFill, RiArrowRightDoubleFill } from "react-icons/ri";
import BulkActionConfirmationModal from './components/BulkActionConfirmationModal';
import { ConfirmationModal } from '@/components';
import { SuccessModal } from '@/components';
import ApprovalsTable from './components/ApprovalsTable';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import { SkeletonLoader } from '../components';
import styles from './approvals.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Helper function to make authenticated API calls
const makeAuthenticatedRequest = async (url, options = {}) => {
  // Check for window to avoid SSR errors
  if (typeof window === 'undefined') {
    throw new Error('Cannot make authenticated request on server side');
  }

  const token = localStorage.getItem('superAdminToken');
  if (!token) {
    // Use centralized immediate cleanup for security
    const { clearAuthImmediate, USER_TYPES } = await import('@/utils/authService');
    clearAuthImmediate(USER_TYPES.SUPERADMIN);
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
    // Token expired or invalid - use centralized cleanup
    const { clearAuthImmediate, USER_TYPES } = await import('@/utils/authService');
    clearAuthImmediate(USER_TYPES.SUPERADMIN);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  return response;
};

// Helper function to normalize organization acronym for comparison (case-insensitive, trim spaces)
const normalizeOrgAcronym = (acronym) => {
  if (!acronym) return '';
  return String(acronym).trim().toLowerCase();
};

// Helper function to check if approval matches selected organization (including collaborators)
const matchesOrganization = (approval, orgAcronym) => {
  if (!orgAcronym || orgAcronym === 'all') return true;
  
  const normalizedOrgAcronym = normalizeOrgAcronym(orgAcronym);
  
  // Special case: "Collab Admin" or "Collaboration Administrator" - filter for collaborative programs
  const isCollabAdmin = normalizedOrgAcronym === 'collab admin' || 
                        normalizedOrgAcronym === 'collaboration administrator' ||
                        normalizedOrgAcronym.includes('collab admin') ||
                        normalizedOrgAcronym.includes('collaboration administrator');
  
  if (isCollabAdmin) {
    // Only filter collaborative programs for program submissions
    if (approval.section === 'programs' && approval.proposed_data) {
      try {
        const proposedData = typeof approval.proposed_data === 'string' 
          ? JSON.parse(approval.proposed_data) 
          : approval.proposed_data;
        
        if (proposedData) {
          // Check if program is collaborative (has is_collaborative flag set to true/1)
          const isCollaborative = proposedData.is_collaborative === true || 
                                  proposedData.is_collaborative === 1 ||
                                  proposedData.is_collaborative === '1';
          
          // Check if program has collaborators array with at least one collaborator
          const hasCollaborators = proposedData.collaborators && 
                                   Array.isArray(proposedData.collaborators) && 
                                   proposedData.collaborators.length > 0;
          
          // Return true if program is collaborative (either by flag or has collaborators)
          return isCollaborative || hasCollaborators;
        }
      } catch (error) {
        // If parsing fails, don't include this approval
        console.warn('Error parsing proposed_data for approval:', approval.id, error);
        return false;
      }
    }
    // For non-program submissions, don't match when Collab Admin is selected
    return false;
  }
  
  // Regular organization filtering
  // Check main organization (case-insensitive)
  const mainOrgAcronym = normalizeOrgAcronym(
    approval.org || 
    approval.organization_acronym || 
    approval.organization?.acronym ||
    ''
  );
  
  if (mainOrgAcronym === normalizedOrgAcronym) {
    return true;
  }

  // For program submissions, check collaborators
  if (approval.section === 'programs' && approval.proposed_data) {
    try {
      const proposedData = typeof approval.proposed_data === 'string' 
        ? JSON.parse(approval.proposed_data) 
        : approval.proposed_data;
      
      if (proposedData) {
        // Check if program has collaborators array
        if (proposedData.collaborators && Array.isArray(proposedData.collaborators) && proposedData.collaborators.length > 0) {
          // Check if any collaborator belongs to the selected organization
          const hasMatchingCollaborator = proposedData.collaborators.some(collaborator => {
            // Handle both ID format and object format
            if (typeof collaborator === 'object' && collaborator !== null) {
              const collaboratorOrgAcronym = normalizeOrgAcronym(
                collaborator.organization_acronym ||
                collaborator.org ||
                collaborator.org_acronym ||
                collaborator.organization?.acronym ||
                collaborator.organization?.org ||
                collaborator.organization?.org_acronym ||
                ''
              );
              
              return collaboratorOrgAcronym === normalizedOrgAcronym;
            }
            return false;
          });
          
          if (hasMatchingCollaborator) {
            return true;
          }
        }
        
        // Also check if program is marked as collaborative (is_collaborative flag)
        // This handles cases where collaboration might be stored differently
        if (proposedData.is_collaborative === true || proposedData.is_collaborative === 1) {
          // If it's collaborative, we should still check if this org is involved
          // But if we can't determine, we'll be conservative and not include it
          // unless we have explicit collaborator data
        }
      }
    } catch (error) {
      // If parsing fails, just check main organization (already done above)
      console.warn('Error parsing proposed_data for approval:', approval.id, error);
    }
  }

  return false;
};

export default function PendingApprovalsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
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
      
      // Fetch submissions only (collaborative programs are now handled as regular submissions)
      const submissionsRes = await makeAuthenticatedRequest(`${API_BASE_URL}/api/approvals`);
      
      if (!submissionsRes) return; // Helper function handled redirect
      
      const submissionsResult = await submissionsRes.json();

      if (!submissionsRes.ok || !submissionsResult.success) {
        throw new Error(submissionsResult.message || 'Failed to fetch submissions');
      }

      // Format submissions
      const allApprovals = submissionsResult.data.map((item) => ({
        ...item,
        submitted_at: new Date(item.submitted_at),
        uniqueKey: `submission-${item.id}` // Create unique key
      }));
      
      // Sort by date (newest first)
      allApprovals.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

      setApprovals(allApprovals);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load approvals');
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrganizations = useCallback(async () => {
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
      // Handle error silently in production
    } finally {
      setOrgsLoading(false);
    }
  }, []);

  // Success modal handlers
  const showSuccessModal = useCallback((message, type = 'success') => {
    setSuccessModal({ isVisible: true, message, type });
  }, []);

  const closeSuccessModal = () => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  };

  useEffect(() => {
    fetchApprovals();
    fetchOrganizations();
  }, [fetchApprovals, fetchOrganizations]);

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
      // Don't close if scrolling inside SearchAndFilterControls or its dropdowns
      if (showDropdown) {
        if (e.target && e.target.closest) {
          // Check if scroll is inside SearchAndFilterControls dropdowns
          const searchFilterControls = e.target.closest('[data-search-filter-controls]');
          if (searchFilterControls) {
            // Check if scrolling inside the options list or dropdown wrapper within SearchAndFilterControls
            const optionsList = e.target.closest('[class*="options"]');
            const dropdownWrapper = e.target.closest('[class*="dropdownWrapper"]');
            if (optionsList || dropdownWrapper) {
              // Don't close if scrolling inside dropdown options
              return;
            }
          }
          
          // Check if scrolling inside action dropdowns (table row actions)
          if (!e.target.closest(`.${styles.dropdownWrapper}`) && 
              !e.target.closest(`.${styles.actionDropdownWrapper}`) &&
              !e.target.closest('[data-search-filter-controls]')) {
            setShowDropdown(null);
            setDropdownPosition({});
          }
        } else if (e.target && e.target.nodeType === Node.DOCUMENT_NODE) {
          // If scrolling the document/page itself (not inside a dropdown), close dropdowns
          setShowDropdown(null);
          setDropdownPosition({});
        }
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

  // Extract unique sections from approvals data
  const availableSections = useMemo(() => {
    const sections = new Set();
    approvals.forEach(approval => {
      if (approval.section) {
        sections.add(approval.section);
      }
    });
    // Sort sections alphabetically for consistent display
    return Array.from(sections).sort((a, b) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }, [approvals]);

  // Filter and search logic
  useEffect(() => {
    let filtered = [...approvals];

    // Filter by organization (including collaborators)
    if (selectedOrganization !== 'all') {
      filtered = filtered.filter(approval => 
        matchesOrganization(approval, selectedOrganization)
      );
    }

    // Filter by section (case-insensitive matching)
    if (selectedSection !== 'all') {
      filtered = filtered.filter(approval => 
        approval.section && approval.section.toLowerCase() === selectedSection.toLowerCase()
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
        approval.organization_acronym?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        approval.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleApprove = useCallback(async (item) => {
    try {
      const url = `${API_BASE_URL}/api/approvals/${item.id}/approve`;

      const res = await makeAuthenticatedRequest(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        // Show detailed error message from backend
        const errorMessage = result.error || result.message || 'Approval failed';
        throw new Error(errorMessage);
      }

      showSuccessModal('Changes have been approved and applied.');
      fetchApprovals(); // Refresh the list
    } catch (err) {
      console.error('Approval error:', err);
      showSuccessModal('Failed to approve changes: ' + err.message, 'error');
    }
  }, [showSuccessModal, fetchApprovals]);

  const handleReject = useCallback(async (item, rejectComment = '') => {
    try {
      const url = `${API_BASE_URL}/api/approvals/${item.id}/reject`;

      const res = await makeAuthenticatedRequest(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_comment: rejectComment })
      });

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Rejection failed');
      }

      showSuccessModal('Item has been rejected.');
      fetchApprovals();
    } catch (err) {
      showSuccessModal('Failed to reject item: ' + err.message, 'error');
    }
  }, [showSuccessModal, fetchApprovals]);

  // Bulk action handlers
  const handleBulkApprove = useCallback(async (uniqueKeys) => {
    try {
      // Extract original IDs from unique keys
      const originalIds = uniqueKeys.map(key => {
        if (key.startsWith('submission-')) {
          return key.replace('submission-', '');
        }
        return key; // fallback for items without unique keys
      });

      const res = await makeAuthenticatedRequest(`${API_BASE_URL}/api/approvals/bulk/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: originalIds })
      });

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk approval failed');
      }

      showSuccessModal(`Bulk approval completed: ${result.details.successCount} approved`);
      fetchApprovals();
    } catch (err) {
      showSuccessModal('Failed to bulk approve approvals: ' + err.message, 'error');
    }
  }, [showSuccessModal, fetchApprovals]);

  const handleBulkReject = useCallback(async (uniqueKeys, rejectComment = '') => {
    try {
      // Extract original IDs from unique keys
      const originalIds = uniqueKeys.map(key => {
        if (key.startsWith('submission-')) {
          return key.replace('submission-', '');
        }
        return key; // fallback for items without unique keys
      });

      const res = await makeAuthenticatedRequest(`${API_BASE_URL}/api/approvals/bulk/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: originalIds, rejection_comment: rejectComment })
      });

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk rejection failed');
      }

      showSuccessModal(`Bulk rejection completed: ${result.details.successCount} rejected`);
      fetchApprovals();
    } catch (err) {
      showSuccessModal('Failed to bulk reject approvals: ' + err.message, 'error');
    }
  }, [showSuccessModal, fetchApprovals]);

  const handleBulkDelete = useCallback(async (uniqueKeys) => {
    try {
      // Extract original IDs from unique keys
      const originalIds = uniqueKeys.map(key => {
        if (key.startsWith('submission-')) {
          return key.replace('submission-', '');
        }
        return key; // fallback for items without unique keys
      });

      const res = await makeAuthenticatedRequest(`${API_BASE_URL}/api/approvals/bulk/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: originalIds })
      });

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk deletion failed');
      }

      showSuccessModal(`Bulk deletion completed: ${result.details.successCount} deleted`);
      fetchApprovals();
    } catch (err) {
      showSuccessModal('Failed to bulk delete approvals: ' + err.message, 'error');
    }
  }, [showSuccessModal, fetchApprovals]);

  // Individual action handlers
  const handleApproveClick = useCallback((approval) => {
    setSelectedItemForAction(approval);
    setPendingIndividualAction('approve');
    setIsProcessing(false); // Ensure processing state is reset when opening modal
    setShowIndividualModal(true);
  }, []);

  const handleRejectClick = useCallback((approval) => {
    setSelectedItemForAction(approval);
    setPendingIndividualAction('reject');
    setIsProcessing(false); // Ensure processing state is reset when opening modal
    setShowIndividualModal(true);
  }, []);

  const handleIndividualActionConfirm = useCallback(async (rejectComment) => {
    if (!selectedItemForAction || !pendingIndividualAction) {
      console.error('Cannot confirm action: missing selectedItemForAction or pendingIndividualAction', {
        selectedItemForAction,
        pendingIndividualAction
      });
      return;
    }
    
    setIsProcessing(true);
    setShowIndividualModal(false);
    
    try {
      switch (pendingIndividualAction) {
        case 'approve':
          await handleApprove(selectedItemForAction);
          break;
        case 'reject':
          await handleReject(selectedItemForAction, rejectComment || '');
          break;
        default:
          throw new Error('Invalid individual action');
      }
      
      setSelectedItemForAction(null);
      setPendingIndividualAction(null);
    } catch (error) {
      console.error('Error in handleIndividualActionConfirm:', error);
      showSuccessModal('An error occurred: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedItemForAction, pendingIndividualAction, handleApprove, handleReject, showSuccessModal]);

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
      // Handle error silently in production
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
      const res = await makeAuthenticatedRequest(`${API_BASE_URL}/api/approvals/${selectedItemForAction.id}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Deletion failed');
      }

      showSuccessModal('Submission deleted successfully');
      fetchApprovals();
      setShowIndividualDeleteModal(false);
      setSelectedItemForAction(null);
    } catch (error) {
      showSuccessModal('Failed to delete submission: ' + error.message, 'error');
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
      setSelectedItems(new Set(currentApprovals.map(item => item.uniqueKey || item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [currentApprovals]);

  // Analyze selected items by status
  const getSelectedItemsStatus = useCallback(() => {
    const selectedItemsArray = Array.from(selectedItems).map(key => {
      // Find the item in all approvals (not just current page)
      return approvals.find(approval => (approval.uniqueKey || approval.id) === key);
    }).filter(Boolean); // Remove undefined items

    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: selectedItemsArray.length
    };

    selectedItemsArray.forEach(item => {
      if (item.status === 'pending' || item.status === 'pending_superadmin_approval') {
        statusCounts.pending++;
      } else if (item.status === 'approved') {
        statusCounts.approved++;
      } else if (item.status === 'rejected') {
        statusCounts.rejected++;
      }
    });

    return {
      ...statusCounts,
      hasPending: statusCounts.pending > 0,
      hasApproved: statusCounts.approved > 0,
      hasRejected: statusCounts.rejected > 0,
      hasMixed: statusCounts.pending > 0 && (statusCounts.approved > 0 || statusCounts.rejected > 0),
      canApprove: statusCounts.pending > 0,
      canReject: statusCounts.pending > 0,
      allApproved: statusCounts.pending === 0 && statusCounts.approved > 0 && statusCounts.rejected === 0,
      allRejected: statusCounts.pending === 0 && statusCounts.rejected > 0 && statusCounts.approved === 0
    };
  }, [selectedItems, approvals]);

  const selectedStatusInfo = getSelectedItemsStatus();

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
      // Get current status info
      const statusInfo = getSelectedItemsStatus();
      
      // Filter to only pending items for approve/reject actions
      const selectedIds = Array.from(selectedItems);
      
      if (pendingBulkAction === 'approve' || pendingBulkAction === 'reject') {
        // Only process pending items
        const actionableIds = selectedIds.filter(key => {
          const item = approvals.find(approval => (approval.uniqueKey || approval.id) === key);
          return item && (item.status === 'pending' || item.status === 'pending_superadmin_approval');
        });
        
        // If there are non-pending items selected, show feedback
        if (actionableIds.length < selectedIds.length) {
          const skipped = selectedIds.length - actionableIds.length;
          showSuccessModal(
            `${pendingBulkAction === 'approve' ? 'Approved' : 'Rejected'} ${actionableIds.length} pending item(s). ${skipped} item(s) were skipped (already ${statusInfo.allApproved ? 'approved' : statusInfo.allRejected ? 'rejected' : 'processed'}).`,
            'success'
          );
        }
        
        if (actionableIds.length === 0) {
          showSuccessModal('No pending items to process. Please select pending items.', 'error');
          setIsBulkActionLoading(false);
          setPendingBulkAction(null);
          return;
        }
        
        switch (pendingBulkAction) {
          case 'approve':
            await handleBulkApprove(actionableIds);
            break;
          case 'reject':
            await handleBulkReject(actionableIds, rejectComment || 'Bulk rejection');
            break;
          default:
            throw new Error('Invalid bulk action');
        }
        
        setSelectedItems(new Set());
      }
    } catch (error) {
      // Error handling is already done in the individual handlers
    } finally {
      setIsBulkActionLoading(false);
      setPendingBulkAction(null);
    }
  }, [pendingBulkAction, selectedItems, getSelectedItemsStatus, approvals, handleBulkApprove, handleBulkReject, showSuccessModal]);

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
      <div className={styles.mainArea}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Approvals</h1>
        </div>
        <SkeletonLoader type="approvals" count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Approvals</h1>
        </div>
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
        type={successModal.type}
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
        availableSections={availableSections}
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
        <>
          <div className={styles.bulkActionsBar}>
            <div className={styles.bulkActionsLeft}>
              <span className={styles.selectedCount}>
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                {selectedStatusInfo.total > 0 && (
                  <>
                    {selectedStatusInfo.pending > 0 && ` • ${selectedStatusInfo.pending} pending`}
                    {selectedStatusInfo.approved > 0 && ` • ${selectedStatusInfo.approved} approved`}
                    {selectedStatusInfo.rejected > 0 && ` • ${selectedStatusInfo.rejected} rejected`}
                  </>
                )}
              </span>
            </div>
            <div className={styles.bulkActionsRight}>
              <button 
                onClick={handleBulkApproveSelected}
                disabled={isBulkActionLoading || !selectedStatusInfo.canApprove}
                className={`${styles.bulkActionBtn} ${styles.bulkApproveBtn} ${isBulkActionLoading ? styles.loading : ''} ${!selectedStatusInfo.canApprove ? styles.disabled : ''}`}
                title={!selectedStatusInfo.canApprove ? 'No pending items selected' : selectedStatusInfo.hasMixed ? `Approve ${selectedStatusInfo.pending} pending item${selectedStatusInfo.pending !== 1 ? 's' : ''}` : 'Approve all selected items'}
              >
                <FiCheck />
                {isBulkActionLoading ? 'Processing...' : (
                  selectedStatusInfo.hasMixed 
                    ? `Approve ${selectedStatusInfo.pending} Pending`
                    : selectedStatusInfo.pending === selectedItems.size 
                      ? 'Approve All'
                      : `Approve ${selectedStatusInfo.pending} Pending`
                )}
              </button>
              <button 
                onClick={handleBulkRejectSelected}
                disabled={isBulkActionLoading || !selectedStatusInfo.canReject}
                className={`${styles.bulkActionBtn} ${styles.bulkRejectBtn} ${isBulkActionLoading ? styles.loading : ''} ${!selectedStatusInfo.canReject ? styles.disabled : ''}`}
                title={!selectedStatusInfo.canReject ? 'No pending items selected' : selectedStatusInfo.hasMixed ? `Reject ${selectedStatusInfo.pending} pending item${selectedStatusInfo.pending !== 1 ? 's' : ''}` : 'Reject all selected items'}
              >
                <FiX />
                {isBulkActionLoading ? 'Processing...' : (
                  selectedStatusInfo.hasMixed 
                    ? `Reject ${selectedStatusInfo.pending} Pending`
                    : selectedStatusInfo.pending === selectedItems.size 
                      ? 'Reject All'
                      : `Reject ${selectedStatusInfo.pending} Pending`
                )}
              </button>
              <button 
                onClick={handleBulkDeleteSelected}
                disabled={isBulkActionLoading}
                className={`${styles.bulkActionBtn} ${styles.bulkDeleteBtn} ${isBulkActionLoading ? styles.loading : ''}`}
                title="Delete selected items"
              >
                <FiTrash2 />
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
          {/* Mixed Status Caution Banner */}
          {selectedStatusInfo.hasMixed && (
            <div className={styles.mixedStatusCaution}>
              <FiInfo className={styles.cautionIcon} />
              <span className={styles.cautionText}>
                Only {selectedStatusInfo.pending} pending item{selectedStatusInfo.pending !== 1 ? 's' : ''} will be affected by approve/reject actions.
                {selectedStatusInfo.approved > 0 && ` ${selectedStatusInfo.approved} approved`}{selectedStatusInfo.approved > 0 && selectedStatusInfo.rejected > 0 ? ' and' : ''}{selectedStatusInfo.rejected > 0 && ` ${selectedStatusInfo.rejected} rejected`} item{selectedStatusInfo.approved + selectedStatusInfo.rejected !== 1 ? 's' : ''} will be skipped.
              </span>
            </div>
          )}
        </>
      )}

      {/* Table Section */}
      <div className={styles.tableSection}>
        <ApprovalsTable
          approvals={currentApprovals}
          onApprove={handleApproveClick}
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
          startIndex={startIndex}
        />

        {/* Pagination - Only show if there are items */}
        {filteredApprovals.length > 0 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              <span>{filteredApprovals.length} total entries • Showing {currentApprovals.length} entries on this page</span>
              <span className={styles.pageIndicator}>Page {currentPage} of {totalPages}</span>
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
        actionableCount={selectedStatusInfo.canApprove || selectedStatusInfo.canReject ? selectedStatusInfo.pending : selectedItems.size}
        hasMixedStatus={selectedStatusInfo.hasMixed}
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
        actionableCount={selectedItemForAction && (selectedItemForAction.status === 'pending' || selectedItemForAction.status === 'pending_superadmin_approval') ? 1 : 0}
        hasMixedStatus={false}
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
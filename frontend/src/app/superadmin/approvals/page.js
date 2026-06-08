'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FiCheck, FiX, FiTrash2, FiInfo } from 'react-icons/fi';
import { IoCloseOutline } from 'react-icons/io5';
import { RiArrowLeftSLine, RiArrowRightSLine, RiArrowLeftDoubleFill, RiArrowRightDoubleFill } from "react-icons/ri";
import { ConfirmationModal, ApprovalConfirmationModal } from '@/components';
import { SuccessModal } from '@/components';
import ApprovalsTable from './components/ApprovalsTable';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import { SkeletonLoader } from '../components';
import { API_BASE_URL, logError } from '@/config/api';
import { useDispatch } from 'react-redux';
import { mutate } from 'swr';
import { superadminHighlightsApi } from '@/rtk/superadmin/highlightsApi';
import { dashboardApi } from '@/rtk/superadmin/dashboardApi';
import { makeSuperadminRequest } from '@/utils/superadmin/apiClient';
import styles from './approvals.module.css';
import { usePortalDemoMode } from '@/hooks/shared/usePortalDemoMode';
import { DEMO_READONLY_MESSAGE } from '@/config/portalDemo';

// Helper function to normalize organization acronym for comparison (case-insensitive, trim spaces)
const normalizeOrgAcronym = (acronym) => {
  if (!acronym) return '';
  return String(acronym).trim().toLowerCase();
};

// Helper function to check if approval matches selected organization (including collaborators)
const matchesOrganization = (approval, orgAcronym) => {
  if (!orgAcronym || orgAcronym === 'all') return true;
  
  const normalizedOrgAcronym = normalizeOrgAcronym(orgAcronym);
  
  // Regular organization filtering - treat all organizations the same, including "Collab Admin"
  // Check main organization (case-insensitive)
  // The approval data from backend has 'org' field (from o.org in SQL query)
  const mainOrgAcronym = normalizeOrgAcronym(
    approval.org || 
    approval.organization_acronym || 
    approval.organization?.acronym ||
    ''
  );
  
  // Only return true if main org matches
  if (mainOrgAcronym && mainOrgAcronym === normalizedOrgAcronym) {
    return true;
  }
  
  // Main org doesn't match - exclude this approval
  return false;
};

export default function PendingApprovalsPage() {
  const { isReadOnly } = usePortalDemoMode();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
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
      const submissionsRes = await makeSuperadminRequest(`${API_BASE_URL}/api/approvals`, {}, router);
      
      if (!submissionsRes) return; // Helper function handled redirect
      
      const submissionsResult = await submissionsRes.json();

      if (!submissionsRes.ok || !submissionsResult.success) {
        // Get error type and message from response
        const errorMessage = submissionsResult.message || submissionsResult.error || 'Failed to fetch submissions';
        const errorType = submissionsResult.errorType || 'UNKNOWN_ERROR';
        
        // Create error with type information
        const error = new Error(errorMessage);
        error.errorType = errorType;
        throw error;
      }

      // Format submissions
      const allApprovals = submissionsResult.data.map((item) => ({
        ...item,
        // Keep submitted_at as string for proper date formatting
        // Only convert to Date for sorting if valid
        uniqueKey: `submission-${item.id}` // Create unique key
      }));
      
      // Sort by date (newest first)
      allApprovals.sort((a, b) => {
        const dateA = a.submitted_at ? new Date(a.submitted_at) : new Date(0);
        const dateB = b.submitted_at ? new Date(b.submitted_at) : new Date(0);
        // If either date is invalid, put it at the end
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateB.getTime() - dateA.getTime();
      });

      setApprovals(allApprovals);
      setError(null);
    } catch (err) {
      logError(err, { context: 'fetchApprovals', errorType: err.errorType });
      
      // Format error message based on error type
      let errorMessage = err.message || 'Failed to load approvals';
      const errorType = err.errorType || 'UNKNOWN_ERROR';
      
      // Provide user-friendly messages based on error type
      if (errorType === 'DATABASE_SORT_MEMORY_ERROR') {
        errorMessage = 'Too many submissions to process at once. Please try again in a moment or use filters to narrow down results.';
      } else if (errorType === 'DATABASE_CONNECTION_ERROR') {
        errorMessage = 'Database connection failed. Please try again later.';
      } else if (errorType === 'DATABASE_QUERY_ERROR') {
        errorMessage = 'Database query error. Please contact support if this persists.';
      } else if (errorType === 'DATABASE_LOCK_ERROR') {
        errorMessage = 'Database is temporarily busy. Please try again in a moment.';
      } else if (errorType === 'JSON_PARSING_ERROR') {
        errorMessage = 'Invalid data format detected. Some submissions may have invalid data. Please contact support.';
      } else if (errorType === 'DATABASE_ERROR') {
        errorMessage = `Database error: ${err.message}`;
      }
      
      setError(errorMessage);
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const fetchOrganizations = useCallback(async () => {
    try {
      setOrgsLoading(true);
      
      const res = await makeSuperadminRequest(`${API_BASE_URL}/api/organizations`, {}, router);
      if (!res) return; // Helper function handled redirect
      
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch organizations');
      }

      // Filter to only include active organizations with valid data
      // Backend already filters by status='ACTIVE', but add extra validation here
      const validOrganizations = (result.data || [])
        .filter(org => {
          // Ensure organization has required fields
          return org && 
                 org.id && 
                 org.acronym && 
                 org.acronym.trim() !== '' && 
                 org.name && 
                 org.name.trim() !== '';
        });

      setOrganizations(validOrganizations);
    } catch (err) {
      logError(err, { context: 'fetchOrganizations' });
      // Organizations filter is optional, so we don't show error to user
    } finally {
      setOrgsLoading(false);
    }
  }, [router]);

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

  // Handle URL parameters for all filters (only on mount or when URL actually changes)
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
    // Only update if URL param exists and is different from current state
    if (urlParams.organization !== null) {
      const orgValue = urlParams.organization || 'all';
      setSelectedOrganization(prev => prev !== orgValue ? orgValue : prev);
    }
    if (urlParams.section !== null) {
      const sectionValue = urlParams.section || 'all';
      setSelectedSection(prev => prev !== sectionValue ? sectionValue : prev);
    }
    if (urlParams.status !== null) {
      const statusValue = urlParams.status || 'all';
      setSelectedStatus(prev => prev !== statusValue ? statusValue : prev);
    }
    if (urlParams.search !== null) {
      const searchValue = urlParams.search || '';
      setSearchTerm(prev => prev !== searchValue ? searchValue : prev);
    }
    if (urlParams.sort !== null) {
      const sortValue = urlParams.sort || 'latest';
      setSortBy(prev => prev !== sortValue ? sortValue : prev);
    }
    if (urlParams.show !== null) {
      const showValue = urlParams.show ? parseInt(urlParams.show) : 10;
      setShowEntries(prev => prev !== showValue ? showValue : prev);
    }
    if (urlParams.page !== null) {
      const pageValue = urlParams.page ? parseInt(urlParams.page) : 1;
      setCurrentPage(prev => prev !== pageValue ? pageValue : prev);
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
      
      // IMPORTANT: Don't close if clicking on the action dropdown button itself
      // This must be checked first to prevent interference with toggle behavior
      if (e.target.closest('[data-action-dropdown-button]') ||
          e.target.hasAttribute('data-action-dropdown-button')) {
        return; // Let the button's onClick handler handle the toggle
      }
      
      // Don't close if clicking on SearchAndFilterControls dropdowns
      if (e.target.closest('[data-search-filter-controls]')) {
        return;
      }
      
      // Don't close if clicking on the action dropdown wrapper or options
      if (e.target.closest('[data-action-dropdown-wrapper]') ||
          e.target.closest('[data-action-dropdown-options]')) {
        return;
      }
      
      // Don't close if clicking on other dropdown options or inside dropdown containers
      if (e.target.closest(`.${styles.options}`)) {
        return;
      }
      
      if (!e.target.closest(`.${styles.dropdownWrapper}`)) {
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
              !e.target.closest('[data-action-dropdown-wrapper]') &&
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

    // Use 'click' instead of 'mousedown' so it runs after button's onClick handler
    // This ensures the toggle logic completes before checking if we should close
    // Use bubble phase (false) so it runs after the button's onClick
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
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
    if (selectedOrganization && selectedOrganization !== 'all') {
      filtered = filtered.filter(approval => {
        const matches = matchesOrganization(approval, selectedOrganization);
        return matches;
      });
    }

    // Filter by section (case-insensitive matching)
    if (selectedSection && selectedSection !== 'all') {
      filtered = filtered.filter(approval => 
        approval.section && approval.section.toLowerCase() === selectedSection.toLowerCase()
      );
    }

    // Filter by status
    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(approval => 
        approval.status === selectedStatus
      );
    }

    // Search filter with relevance scoring (only when searching)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const searchTermExact = searchTerm.toLowerCase().trim();
      
      // Calculate relevance score for each approval
      const approvalsWithScores = filtered.map(approval => {
        let score = 0;
        let hasMatch = false;
        
        // Helper function to check if string matches and calculate score
        const checkMatch = (value, priorityScore, exactBonus = 0) => {
          if (!value || typeof value !== 'string') return false;
          const valueLower = value.toLowerCase();
          if (valueLower.includes(searchLower)) {
            hasMatch = true;
            score += priorityScore;
            // Bonus for exact match or starts with
            if (valueLower === searchTermExact) {
              score += exactBonus * 2;
            } else if (valueLower.startsWith(searchTermExact)) {
              score += exactBonus;
            }
            return true;
          }
          return false;
        };
        
        // PRIORITY 1: Organization name and acronym (highest priority - 100 points)
        if (checkMatch(approval.organization_name, 100, 20)) {}
        if (checkMatch(approval.orgName, 100, 20)) {}
        if (checkMatch(approval.organization_acronym, 100, 20)) {}
        if (checkMatch(approval.org, 100, 20)) {}
        
        // PRIORITY 2: Program title from proposed_data (high priority - 80 points)
        if (approval.proposed_data) {
          try {
            const proposedData = typeof approval.proposed_data === 'string' 
              ? JSON.parse(approval.proposed_data) 
              : approval.proposed_data;
            
            if (proposedData && typeof proposedData === 'object') {
              // Program title (highest priority for program submissions)
              if (checkMatch(proposedData.title, 80, 15)) {}
              
              // Other fields in proposed_data (lower priority)
              if (checkMatch(proposedData.description, 20, 5)) {}
              if (checkMatch(proposedData.category, 20, 5)) {}
              
              // Search other string fields in proposed_data
              for (const key in proposedData) {
                if (proposedData.hasOwnProperty(key) && key !== 'title' && key !== 'description' && key !== 'category') {
                  const value = proposedData[key];
                  if (typeof value === 'string' && value.toLowerCase().includes(searchLower)) {
                    hasMatch = true;
                    score += 10; // Lower priority for other fields
                  }
                }
              }
            }
          } catch (error) {
            // Silently ignore JSON parse errors
          }
        }
        
        // PRIORITY 3: Direct title field (if exists)
        if (checkMatch(approval.title, 60, 10)) {}
        
        // PRIORITY 4: Section (lower priority)
        if (checkMatch(approval.section, 15, 3)) {}
        
        // PRIORITY 5: ID fields (lowest priority)
        if (approval.id?.toString().includes(searchTerm)) {
          hasMatch = true;
          score += 5;
        }
        if (approval.submission_id?.toString().includes(searchTerm)) {
          hasMatch = true;
          score += 5;
        }
        
        return { approval, score, hasMatch };
      });
      
      // Filter out non-matching items and sort by score (highest first), then by date as tie-breaker
      const filteredWithScores = approvalsWithScores
        .filter(item => item.hasMatch);
      
      // Sort by score first, then by date as secondary sort
      filteredWithScores.sort((a, b) => {
        // Primary sort: by relevance score (descending)
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Secondary sort: by date (when scores are equal)
        const dateA = a.approval.submitted_at ? new Date(a.approval.submitted_at) : new Date(0);
        const dateB = b.approval.submitted_at ? new Date(b.approval.submitted_at) : new Date(0);
        // If either date is invalid, put it at the end
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        if (sortBy === 'latest') {
          return dateB.getTime() - dateA.getTime();
        } else if (sortBy === 'oldest') {
          return dateA.getTime() - dateB.getTime();
        }
        return 0;
      });
      
      // Extract just the approval objects
      filtered = filteredWithScores.map(item => item.approval);
    } else {
      // When not searching, sort only by date
      filtered.sort((a, b) => {
        const dateA = a.submitted_at ? new Date(a.submitted_at) : new Date(0);
        const dateB = b.submitted_at ? new Date(b.submitted_at) : new Date(0);
        // If either date is invalid, put it at the end
        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        if (sortBy === 'latest') {
          return dateB.getTime() - dateA.getTime();
        } else if (sortBy === 'oldest') {
          return dateA.getTime() - dateB.getTime();
        }
        return 0;
      });
    }

    setFilteredApprovals(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [approvals, selectedOrganization, selectedSection, selectedStatus, searchTerm, sortBy]);

  const handleApprove = useCallback(async (item) => {
    if (isReadOnly) {
      showSuccessModal(DEMO_READONLY_MESSAGE, 'error');
      return;
    }
    try {
      const url = `${API_BASE_URL}/api/approvals/${item.id}/approve`;

      const res = await makeSuperadminRequest(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }, router);

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        // Show detailed error message from backend
        const errorMessage = result.error || result.message || 'Approval failed';
        throw new Error(errorMessage);
      }

      // Invalidate cache to update sidebar counts immediately
      try {
        // CRITICAL: Invalidate Dashboard tag to update pending approvals count in sidebar
        dispatch(dashboardApi.util.invalidateTags(['Dashboard']));
        
        // CRITICAL: Invalidate SWR cache for submissions to update admin sidebar count
        // Invalidate all submission caches (for all organizations)
        mutate(
          (key) => typeof key === 'string' && key.includes('/api/submissions/'),
          undefined,
          { revalidate: true }
        );
        
        // Invalidate and refetch highlights cache if this was a highlight approval
        // This ensures the Highlights management page shows updated status
        if (item.section === 'highlights') {
          // Invalidate all highlight queries to force refetch
          // This will trigger automatic refetch for any active queries
          dispatch(superadminHighlightsApi.util.invalidateTags(['SuperadminHighlight']));
          
          // Also manually refetch queries with different status filters
          // This ensures all variants of the query are updated immediately
          // Use unsubscribe to clean up after refetch
          const refetchPromises = [
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate(null, { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('approved', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('pending', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('rejected', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getHighlightsStatistics.initiate(undefined, { forceRefetch: true })),
          ];
          
          // Wait for all refetches to complete, then unsubscribe
          Promise.all(refetchPromises).then(results => {
            // Unsubscribe after a short delay to allow components to use the data
            setTimeout(() => {
              results.forEach(result => {
                if (result && result.unsubscribe) {
                  result.unsubscribe();
                }
              });
            }, 1000);
          }).catch(err => {
            logError(err, { context: 'handleApprove-refetchHighlights', itemId: item.id });
          });
          
          // Dispatch custom event to notify Highlights page to refetch
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('highlightStatusChanged'));
          }
        }
      } catch (cacheError) {
        // Don't fail the approval if cache invalidation fails
        logError(cacheError, { context: 'handleApprove-cacheInvalidation', itemId: item.id });
      }

      showSuccessModal('Changes have been approved and applied.');
      fetchApprovals(); // Refresh the list
    } catch (err) {
      logError(err, { context: 'handleApprove', itemId: item.id });
      showSuccessModal('Failed to approve changes: ' + err.message, 'error');
    }
  }, [isReadOnly, showSuccessModal, fetchApprovals, router, dispatch]);

  const handleReject = useCallback(async (item, rejectComment = '') => {
    if (isReadOnly) {
      showSuccessModal(DEMO_READONLY_MESSAGE, 'error');
      return;
    }
    try {
      const url = `${API_BASE_URL}/api/approvals/${item.id}/reject`;

      const res = await makeSuperadminRequest(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_comment: rejectComment })
      }, router);

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Rejection failed');
      }

      // CRITICAL: Invalidate cache to update sidebar counts immediately
      try {
        // CRITICAL: Invalidate Dashboard tag to update pending approvals count in sidebar
        dispatch(dashboardApi.util.invalidateTags(['Dashboard']));
        
        // CRITICAL: Invalidate SWR cache for submissions to update admin sidebar count
        // Invalidate all submission caches (for all organizations)
        mutate(
          (key) => typeof key === 'string' && key.includes('/api/submissions/'),
          undefined,
          { revalidate: true }
        );
      } catch (cacheError) {
        // Don't fail the rejection if cache invalidation fails
        logError(cacheError, { context: 'handleReject-cacheInvalidation', itemId: item.id });
      }

      showSuccessModal('Item has been rejected.');
      fetchApprovals();
    } catch (err) {
      logError(err, { context: 'handleReject', itemId: item.id });
      showSuccessModal('Failed to reject item: ' + err.message, 'error');
    }
  }, [isReadOnly, showSuccessModal, fetchApprovals, router, dispatch]);

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

      const res = await makeSuperadminRequest(`${API_BASE_URL}/api/approvals/bulk/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: originalIds })
      }, router);

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk approval failed');
      }

      // Invalidate cache to update sidebar counts immediately
      try {
        // CRITICAL: Invalidate Dashboard tag to update pending approvals count in sidebar
        dispatch(dashboardApi.util.invalidateTags(['Dashboard']));
        
        // CRITICAL: Invalidate SWR cache for submissions to update admin sidebar count
        // Invalidate all submission caches (for all organizations)
        mutate(
          (key) => typeof key === 'string' && key.includes('/api/submissions/'),
          undefined,
          { revalidate: true }
        );
        
        // Invalidate and refetch highlights cache if any highlights were approved
        // Check if any of the approved items were highlights
        const approvedItems = approvals.filter(approval => 
          originalIds.includes(approval.id.toString()) && approval.section === 'highlights'
        );
        
        if (approvedItems.length > 0) {
          // Invalidate all highlight queries to force refetch
          dispatch(superadminHighlightsApi.util.invalidateTags(['SuperadminHighlight']));
          
          // Also manually refetch queries with different status filters
          // This ensures all variants of the query are updated immediately
          // Use unsubscribe to clean up after refetch
          const refetchPromises = [
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate(null, { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('approved', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('pending', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('rejected', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getHighlightsStatistics.initiate(undefined, { forceRefetch: true })),
          ];
          
          // Wait for all refetches to complete, then unsubscribe
          Promise.all(refetchPromises).then(results => {
            // Unsubscribe after a short delay to allow components to use the data
            setTimeout(() => {
              results.forEach(result => {
                if (result && result.unsubscribe) {
                  result.unsubscribe();
                }
              });
            }, 1000);
          }).catch(err => {
            logError(err, { context: 'handleBulkApprove-refetchHighlights', ids: originalIds });
          });
          
          // Dispatch custom event to notify Highlights page to refetch
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('highlightStatusChanged'));
          }
        }
      } catch (cacheError) {
        // Don't fail the approval if cache invalidation fails
        logError(cacheError, { context: 'handleBulkApprove-cacheInvalidation', ids: originalIds });
      }

      showSuccessModal(`Bulk approval completed: ${result.details.successCount} approved`);
      fetchApprovals();
    } catch (err) {
      logError(err, { context: 'handleBulkApprove', ids: uniqueKeys });
      showSuccessModal('Failed to bulk approve approvals: ' + err.message, 'error');
    }
  }, [showSuccessModal, fetchApprovals, router, dispatch, approvals]);

  const handleBulkReject = useCallback(async (uniqueKeys, rejectComment = '') => {
    try {
      // Extract original IDs from unique keys
      const originalIds = uniqueKeys.map(key => {
        if (key.startsWith('submission-')) {
          return key.replace('submission-', '');
        }
        return key; // fallback for items without unique keys
      });

      const res = await makeSuperadminRequest(`${API_BASE_URL}/api/approvals/bulk/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: originalIds, rejection_comment: rejectComment })
      }, router);

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk rejection failed');
      }

      showSuccessModal(`Bulk rejection completed: ${result.details.successCount} rejected`);
      fetchApprovals();
    } catch (err) {
      logError(err, { context: 'handleBulkReject', ids: uniqueKeys });
      showSuccessModal('Failed to bulk reject approvals: ' + err.message, 'error');
    }
  }, [showSuccessModal, fetchApprovals, router]);

  const handleBulkDelete = useCallback(async (uniqueKeys) => {
    try {
      // Extract original IDs from unique keys
      const originalIds = uniqueKeys.map(key => {
        if (key.startsWith('submission-')) {
          return key.replace('submission-', '');
        }
        return key; // fallback for items without unique keys
      });

      const res = await makeSuperadminRequest(`${API_BASE_URL}/api/approvals/bulk/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: originalIds })
      }, router);

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk deletion failed');
      }

      // Invalidate cache to update sidebar counts immediately
      try {
        // CRITICAL: Invalidate Dashboard tag to update pending approvals count in sidebar
        dispatch(dashboardApi.util.invalidateTags(['Dashboard']));
        
        // CRITICAL: Invalidate SWR cache for submissions to update admin sidebar count
        // Invalidate all submission caches (for all organizations)
        mutate(
          (key) => typeof key === 'string' && key.includes('/api/submissions/'),
          undefined,
          { revalidate: true }
        );
        
        // Invalidate and refetch highlights cache if any highlights were deleted
        // Check if any of the deleted items were highlights
        const deletedItems = approvals.filter(approval => 
          originalIds.includes(approval.id.toString()) && approval.section === 'highlights'
        );
        
        if (deletedItems.length > 0 || (result.details && result.details.deletedHighlightIds && result.details.deletedHighlightIds.length > 0)) {
          // Invalidate all highlight queries to force refetch
          dispatch(superadminHighlightsApi.util.invalidateTags(['SuperadminHighlight']));
          
          // Also manually refetch queries with different status filters
          const refetchPromises = [
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate(null, { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('approved', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('pending', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('rejected', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getHighlightsStatistics.initiate(undefined, { forceRefetch: true })),
          ];
          
          // Wait for all refetches to complete, then unsubscribe
          Promise.all(refetchPromises).then(results => {
            setTimeout(() => {
              results.forEach(result => {
                if (result && result.unsubscribe) {
                  result.unsubscribe();
                }
              });
            }, 1000);
          }).catch(err => {
            logError(err, { context: 'handleBulkDelete-refetchHighlights', ids: originalIds });
          });
          
          // Dispatch custom event to notify Highlights page to refetch
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('highlightStatusChanged'));
          }
        }
      } catch (cacheError) {
        // Don't fail the deletion if cache invalidation fails
        logError(cacheError, { context: 'handleBulkDelete-cacheInvalidation', ids: originalIds });
      }

      showSuccessModal(`Bulk deletion completed: ${result.details.successCount} deleted`);
      fetchApprovals();
    } catch (err) {
      logError(err, { context: 'handleBulkDelete', ids: uniqueKeys });
      showSuccessModal('Failed to bulk delete approvals: ' + err.message, 'error');
    }
  }, [showSuccessModal, fetchApprovals, router, dispatch, approvals]);

  // Individual action handlers
  const handleApproveClick = useCallback((approval) => {
    // Ensure we have valid approval data
    if (!approval || !approval.id) {
      logError(new Error('Invalid approval data'), { context: 'handleApproveClick', approval });
      return;
    }
    
    setSelectedItemForAction(approval);
    setPendingIndividualAction('approve');
    setIsProcessing(false); // Ensure processing state is reset when opening modal
    
    // Use requestAnimationFrame to ensure state is set before opening modal
    requestAnimationFrame(() => {
      setShowIndividualModal(true);
    });
  }, []);

  const handleRejectClick = useCallback((approval) => {
    // Ensure we have valid approval data
    if (!approval || !approval.id) {
      logError(new Error('Invalid approval data'), { context: 'handleRejectClick', approval });
      return;
    }
    
    setSelectedItemForAction(approval);
    setPendingIndividualAction('reject');
    setIsProcessing(false); // Ensure processing state is reset when opening modal
    
    // Use requestAnimationFrame to ensure state is set before opening modal
    requestAnimationFrame(() => {
      setShowIndividualModal(true);
    });
  }, []);

  const handleIndividualActionConfirm = useCallback(async (rejectComment) => {
    if (!selectedItemForAction || !pendingIndividualAction) {
      return;
    }
    
    setIsProcessing(true);
    // Keep modal open during processing to show loading state
    
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
      showSuccessModal('An error occurred: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsProcessing(false);
      setShowIndividualModal(false); // Close modal after processing is complete
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
      logError(error, { context: 'handleBulkDeleteConfirm' });
      // Error is already handled in handleBulkDelete
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
      const res = await makeSuperadminRequest(`${API_BASE_URL}/api/approvals/${selectedItemForAction.id}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }, router);

      if (!res) return; // Helper function handled redirect

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Deletion failed');
      }

      // Invalidate cache to update sidebar counts immediately
      try {
        // CRITICAL: Invalidate Dashboard tag to update pending approvals count in sidebar
        dispatch(dashboardApi.util.invalidateTags(['Dashboard']));
        
        // CRITICAL: Invalidate SWR cache for submissions to update admin sidebar count
        // Invalidate all submission caches (for all organizations)
        mutate(
          (key) => typeof key === 'string' && key.includes('/api/submissions/'),
          undefined,
          { revalidate: true }
        );
        
        // Invalidate and refetch highlights cache if this was a highlight deletion
        // This ensures the Highlights management page shows updated data
        if (selectedItemForAction.section === 'highlights') {
          // Invalidate all highlight queries to force refetch
          dispatch(superadminHighlightsApi.util.invalidateTags(['SuperadminHighlight']));
          
          // Also manually refetch queries with different status filters
          const refetchPromises = [
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate(null, { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('approved', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('pending', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getAllHighlights.initiate('rejected', { forceRefetch: true })),
            dispatch(superadminHighlightsApi.endpoints.getHighlightsStatistics.initiate(undefined, { forceRefetch: true })),
          ];
          
          // Wait for all refetches to complete, then unsubscribe
          Promise.all(refetchPromises).then(results => {
            setTimeout(() => {
              results.forEach(result => {
                if (result && result.unsubscribe) {
                  result.unsubscribe();
                }
              });
            }, 1000);
          }).catch(err => {
            logError(err, { context: 'handleIndividualDeleteConfirm-refetchHighlights', itemId: selectedItemForAction.id });
          });
          
          // Dispatch custom event to notify Highlights page to refetch
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('highlightStatusChanged'));
          }
        }
      } catch (cacheError) {
        // Don't fail the deletion if cache invalidation fails
        logError(cacheError, { context: 'handleIndividualDeleteConfirm-cacheInvalidation', itemId: selectedItemForAction.id });
      }

      showSuccessModal('Submission deleted successfully');
      fetchApprovals();
      setShowIndividualDeleteModal(false);
      setSelectedItemForAction(null);
    } catch (error) {
      logError(error, { context: 'handleIndividualDeleteConfirm', itemId: selectedItemForAction?.id });
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
    // Keep modal open during processing to show loading state
    
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
          setShowBulkConfirmation(false);
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
      setShowBulkConfirmation(false); // Close modal after processing is complete
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
        <div className={styles.error}>
          <div className={styles.errorTitle}>Error: {error}</div>
          <div className={styles.errorHelp}>
            If this error persists, please try refreshing the page or contact support.
          </div>
        </div>
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
                disabled={isReadOnly || isBulkActionLoading || !selectedStatusInfo.canApprove}
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
                disabled={isReadOnly || isBulkActionLoading || !selectedStatusInfo.canReject}
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
                disabled={isReadOnly || isBulkActionLoading}
                className={`${styles.bulkActionBtn} ${styles.bulkDeleteBtn} ${isBulkActionLoading ? styles.loading : ''}`}
                title={isReadOnly ? DEMO_READONLY_MESSAGE : 'Delete selected items'}
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
          sortBy={sortBy}
          totalCount={filteredApprovals.length}
          readOnly={isReadOnly}
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
      <ApprovalConfirmationModal
        isOpen={showBulkConfirmation}
        actionType={pendingBulkAction}
        selectedCount={selectedItems.size}
        actionableCount={selectedStatusInfo.canApprove || selectedStatusInfo.canReject ? selectedStatusInfo.pending : selectedItems.size}
        hasMixedStatus={selectedStatusInfo.hasMixed}
        showComment={pendingBulkAction === 'reject'}
        onConfirm={handleBulkConfirmationConfirm}
        onClose={handleBulkConfirmationCancel}
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
      <ApprovalConfirmationModal
        isOpen={showIndividualModal}
        actionType={pendingIndividualAction}
        selectedCount={1}
        itemName={selectedItemForAction?.org || selectedItemForAction?.organization_acronym || selectedItemForAction?.orgName || selectedItemForAction?.organization_name || 'this submission'}
        actionableCount={selectedItemForAction && (selectedItemForAction.status === 'pending' || selectedItemForAction.status === 'pending_superadmin_approval') ? 1 : 0}
        hasMixedStatus={false}
        showComment={pendingIndividualAction === 'reject'}
        onConfirm={handleIndividualActionConfirm}
        onClose={handleIndividualActionCancel}
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
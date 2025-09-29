'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import { SearchAndFilterControls, VolunteerTable } from './components'
import { SuccessModal, ConfirmationModal } from '@/components'
import { useAdminVolunteers, useAdminPrograms } from '../hooks/useAdminData'
import { selectCurrentAdmin, selectIsAuthenticated } from '@/rtk/superadmin/adminSlice'
import { SkeletonLoader } from '../components'
import styles from './volunteers.module.css'

// Essential security utilities
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').substring(0, 100); // Basic XSS protection + length limit
};

const validateStatus = (status) => {
  const validStatuses = ['Pending', 'Approved', 'Declined', 'Cancelled', 'Completed'];
  return validStatuses.includes(status);
};

// Simple rate limiter for API calls
class RateLimiter {
  constructor(maxCalls = 10, windowMs = 60000) { // 10 calls per minute
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.calls = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const userCalls = this.calls.get(key) || [];
    const recentCalls = userCalls.filter(timestamp => now - timestamp < this.windowMs);
    
    if (recentCalls.length >= this.maxCalls) {
      return false;
    }
    
    recentCalls.push(now);
    this.calls.set(key, recentCalls);
    return true;
  }

  reset(key) {
    this.calls.delete(key);
  }
}

// Enhanced error handler
const handleApiError = (error, context) => {
  if (error.status === 401) {
    return {
      type: 'authentication',
      message: 'Your session has expired. Please log in again.',
      action: 'redirect_to_login'
    };
  } else if (error.status === 403) {
    return {
      type: 'authorization',
      message: 'You do not have permission to perform this action.',
      action: 'show_error'
    };
  } else if (error.status === 429) {
    return {
      type: 'rate_limit',
      message: 'Too many requests. Please wait a moment and try again.',
      action: 'show_error'
    };
  } else if (error.status >= 500) {
    return {
      type: 'server_error',
      message: 'Server error. Please try again later.',
      action: 'show_error'
    };
  } else {
    return {
      type: 'unknown',
      message: 'An unexpected error occurred. Please try again.',
      action: 'show_error'
    };
  }
};

export default function VolunteersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get current admin data from Redux store
  const currentAdmin = useSelector(selectCurrentAdmin)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  // Rate limiter instance
  const rateLimiter = useRef(new RateLimiter(10, 60000)); // 10 calls per minute

  // Memoized skeleton components to prevent unnecessary re-renders
  const TableSkeleton = useMemo(() => <SkeletonLoader type="table" count={10} />, []);

  // Fetch volunteers from API using admin's organization with SWR
  const { 
    volunteers: volunteersData = [], 
    isLoading: volunteersLoading, 
    error: volunteersError,
    mutate: refreshVolunteers
  } = useAdminVolunteers(currentAdmin?.id)

  // Show skeleton immediately on first load, then show content when data is ready
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Show skeleton on first load or when loading with no data
  const shouldShowSkeleton = !hasInitiallyLoaded || (volunteersLoading && !volunteersData.length);
  
  // Mark as initially loaded when data is available
  useEffect(() => {
    if (!volunteersLoading && volunteersData.length >= 0) {
      setHasInitiallyLoaded(true);
    }
  }, [volunteersLoading, volunteersData.length]);

  // Fetch programs from API using admin's organization with SWR
  const { 
    programs: programsData = [], 
    isLoading: programsLoading,
    error: programsError 
  } = useAdminPrograms(currentAdmin?.org)

  // Extract unique programs from volunteers data as fallback
  const programsFromVolunteers = useMemo(() => {
    if (!volunteersData || volunteersData.length === 0) return []
    
    const uniquePrograms = [...new Set(volunteersData.map(volunteer => volunteer.program))]
      .filter(program => program && program.trim() !== '')
      .map((programName, index) => ({
        id: `volunteer-program-${index}`,
        title: programName,
        description: `Program: ${programName}`,
        category: 'Unknown',
        status: 'active'
      }))
    
    return uniquePrograms
  }, [volunteersData])

  // Use programs from API if available, otherwise use programs extracted from volunteers
  const availablePrograms = useMemo(() => {
    if (programsData && programsData.length > 0) {
      return programsData
    }
    // Fallback to programs extracted from volunteers data
    return programsFromVolunteers
  }, [programsData, programsFromVolunteers])
  
  // Toast notification function
  const showToast = useCallback((message, type = 'success') => {
    setSuccessMessage(message);
    setSuccessModalType(type);
    setShowSuccessModal(true);
  }, []);

  // Enhanced status update with rate limiting and validation
  const handleStatusUpdate = useCallback(async (id, newStatus) => {
    // Validate status
    if (!validateStatus(newStatus)) {
      showToast('Invalid status provided', 'error');
      return;
    }

    // Check rate limiting
    const rateLimitKey = `status_update_${currentAdmin?.id}`;
    if (!rateLimiter.current.isAllowed(rateLimitKey)) {
      showToast('Too many status updates. Please wait a moment and try again.', 'error');
      return;
    }

    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('No admin token found. Please log in again.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/volunteers/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorInfo = handleApiError({ status: response.status, message: errorData.message }, 'status_update');
        throw new Error(errorInfo.message);
      }
      
      // Reset rate limiter on success
      rateLimiter.current.reset(rateLimitKey);
      
      // Refresh data after successful update
      refreshVolunteers();
    } catch (error) {
      setSuccessMessage(error.message || 'Failed to update status. Please try again.');
      setSuccessModalType('error');
      setShowSuccessModal(true);
    }
  }, [refreshVolunteers, currentAdmin?.id, showToast])

  // Enhanced soft delete with rate limiting
  const handleSoftDelete = useCallback(async (id, volunteerName) => {
    // Sanitize volunteer name for display
    const sanitizedName = sanitizeInput(volunteerName);
    
    // Set volunteer to delete and show confirmation modal
    const volunteerData = { id, name: sanitizedName };
    setVolunteerToDelete(volunteerData);
    volunteerToDeleteRef.current = volunteerData;
    setShowDeleteModal(true);
  }, [])

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    if (!volunteerToDeleteRef.current) return;

    const volunteer = volunteerToDeleteRef.current; // Use ref value
    setIsDeleting(true);
    
    // Check rate limiting
    const rateLimitKey = `soft_delete_${currentAdmin?.id}`;
    if (!rateLimiter.current.isAllowed(rateLimitKey)) {
      showToast('Too many delete operations. Please wait a moment and try again.', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
      setVolunteerToDelete(null);
      volunteerToDeleteRef.current = null;
      return;
    }

    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('No admin token found. Please log in again.');
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/volunteers/${volunteer.id}/soft-delete`;
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorInfo = handleApiError({ status: response.status, message: errorData.message }, 'soft_delete');
        throw new Error(errorInfo.message);
      }
      
      // Reset rate limiter on success
      rateLimiter.current.reset(rateLimitKey);
      
      // Close delete modal
      setShowDeleteModal(false);
      setVolunteerToDelete(null);
      volunteerToDeleteRef.current = null;
      
      // Show success message
      setSuccessMessage(`${volunteer.name} has been successfully deleted from the volunteer list.`);
      setSuccessModalType('success');
      setShowSuccessModal(true);
      
      // Refresh data after successful deletion
      refreshVolunteers();
    } catch (error) {
      setSuccessMessage(error.message || 'Failed to delete volunteer. Please try again.');
      setSuccessModalType('error');
      setShowSuccessModal(true);
    } finally {
      setIsDeleting(false);
    }
  }, [refreshVolunteers, currentAdmin?.id, showToast])

  // Handle delete cancellation
  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setVolunteerToDelete(null);
    volunteerToDeleteRef.current = null;
    setIsDeleting(false);
  }, [])

  // Store selected volunteer IDs for bulk delete
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState([]);

  // Handle bulk delete confirmation
  const handleBulkDeleteConfirm = useCallback((volunteerIds) => {
    setSelectedVolunteerIds(volunteerIds);
    setBulkDeleteCount(volunteerIds.length);
    setShowBulkDeleteModal(true);
  }, []);

  // Handle bulk delete execution
  const handleBulkDelete = useCallback(async (volunteerIds) => {
    if (!volunteerIds || volunteerIds.length === 0) return;

    setIsDeleting(true);
    
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('No admin token found. Please log in again.');
      }

      // Delete each volunteer
      const deletePromises = volunteerIds.map(async (volunteerId) => {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/volunteers/${volunteerId}/soft-delete`;
        
        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to delete volunteer ${volunteerId}: ${errorData.message || response.statusText}`);
        }
        
        return response.ok;
      });

      await Promise.all(deletePromises);
      
      // Show success message
      setSuccessMessage(`${volunteerIds.length} volunteer${volunteerIds.length !== 1 ? 's' : ''} have been successfully deleted from the volunteer list.`);
      setSuccessModalType('success');
      setShowSuccessModal(true);
      
      // Refresh data after successful deletion
      refreshVolunteers();
    } catch (error) {
      setSuccessMessage(error.message || 'Failed to delete volunteers. Please try again.');
      setSuccessModalType('error');
      setShowSuccessModal(true);
    } finally {
      setIsDeleting(false);
    }
  }, [refreshVolunteers])


  function capitalizeFirstLetter(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || ''
  )
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('filter') ? capitalizeFirstLetter(searchParams.get('filter')) : 'All status'
  )
  const [sortOrder, setSortOrder] = useState(
    searchParams.get('sort') === 'oldest' ? 'oldest' : 'latest'
  )
  const [programFilter, setProgramFilter] = useState('All Programs')
  const [showCount, setShowCount] = useState(
    parseInt(searchParams.get('show')) || 10
  )

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [volunteerToDelete, setVolunteerToDelete] = useState(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkDeleteCount, setBulkDeleteCount] = useState(0)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [successModalType, setSuccessModalType] = useState('success')
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Use ref to store volunteer to delete to avoid dependency issues
  const volunteerToDeleteRef = useRef(null)

  // Enhanced search handler with sanitization
  const handleSearchChange = useCallback((query) => {
    const sanitizedQuery = sanitizeInput(query);
    setSearchQuery(sanitizedQuery);
  }, []);

  // Handle error display with enhanced error handling
  useEffect(() => {
    if (volunteersError) {
      handleApiError(volunteersError, 'volunteers_fetch');
    }
    if (programsError) {
      handleApiError(programsError, 'programs_fetch');
    }
  }, [volunteersError, programsError]);

  useEffect(() => {
    const params = new URLSearchParams()

    if (statusFilter.toLowerCase() !== 'all status') {
      params.set('filter', statusFilter.toLowerCase())
    }

    if (sortOrder && sortOrder !== 'latest') {
      params.set('sort', sortOrder)
    }

    if (showCount && showCount !== 10) {
      params.set('show', showCount.toString())
    }

    if (searchQuery && searchQuery.trim() !== '') {
      params.set('search', searchQuery.trim())
    }

    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, statusFilter, sortOrder, showCount, searchQuery])

  const filteredVolunteers = useMemo(() => {
    if (!Array.isArray(volunteersData) || volunteersData.length === 0) return []
    
    const filtered = volunteersData.filter((volunteer) => {
      const matchesSearch =
        volunteer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        volunteer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        volunteer.program?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus =
        statusFilter.toLowerCase() === 'all status' ||
        volunteer.status?.toLowerCase() === statusFilter.toLowerCase()

      const matchesProgram =
        programFilter === 'All Programs' || volunteer.program === programFilter

      return matchesSearch && matchesStatus && matchesProgram
    })

    const sorted = filtered.sort((a, b) => {
      // Handle empty or invalid dates by using a fallback date
      const dateA = a.date ? new Date(a.date) : new Date(0)
      const dateB = b.date ? new Date(b.date) : new Date(0)
      
      // For latest: newest first (descending)
      // For oldest: oldest first (ascending)
      const result = sortOrder === 'latest' ? dateB - dateA : dateA - dateB
      
      return result
    })

    return sorted
  }, [volunteersData, searchQuery, statusFilter, programFilter, sortOrder])

  // Handle authentication check
  if (!isAuthenticated || !currentAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Volunteer Applications</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'orange' }}>
          <p>Please log in to view volunteer applications.</p>
        </div>
      </div>
    )
  }

  // Show skeleton loader only when we have no data yet
  if (shouldShowSkeleton) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Volunteer Applications</h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Showing volunteers for {currentAdmin.orgName || currentAdmin.org}
          </p>
        </div>
        
        {TableSkeleton}
      </div>
    )
  }

  // Show error state with enhanced error handling
  if (volunteersError) {
    const errorInfo = handleApiError(volunteersError, 'volunteers_display');
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Volunteer Applications</h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Showing volunteers for {currentAdmin.orgName || currentAdmin.org}
          </p>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <p>Error loading volunteer applications: {errorInfo.message}</p>
          <button 
            onClick={refreshVolunteers} 
            style={{ 
              marginTop: '1rem', 
              padding: '0.5rem 1rem',
              backgroundColor: '#16a085',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Volunteer Applications</h1>
      </div>

      <SearchAndFilterControls
        showCount={showCount}
        onShowCountChange={setShowCount}
        programFilter={programFilter}
        onProgramFilterChange={setProgramFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        programs={availablePrograms}
        programsLoading={programsLoading}
      />

      <VolunteerTable
        volunteers={filteredVolunteers}
        onStatusUpdate={handleStatusUpdate}
        onSoftDelete={handleSoftDelete}
        onBulkDelete={handleBulkDeleteConfirm}
        itemsPerPage={showCount}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        itemName={volunteerToDelete?.name || ''}
        itemType="volunteer"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        itemName={`${bulkDeleteCount} volunteer${bulkDeleteCount !== 1 ? 's' : ''}`}
        itemType="volunteer"
        onConfirm={() => {
          setShowBulkDeleteModal(false);
          // Execute bulk delete with the stored selected volunteer IDs
          handleBulkDelete(selectedVolunteerIds);
          setSelectedVolunteerIds([]);
        }}
        onCancel={() => setShowBulkDeleteModal(false)}
        isDeleting={isDeleting}
      />

      {/* Success Modal */}
      <SuccessModal
        message={successMessage}
        isVisible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type={successModalType}
        autoHideDuration={4000}
      />
    </div>
  )
}
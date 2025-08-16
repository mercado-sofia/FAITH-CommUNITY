'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import SearchAndFilterControls from './components/SearchAndFilterControls'
import VolunteerTable from './components/VolunteerTable'
import { useAdminVolunteers, useAdminPrograms } from '../../../hooks/useAdminData'
import { selectCurrentAdmin, selectIsAuthenticated } from '../../../rtk/superadmin/adminSlice'
import styles from './volunteers.module.css'

// Essential security utilities
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').substring(0, 100); // Basic XSS protection + length limit
};

const validateStatus = (status) => {
  const validStatuses = ['Pending', 'Approved', 'Declined'];
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

  // Fetch volunteers from API using admin's organization with SWR
  const { 
    volunteers: volunteersData = [], 
    isLoading: volunteersLoading, 
    error: volunteersError,
    mutate: refreshVolunteers
  } = useAdminVolunteers(currentAdmin?.id)

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
  
  // Enhanced status update with rate limiting and validation
  const handleStatusUpdate = useCallback(async (id, newStatus) => {
    // Validate status
    if (!validateStatus(newStatus)) {
      alert('Invalid status provided');
      return;
    }

    // Check rate limiting
    const rateLimitKey = `status_update_${currentAdmin?.id}`;
    if (!rateLimiter.current.isAllowed(rateLimitKey)) {
      alert('Too many status updates. Please wait a moment and try again.');
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
      console.error('Status update error:', error);
      alert(error.message || 'Failed to update status. Please try again.');
    }
  }, [refreshVolunteers, currentAdmin?.id])

  // Enhanced soft delete with rate limiting
  const handleSoftDelete = useCallback(async (id, volunteerName) => {
    // Sanitize volunteer name for display
    const sanitizedName = sanitizeInput(volunteerName);
    
    if (window.confirm(`Are you sure you want to delete ${sanitizedName}? This action will hide the volunteer from the list but preserve their data.`)) {
      // Check rate limiting
      const rateLimitKey = `soft_delete_${currentAdmin?.id}`;
      if (!rateLimiter.current.isAllowed(rateLimitKey)) {
        alert('Too many delete operations. Please wait a moment and try again.');
        return;
      }

      try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
          throw new Error('No admin token found. Please log in again.');
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/volunteers/${id}/soft-delete`, {
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
        
        // Refresh data after successful deletion
        refreshVolunteers();
      } catch (error) {
        console.error('Soft delete error:', error);
        alert(error.message || 'Failed to delete volunteer. Please try again.');
      }
    }
  }, [refreshVolunteers, currentAdmin?.id])

  const [searchQuery, setSearchQuery] = useState('')
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

  function capitalizeFirstLetter(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  // Enhanced search handler with sanitization
  const handleSearchChange = useCallback((query) => {
    const sanitizedQuery = sanitizeInput(query);
    setSearchQuery(sanitizedQuery);
  }, []);

  // Handle error display with enhanced error handling
  useEffect(() => {
    if (volunteersError) {
      console.error('Volunteers error:', volunteersError);
      const errorInfo = handleApiError(volunteersError, 'volunteers_fetch');
      // Could show a toast notification here instead of just console.log
    }
    if (programsError) {
      console.error('Programs error:', programsError);
      const errorInfo = handleApiError(programsError, 'programs_fetch');
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

    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, statusFilter, sortOrder, showCount])

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

  // Show loading state
  if (volunteersLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Volunteer Applications</h1>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Showing volunteers for {currentAdmin.orgName || currentAdmin.org}
          </p>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ 
            width: 40, 
            height: 40, 
            border: "4px solid #f1f5f9", 
            borderTop: "4px solid #16a085", 
            borderRadius: "50%", 
            animation: "spin 1s linear infinite",
            margin: '0 auto'
          }} />
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading volunteer applications...</p>
        </div>
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
        itemsPerPage={showCount}
      />
    </div>
  )
}
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminSubmissions } from '@/hooks/admin/useAdminData';
import { formatDateShort } from '@/utils/shared/dateUtils';
import { SearchAndFilterControls, SubmissionTable, BulkActionsBar } from './components';
import { PaginationControls, SkeletonLoader } from '../components';
import { SuccessModal, ErrorBoundary } from '@/components';
import { handleApiError } from '@/utils/admin/errorHandler';
import { API_CONFIG, PAGINATION, TIMEOUTS } from '@/utils/admin/constants';
import styles from './submissions.module.css';

export default function SubmissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const admin = useSelector((state) => state.admin.admin);
  const orgAcronym = admin?.org;
  const [pageReady, setPageReady] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('filter') ? capitalizeFirstLetter(searchParams.get('filter')) : 'All'
  );
  const [sortOrder, setSortOrder] = useState(
    searchParams.get('sort') === 'oldest' ? 'oldest' : 'latest'
  );
  const [sectionFilter, setSectionFilter] = useState(() => {
    const sectionParam = searchParams.get('section');
    if (!sectionParam) return 'All';
    // Handle migration from "all sections" to "all"
    if (sectionParam.toLowerCase() === 'all sections' || sectionParam.toLowerCase() === 'all') {
      return 'All';
    }
    return capitalizeFirstLetter(sectionParam);
  });
  const [showCount, setShowCount] = useState(
    parseInt(searchParams.get('show')) || PAGINATION.DEFAULT_PAGE_SIZE
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });

  // Use SWR hook for submissions data
  const { submissions, isLoading: loading, error, mutate: refreshSubmissions } = useAdminSubmissions(orgAcronym);

  // Show skeleton immediately on first load, then show content when data is ready
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Mark as initially loaded when data is available
  useEffect(() => {
    if (!loading && submissions.length >= 0) {
      setHasInitiallyLoaded(true);
      setPageReady(true);
    }
  }, [loading, submissions.length]);

  const showToast = useCallback((message, type = 'success') => {
    setSuccessModal({ isVisible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  }, []);

  function capitalizeFirstLetter(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // Check if error is a timeout
  const isTimeoutError = useMemo(() => {
    if (!error) return false;
    return error?.isTimeout || error?.status === 408 || error?.message?.toLowerCase().includes('timeout');
  }, [error]);

  // Handle retry for timeout errors
  const handleRetry = useCallback(() => {
    refreshSubmissions();
  }, [refreshSubmissions]);

  // Handle error display
  useEffect(() => {
    if (error) {
      // Only log if error hasn't been logged already by the fetcher/SWR
      const shouldLog = !error._alreadyLogged;
      const errorInfo = handleApiError(error, 'submissions_load', {
        redirectOnAuth: true,
        logError: shouldLog // Only log if not already logged
      });
      // Only show toast for user-facing errors (not 500s that are being retried)
      // Check error status safely
      const errorStatus = error?.status || error?.response?.status;
      if (errorStatus && typeof errorStatus === 'number' && errorStatus >= 500 && !isTimeoutError) {
        // Don't show toast for server errors during retries - SWR will handle retries
        // The error will be visible in the UI state (empty submissions list, etc.)
        return;
      }
      // Show toast for client errors (4xx), timeout errors, and other errors
      if (errorInfo.message) {
        showToast(errorInfo.message, 'error');
      }
    }
  }, [error, showToast, isTimeoutError]);

  // Handle authentication check
  useEffect(() => {
    if (!admin?.org) {
      showToast('Please log in to view submissions.', 'warning');
    }
  }, [admin?.org, showToast]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (statusFilter.toLowerCase() !== 'all') {
      params.set('filter', statusFilter.toLowerCase());
    }

    if (sortOrder && sortOrder !== 'latest') {
      params.set('sort', sortOrder);
    }

    if (sectionFilter.toLowerCase() !== 'all') {
      params.set('section', sectionFilter.toLowerCase());
    }

    if (showCount && showCount !== 10) {
      params.set('show', showCount.toString());
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, statusFilter, sortOrder, sectionFilter, showCount]);

  const filteredSubmissions = useMemo(() => {
    if (!Array.isArray(submissions)) return [];
    
    const filtered = submissions.filter((submission) => {
      const matchesSearch =
        submission.section?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatDateShort(submission.submitted_at).includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter.toLowerCase() === 'all' ||
        submission.status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesSection =
        sectionFilter.toLowerCase() === 'all' || 
        submission.section?.toLowerCase() === sectionFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSection;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.submitted_at);
      const dateB = new Date(b.submitted_at);
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });
  }, [submissions, searchQuery, statusFilter, sectionFilter, sortOrder]);

  // Calculate pagination
  const totalItems = filteredSubmissions.length;
  const totalPages = Math.ceil(totalItems / showCount);
  const startIndex = (currentPage - 1) * showCount;
  const endIndex = Math.min(startIndex + showCount, totalItems);
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    // Optional: Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sectionFilter, sortOrder, showCount]);

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Bulk actions handlers
  const handleBulkCancel = useCallback(async () => {
    try {
      // Only cancel pending submissions from the selected items
      const pendingIds = Array.from(selectedItems).filter(id => {
        const submission = filteredSubmissions.find(s => s.id === id);
        return submission && submission.status === 'pending';
      });
      
      if (pendingIds.length === 0) {
        showToast('No pending submissions selected to cancel.', 'warning');
        return;
      }
      
      // No need to check token - cookies handle authentication
      const promises = pendingIds.map(id => 
        fetch(`${API_CONFIG.BASE_URL}/api/submissions/${id}`, { 
          method: 'DELETE',
          credentials: 'include', // CRITICAL: Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          }
        })
      );
      await Promise.all(promises);
      refreshSubmissions();
      setSelectedItems(new Set());
      setShowBulkActions(false);
      showToast('Submissions cancelled successfully!', 'success');
    } catch (err) {
      showToast('Failed to cancel some submissions', 'error');
    }
  }, [selectedItems, filteredSubmissions, refreshSubmissions, showToast]);

  const handleBulkDelete = useCallback(async () => {
    try {
      // No need to check token - cookies handle authentication
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/submissions/bulk-delete`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: Array.from(selectedItems) })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete submissions: ${response.status}`);
      }
      
      refreshSubmissions();
      setSelectedItems(new Set());
      setShowBulkActions(false);
      showToast('Submissions deleted successfully!', 'success');
    } catch (err) {
      showToast(`Failed to delete some submissions: ${err.message}`, 'error');
    }
  }, [selectedItems, refreshSubmissions, showToast]);

  // Show skeleton immediately on first load or when loading
  if (!hasInitiallyLoaded || (loading && !pageReady)) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Submissions</h1>
        </div>
        <SkeletonLoader type="table" count={8} />
      </div>
    );
  }

  // Show error state for auth errors
  if (error && !admin?.org) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Submissions</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <p>Please log in to view submissions.</p>
        </div>
      </div>
    );
  }

  // Show timeout error state with retry button
  if (isTimeoutError && !loading && submissions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Submissions</h1>
        </div>
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ color: '#d32f2f', fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            Request Timed Out
          </div>
          <p style={{ color: '#666', maxWidth: '500px', marginBottom: '1rem' }}>
            The server is taking too long to respond. This may happen when loading submissions with large data (post-act reports, images). Please try again.
          </p>
          <button
            onClick={handleRetry}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Submissions</h1>
      </div>

      <SearchAndFilterControls
        showCount={showCount}
        onShowCountChange={(value) => setShowCount(parseInt(value))}
        sectionFilter={sectionFilter}
        onSectionFilterChange={setSectionFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {showBulkActions && (
        <BulkActionsBar 
          selectedCount={selectedItems.size}
          selectedItems={selectedItems}
          submissions={filteredSubmissions}
          onCancel={handleBulkCancel}
          onDelete={handleBulkDelete}
          onClearSelection={() => {
            setSelectedItems(new Set());
            setShowBulkActions(false);
          }}
        />
      )}

      {/* Show timeout warning banner if there's an error but we have previous data */}
      {isTimeoutError && submissions.length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#856404', display: 'block', marginBottom: '0.25rem' }}>
              Request Timed Out
            </strong>
            <span style={{ color: '#856404', fontSize: '0.9rem' }}>
              Showing previous data. The latest submissions may not be visible. Click &quot;Retry&quot; to refresh.
            </span>
          </div>
          <button
            onClick={handleRetry}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ffc107',
              color: '#856404',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      <div className={styles.tableContainer}>
        <SubmissionTable 
          submissions={paginatedSubmissions}
          loading={loading}
          onRefresh={refreshSubmissions}
          currentPage={currentPage}
          itemsPerPage={showCount}
          selectedItems={selectedItems}
          onSelectItems={setSelectedItems}
          onShowBulkActions={setShowBulkActions}
        />
        
        {filteredSubmissions.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            startIndex={startIndex}
            endIndex={endIndex}
            totalCount={totalItems}
          />
        )}
      </div>
      
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={hideToast}
        type={successModal.type}
        autoHideDuration={TIMEOUTS.TOAST_AUTO_HIDE}
      />
    </div>
    </ErrorBoundary>
  );
}
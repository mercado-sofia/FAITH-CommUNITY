'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaPlus } from 'react-icons/fa';
import { ConfirmationModal, SuccessModal, ErrorBoundary } from '@/components';
import { SkeletonLoader } from '../components';
import { SearchAndFilterControls, HighlightCard, HighlightForm } from './components';
import { HighlightDetailsModal } from '@/components/portal';
import { handleApiError } from '@/utils/admin/errorHandler';
import { API_CONFIG, TIMEOUTS } from '@/utils/admin/constants';
import { useAdminPrograms } from '@/hooks/admin/useAdminData';
import styles from './highlights.module.css';

export default function AdminHighlightsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [pageMode, setPageMode] = useState('list'); // 'list', 'create', or 'edit'
  const [editingHighlight, setEditingHighlight] = useState(null);
  const [viewingHighlight, setViewingHighlight] = useState(null);
  const [deletingHighlight, setDeletingHighlight] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [programFilter, setProgramFilter] = useState(searchParams.get('program') || 'All');

  // Fetch programs for filter
  const { 
    programs: programsData = [], 
    isLoading: programsLoading
  } = useAdminPrograms();

  // Show skeleton immediately on first load, then show content when data is ready
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Mark as initially loaded when data is available
  useEffect(() => {
    if (!isLoading && highlights.length >= 0) {
      setHasInitiallyLoaded(true);
    }
  }, [isLoading, highlights.length]);

  // Handle error display
  useEffect(() => {
    if (error) {
      setSuccessModal({ 
        isVisible: true, 
        message: 'Failed to load highlights. Please try again.', 
        type: 'error' 
      });
    }
  }, [error]);

  // Sync URL parameters with state when URL changes
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'newest';
    const program = searchParams.get('program') || 'All';
    
    if (search !== searchQuery) setSearchQuery(search);
    if (sort !== sortBy) setSortBy(sort);
    if (program !== programFilter) setProgramFilter(program);
  }, [searchParams, searchQuery, sortBy, programFilter]);

  // Load highlights data
  const loadHighlights = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check for window to avoid SSR errors
      if (typeof window === 'undefined') {
        throw new Error('Cannot fetch highlights on server side');
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/admin/highlights`, {
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
      });

      if (!response.ok) {
        // Only redirect on actual 401 authentication errors
        // Other errors should be shown but not redirect
        const shouldRedirect = response.status === 401;
        const errorInfo = handleApiError({ status: response.status }, 'highlights_fetch', {
          redirectOnAuth: shouldRedirect,
          logError: true
        });
        throw new Error(errorInfo.message);
      }

      const data = await response.json();
      const highlightsData = data.highlights || [];
      
      setHighlights(highlightsData);
    } catch (err) {
      // Only redirect on actual authentication errors, not network errors
      // Check if it's a 401 or authentication-related error
      const isAuthError = err.message?.includes('session') || 
                         err.message?.includes('expired') ||
                         err.message?.includes('authentication') ||
                         (err.status === 401);
      
      const errorInfo = handleApiError(err, 'highlights_load', {
        redirectOnAuth: isAuthError,
        logError: true
      });
      setError(errorInfo.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load highlights on component mount - wait for admin auth to be ready
  useEffect(() => {
    // Wait for adminData to be available in localStorage (set by layout after auth check)
    const checkAndLoad = async () => {
      // Give the layout time to initialize auth
      let retries = 0;
      const maxRetries = 10;
      const retryDelay = 100; // 100ms between checks
      
      while (retries < maxRetries) {
        const adminData = localStorage.getItem('adminData');
        if (adminData) {
          try {
            const parsed = JSON.parse(adminData);
            if (parsed && parsed.role === 'admin') {
              // Admin is authenticated, safe to load highlights
              loadHighlights();
              return;
            }
          } catch (e) {
            // Invalid data, break and try anyway
            break;
          }
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retries++;
      }
      
      // If we've waited long enough, try loading anyway
      // The API will return 401 if not authenticated, which will be handled
      loadHighlights();
    };
    
    checkAndLoad();
  }, [loadHighlights]);

  // Refresh data when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && pageMode === 'list') {
        loadHighlights();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadHighlights, pageMode]);

  // Handle search change
  const handleSearchChange = useCallback((newSearchQuery) => {
    setSearchQuery(newSearchQuery);
    const params = new URLSearchParams(searchParams);
    if (newSearchQuery) {
      params.set('search', newSearchQuery);
    } else {
      params.delete('search');
    }
    router.replace(`/admin/highlights?${params.toString()}`);
  }, [searchParams, router]);

  // Handle filter change
  const handleFilterChange = useCallback((filterType, value) => {
    const params = new URLSearchParams(searchParams);
    
    if (filterType === 'sort') {
      setSortBy(value);
      if (value !== 'newest') {
        params.set('sort', value);
      } else {
        params.delete('sort');
      }
    } else if (filterType === 'program') {
      setProgramFilter(value);
      if (value !== 'All') {
        params.set('program', value);
      } else {
        params.delete('program');
      }
    }
    
    router.replace(`/admin/highlights?${params.toString()}`);
  }, [searchParams, router]);

  // Filter and sort highlights - only show approved highlights
  const filteredAndSortedHighlights = useCallback(() => {
    // First, deduplicate highlights by ID to prevent duplicate keys
    const uniqueHighlights = highlights.reduce((acc, highlight) => {
      if (!acc.find(item => item.id === highlight.id)) {
        acc.push(highlight);
      }
      return acc;
    }, []);

    // Filter to only show approved highlights (similar to programs page)
    let filtered = uniqueHighlights.filter(highlight => highlight.status === 'approved');

    // Apply program filter
    if (programFilter !== 'All') {
      filtered = filtered.filter(highlight => 
        highlight.program_title === programFilter || 
        highlight.program_id?.toString() === programFilter
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(highlight => 
        highlight.title?.toLowerCase().includes(query) ||
        highlight.description?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt);
        case 'oldest':
          return new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    return sorted;
  }, [highlights, searchQuery, sortBy, programFilter]);

  // Handle create highlight
  const handleCreateHighlight = useCallback(() => {
    setPageMode('create');
    setEditingHighlight(null);
  }, []);

  // Handle edit highlight - fetch fresh data from API to ensure we have latest program_id
  const handleEditHighlight = useCallback(async (highlight) => {
    try {
      // Fetch fresh highlight data from API to ensure we have the latest program_id
      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/admin/highlights/${highlight.id}`, {
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setEditingHighlight(data.highlight);
        setPageMode('edit');
      } else {
        // If fetch fails, use the highlight from list as fallback
        setEditingHighlight(highlight);
        setPageMode('edit');
      }
    } catch (error) {
      console.error('Error fetching highlight for edit:', error);
      // On error, use the highlight from list as fallback
      setEditingHighlight(highlight);
      setPageMode('edit');
    }
  }, []);

  // Handle view highlight details
  const handleViewHighlight = useCallback((highlight) => {
    setViewingHighlight(highlight);
  }, []);

  // Handle delete highlight
  const handleDeleteHighlight = useCallback((highlight) => {
    setDeletingHighlight(highlight);
  }, []);

  // Confirm delete highlight
  const confirmDeleteHighlight = useCallback(async () => {
    if (!deletingHighlight) return;

    try {
      setIsDeleting(true);
      
      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/admin/highlights/${deletingHighlight.id}`, {
        method: 'DELETE',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
      });

      if (!response.ok) {
        // Only redirect on actual 401 authentication errors
        const shouldRedirect = response.status === 401;
        const errorInfo = handleApiError({ status: response.status }, 'highlights_delete', {
          redirectOnAuth: shouldRedirect,
          logError: true
        });
        throw new Error(errorInfo.message);
      }

      // Refresh the highlights list to ensure we have the latest data
      await loadHighlights();
      
      setSuccessModal({
        isVisible: true,
        message: 'Highlight deleted successfully',
        type: 'success'
      });
    } catch (err) {
      setSuccessModal({
        isVisible: true,
        message: 'Failed to delete highlight. Please try again.',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
      setDeletingHighlight(null);
    }
  }, [deletingHighlight, loadHighlights]);

  // Handle form submission
  const handleFormSubmit = useCallback(async (formData) => {
    try {
      const isEdit = pageMode === 'edit';
      
      const url = isEdit 
        ? `${API_CONFIG.BASE_URL || ''}/api/admin/highlights/${editingHighlight.id}`
        : `${API_CONFIG.BASE_URL || ''}/api/admin/highlights`;
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `Failed to ${isEdit ? 'update' : 'create'} highlight`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('Highlight submission error:', errorData);
        } catch (e) {
          console.error('Highlight submission failed:', response.status, response.statusText);
        }
        
        // Only redirect on actual 401 authentication errors
        const shouldRedirect = response.status === 401;
        const errorInfo = handleApiError({ status: response.status }, `highlights_${isEdit ? 'update' : 'create'}`, {
          redirectOnAuth: shouldRedirect,
          logError: true
        });
        throw new Error(errorInfo.message || errorMessage);
      }

      const result = await response.json();
      
      // Refresh the highlights list to ensure we have the latest data
      await loadHighlights();

      setSuccessModal({
        isVisible: true,
        message: `Highlight ${isEdit ? 'updated' : 'created'} successfully`,
        type: 'success'
      });

      setPageMode('list');
      setEditingHighlight(null);
    } catch (err) {
      setSuccessModal({
        isVisible: true,
        message: `Failed to ${pageMode === 'edit' ? 'update' : 'create'} highlight. Please try again.`,
        type: 'error'
      });
    }
  }, [pageMode, editingHighlight, loadHighlights]);

  // Handle form cancel
  const handleFormCancel = useCallback(async () => {
    setPageMode('list');
    setEditingHighlight(null);
    // Refresh data when returning to list view
    await loadHighlights();
  }, [loadHighlights]);

  // Hide success modal
  const hideSuccessModal = useCallback(() => {
    setSuccessModal(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Show loading state
  if (!hasInitiallyLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1>Highlights</h1>
            <button className={styles.addButton} disabled>
              <FaPlus /> Add Highlight
            </button>
          </div>
        </div>
        <div className={styles.programsSection}>
          <SkeletonLoader type="grid" count={6} />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className={styles.container}>
      {pageMode === 'list' ? (
        <>
          {/* Header Section - Consistent with other admin pages */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <h1>Highlights</h1>
              <button 
                onClick={handleCreateHighlight}
                className={styles.addButton}
              >
                <FaPlus /> Add Highlight
              </button>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <SearchAndFilterControls
            searchQuery={searchQuery}
            sortBy={sortBy}
            programFilter={programFilter}
            onSearchChange={handleSearchChange}
            onFilterChange={handleFilterChange}
            programs={programsData}
            programsLoading={programsLoading}
            totalCount={highlights?.filter(h => h.status === 'approved')?.length || 0}
            filteredCount={filteredAndSortedHighlights()?.length || 0}
          />

          {/* Highlights Grid */}
          <div className={styles.programsSection}>
            {filteredAndSortedHighlights().length > 0 ? (
              <div className={styles.programsGrid}>
                {filteredAndSortedHighlights().map((highlight, index) => (
                  <HighlightCard
                    key={`highlight-${highlight.id}-${index}`}
                    highlight={highlight}
                    onEdit={handleEditHighlight}
                    onView={handleViewHighlight}
                    onDelete={handleDeleteHighlight}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h3 className={styles.emptyTitle}>
                  {searchQuery ? 'No highlights found' : 'No highlights yet'}
                </h3>
                <p className={styles.emptyDescription}>
                  {searchQuery 
                    ? 'Try adjusting your search terms'
                    : 'Create your first success story to get started'
                  }
                </p>
                {!searchQuery && (
                  <button 
                    onClick={handleCreateHighlight}
                    className={styles.emptyActionButton}
                  >
                    <FaPlus /> Add Your First Highlight
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
          <HighlightForm
            mode={pageMode}
            highlight={editingHighlight}
            onCancel={handleFormCancel}
            onSubmit={handleFormSubmit}
          headerTitle={pageMode === 'edit' ? 'Edit Highlight' : 'Add New Highlight'}
          />
      )}

      {/* View Details Modal */}
      {viewingHighlight && (
        <HighlightDetailsModal
          highlight={viewingHighlight}
          isOpen={!!viewingHighlight}
          portal="admin"
          onClose={() => setViewingHighlight(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deletingHighlight}
        itemName={deletingHighlight?.title || 'this highlight'}
        itemType="highlight"
        onConfirm={confirmDeleteHighlight}
        onCancel={() => setDeletingHighlight(null)}
        isDeleting={isDeleting}
      />

      {/* Success Modal */}
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={hideSuccessModal}
        type={successModal.type}
        autoHideDuration={TIMEOUTS.TOAST_AUTO_HIDE}
      />
    </div>
    </ErrorBoundary>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaPlus } from 'react-icons/fa';
import { ConfirmationModal, SuccessModal, ErrorBoundary } from '@/components';
import { SkeletonLoader } from '../components';
import { SearchAndFilterControls, HighlightCard, ViewDetailsModal, HighlightForm } from './components';
import { getAdminTokenOrRedirect, handleApiError, API_CONFIG, TIMEOUTS } from '../utils';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

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
    
    if (search !== searchQuery) setSearchQuery(search);
    if (sort !== sortBy) setSortBy(sort);
  }, [searchParams, searchQuery, sortBy]);

  // Load highlights data
  const loadHighlights = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      // Check for window to avoid SSR errors
      if (typeof window === 'undefined') {
        throw new Error('Cannot fetch highlights on server side');
      }
      
      // Get admin token using centralized utility
      const token = getAdminTokenOrRedirect();
      if (!token) {
        throw new Error('No admin token found. Please log in again.');
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/highlights`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'highlights_fetch', {
          redirectOnAuth: true,
          logError: true
        });
        throw new Error(errorInfo.message);
      }

      const data = await response.json();
      const highlightsData = data.highlights || [];
      
      setHighlights(highlightsData);
    } catch (err) {
      const errorInfo = handleApiError(err, 'highlights_load', {
        redirectOnAuth: true,
        logError: true
      });
      setError(errorInfo.message);
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  // Load highlights on component mount
  useEffect(() => {
    loadHighlights();
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
    if (filterType === 'sort') {
      setSortBy(value);
      const params = new URLSearchParams(searchParams);
      if (value !== 'newest') {
        params.set('sort', value);
      } else {
        params.delete('sort');
      }
      router.replace(`/admin/highlights?${params.toString()}`);
    }
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
  }, [highlights, searchQuery, sortBy]);

  // Handle create highlight
  const handleCreateHighlight = useCallback(() => {
    setPageMode('create');
    setEditingHighlight(null);
  }, []);

  // Handle edit highlight
  const handleEditHighlight = useCallback((highlight) => {
    setEditingHighlight(highlight);
    setPageMode('edit');
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
      
      const token = getAdminTokenOrRedirect();
      if (!token) {
        throw new Error('No admin token found. Please log in again.');
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/highlights/${deletingHighlight.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'highlights_delete', {
          redirectOnAuth: true,
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
        ? `${API_CONFIG.BASE_URL}/api/admin/highlights/${editingHighlight.id}`
        : `${API_CONFIG.BASE_URL}/api/admin/highlights`;
      
      const method = isEdit ? 'PUT' : 'POST';

      const token = getAdminTokenOrRedirect();
      if (!token) {
        throw new Error('No admin token found. Please log in again.');
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, `highlights_${isEdit ? 'update' : 'create'}`, {
          redirectOnAuth: true,
          logError: true
        });
        throw new Error(errorInfo.message);
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
            onSearchChange={handleSearchChange}
            onFilterChange={handleFilterChange}
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
        <>
          <div className={styles.createPostHeader}>
            <h1>{pageMode === 'edit' ? 'Edit Highlight' : 'Add New Highlight'}</h1>
          </div>
          <HighlightForm
            mode={pageMode}
            highlight={editingHighlight}
            onCancel={handleFormCancel}
            onSubmit={handleFormSubmit}
          />
        </>
      )}

      {/* View Details Modal */}
      {viewingHighlight && (
        <ViewDetailsModal
          highlight={viewingHighlight}
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

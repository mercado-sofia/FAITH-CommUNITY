'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useArchivedHighlights, useAdminPrograms } from '@/hooks/admin/useAdminData';
import { SearchAndFilterControls, HighlightCard } from '../components';
import { HighlightDetailsModal } from '@/components/portal';
import { SkeletonLoader } from '../../components';
import { ConfirmationModal, ErrorBoundary, SuccessModal } from '@/components';
import { handleApiError } from '@/utils/admin/errorHandler';
import { API_CONFIG, TIMEOUTS } from '@/utils/admin/constants';
import { makeAdminRequest } from '@/utils/admin/apiClient';
import styles from '../highlights.module.css';
import { FiArrowLeft } from 'react-icons/fi';

export default function ArchiveHighlightsPage() {
  const router = useRouter();
  
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [programFilter, setProgramFilter] = useState('All');
  const [viewingHighlight, setViewingHighlight] = useState(null);
  const [unarchivingHighlight, setUnarchivingHighlight] = useState(null);
  const [isUnarchiving, setIsUnarchiving] = useState(false);

  // Use SWR hook for archived highlights data
  const { highlights: archivedHighlights = [], isLoading: loading, error, mutate: refreshArchivedHighlights } = useArchivedHighlights();

  // Fetch programs for filter
  const { 
    programs: programsData = [], 
    isLoading: programsLoading
  } = useAdminPrograms();

  // Show skeleton immediately on first load, then show content when data is ready
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Mark as initially loaded when data is available
  useEffect(() => {
    if (!loading && archivedHighlights.length >= 0) {
      setHasInitiallyLoaded(true);
    }
  }, [loading, archivedHighlights.length]);

  // Handle error display
  useEffect(() => {
    if (error) {
      const errorInfo = handleApiError(error, 'archived_highlights_load', {
        redirectOnAuth: true,
        logError: true
      });
      setSuccessModal({ 
        isVisible: true, 
        message: errorInfo.message, 
        type: 'error' 
      });
    }
  }, [error]);

  // Close success modal (memoized)
  const closeSuccessModal = useCallback(() => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((filterType, value) => {
    if (filterType === 'sort') {
      setSortBy(value);
    } else if (filterType === 'program') {
      setProgramFilter(value);
    }
  }, []);

  // Filter and sort archived highlights
  const filteredAndSortedHighlights = useCallback(() => {
    // First, deduplicate highlights by ID to prevent duplicate keys
    const uniqueHighlights = archivedHighlights.reduce((acc, highlight) => {
      if (!acc.find(item => item.id === highlight.id)) {
        acc.push(highlight);
      }
      return acc;
    }, []);

    // Filter to only show archived highlights
    let filtered = uniqueHighlights.filter(highlight => highlight.status === 'archived');

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
  }, [archivedHighlights, searchQuery, sortBy, programFilter]);

  // Handle view highlight details
  const handleViewHighlight = useCallback((highlight) => {
    setViewingHighlight(highlight);
  }, []);

  // Handle unarchive highlight
  const handleUnarchiveHighlight = useCallback((highlight) => {
    setUnarchivingHighlight(highlight);
  }, []);

  // Confirm unarchive highlight
  const confirmUnarchiveHighlight = useCallback(async () => {
    if (!unarchivingHighlight) return;

    try {
      setIsUnarchiving(true);
      
      // Use centralized API client with automatic token refresh
      const response = await makeAdminRequest(
        `${API_CONFIG.BASE_URL || ''}/api/admin/highlights/${unarchivingHighlight.id}/unarchive`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        router
      );

      if (!response || !response.ok) {
        const shouldRedirect = response?.status === 401;
        const errorInfo = handleApiError({ status: response?.status || 500 }, 'highlights_unarchive', {
          redirectOnAuth: shouldRedirect,
          logError: true
        });
        throw new Error(errorInfo.message);
      }

      // Refresh the archived highlights list
      await refreshArchivedHighlights();
      
      setSuccessModal({
        isVisible: true,
        message: 'Highlight unarchived successfully',
        type: 'success'
      });
    } catch (err) {
      setSuccessModal({
        isVisible: true,
        message: 'Failed to unarchive highlight. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUnarchiving(false);
      setUnarchivingHighlight(null);
    }
  }, [unarchivingHighlight, refreshArchivedHighlights, router]);

  // Show skeleton immediately on first load or when loading
  if (!hasInitiallyLoaded || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1>Archives</h1>
          </div>
        </div>
        
        <SkeletonLoader type="grid" count={6} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1>Archives</h1>
            <button
              onClick={() => router.push('/admin/highlights')}
              className={styles.addButton}
              title="Go back to Highlights"
            >
              <FiArrowLeft /> Go back
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
        />

        {/* Highlights Grid */}
        <div className={styles.programsSection}>
          {filteredAndSortedHighlights().length > 0 ? (
            <div className={styles.programsGrid}>
              {filteredAndSortedHighlights().map((highlight, index) => (
                <HighlightCard
                  key={`highlight-${highlight.id}-${index}`}
                  highlight={highlight}
                  onView={handleViewHighlight}
                  onUnarchive={handleUnarchiveHighlight}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h3 className={styles.emptyTitle}>
                {searchQuery ? 'No archived highlights found' : 'No archived highlights yet'}
              </h3>
              <p className={styles.emptyDescription}>
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Archived highlights will appear here'
                }
              </p>
            </div>
          )}
        </div>

        {/* View Details Modal */}
        {viewingHighlight && (
          <HighlightDetailsModal
            highlight={viewingHighlight}
            isOpen={!!viewingHighlight}
            portal="admin"
            onClose={() => setViewingHighlight(null)}
          />
        )}

        {/* Unarchive Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!unarchivingHighlight}
          itemName={unarchivingHighlight?.title || 'this highlight'}
          itemType="highlight"
          actionType="unarchive"
          customMessage={`Are you sure you want to unarchive "${unarchivingHighlight?.title || 'this highlight'}"? This will restore the highlight and make it visible on the public portal again.`}
          onConfirm={confirmUnarchiveHighlight}
          onCancel={() => setUnarchivingHighlight(null)}
          isLoading={isUnarchiving}
        />

        {/* Success Modal */}
        <SuccessModal
          message={successModal.message}
          isVisible={successModal.isVisible}
          onClose={closeSuccessModal}
          type={successModal.type}
          autoHideDuration={TIMEOUTS.SUCCESS_MODAL}
        />
      </div>
    </ErrorBoundary>
  );
}


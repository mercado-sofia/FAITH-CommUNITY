'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { useAdminNews } from '../hooks/useAdminData';
import { useNewsOperations, useNewsFilters, useNewsModals, useNewsURL } from './hooks';
import { NewsTable, CreatePostForm, SearchAndFilterControls, RecentlyDeletedModal } from './components';
import { ErrorBoundary, SuccessModal } from '@/components';
import { SkeletonLoader } from '../components';
import { ConfirmationModal } from '@/components';
import styles from './news.module.css';
import { FaPlus } from 'react-icons/fa';

export default function AdminNewsPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  
  // Success modal state
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });

  // Use SWR hook for news data
  const { news = [], isLoading: loading, error, mutate: refreshNews } = useAdminNews(
    currentAdmin?.org && currentAdmin.org !== '' ? currentAdmin.org : null
  );

  const orgId = currentAdmin?.org;

  // Use custom hooks
  const newsOperations = useNewsOperations(orgId, refreshNews, setSuccessModal);
  const urlState = useNewsURL();
  const modals = useNewsModals();
  const { displayedNews, stats } = useNewsFilters(news, urlState.searchQuery, urlState.sortBy);

  // Memoize the selection change handler
  const handleSelectionChange = useCallback((newSelection) => {
    modals.setSelectedItems(newSelection);
  }, [modals]);

  // Auto-clear success modal after 3 seconds
  useEffect(() => {
    if (successModal.isVisible) {
      const timer = setTimeout(() => {
        setSuccessModal({ isVisible: false, message: '', type: 'success' });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [successModal.isVisible]);

  // Handle error display
  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setSuccessModal({ isVisible: true, message: `Failed to fetch news: ${errorMessage}`, type: 'error' });
    }
  }, [error]);

  // Enhanced submit handler that handles both create and update
  const handleSubmitNews = useCallback(async (newsData) => {
    if (modals.pageMode === 'create') {
      const result = await newsOperations.handleSubmitNews(newsData);
      if (result.success) {
        modals.handleListMode();
      }
    } else if (modals.pageMode === 'edit') {
      const result = await newsOperations.handleUpdateNews(newsData, modals.editingNews?.id);
      if (result.success) {
        modals.handleListMode();
      }
    }
  }, [modals, newsOperations]);

  // Enhanced delete handler
  const handleDeleteConfirm = useCallback(async () => {
    if (modals.deletingNews) {
      await newsOperations.handleDeleteNews(modals.deletingNews.id);
      modals.handleCloseDeleteModal();
    } else if (modals.selectedItems.length > 0) {
      await newsOperations.handleBulkDelete(modals.selectedItems);
      modals.handleCloseDeleteModal();
    }
  }, [modals, newsOperations]);

  // Display error message if there's an error and we have a valid admin
  if (error && currentAdmin?.org) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage} role="alert" aria-live="assertive">
          Error loading news: {error.message}
        </div>
      </div>
    );
  }

  // Show loading state if admin data is not yet available
  if (!currentAdmin?.org) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingMessage} aria-live="polite">
          Loading admin data...
        </div>
      </div>
    );
  }

  // Loading state
  if (!currentAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.loading} aria-live="polite">
          {localStorage.getItem('adminToken') ? 'Loading admin session...' : 'Please log in to access this page.'}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={styles.container}>
        {modals.pageMode === 'list' ? (
          <>
            <div className={styles.headerTop}>
              <h1>News</h1>
              <div className={styles.headerActions}>
                <button
                  onClick={modals.handleCreateMode}
                  className={styles.addButton}
                  disabled={newsOperations.isSubmitting || loading}
                >
                  <FaPlus /> New Post
                </button>
              </div>
            </div>

            <SearchAndFilterControls
              searchQuery={urlState.searchQuery}
              onSearchChange={urlState.handleSearchChange}
              sortBy={urlState.sortBy}
              onSortChange={urlState.handleSortChange}
              showCount={urlState.showCount}
              onShowCountChange={urlState.handleShowCountChange}
              totalCount={stats.totalCount}
              filteredCount={stats.filteredCount}
              onRecentlyDeletedClick={modals.handleShowRecentlyDeleted}
            />

            {loading && (
              <SkeletonLoader 
                type="table" 
                count={urlState.showCount} 
                columns={[
                  { type: 'checkbox', width: '40px' },
                  { type: 'title', width: '50%' },
                  { type: 'date', width: '30%' },
                  { type: 'actions', width: '20%' }
                ]}
              />
            )}

            {error && (
              <div className={styles.errorContainer}>
                <p className={styles.errorMessage} role="alert" aria-live="assertive">
                  {error instanceof Error ? error.message : String(error)}
                </p>
              </div>
            )}

            {!loading && !error && (
              <NewsTable
                news={displayedNews || []}
                onEdit={modals.handleEdit}
                onDelete={modals.handleDelete}
                onBulkDelete={modals.handleBulkDeleteRequest}
                onSelectionChange={handleSelectionChange}
                selectedItems={modals.selectedItems}
                itemsPerPage={urlState.showCount}
              />
            )}
          </>
        ) : modals.pageMode === 'create' ? (
          <>
            <div className={styles.createPostHeader}>
              <h1>Create New Post</h1>
            </div>
            <CreatePostForm
              onCancel={modals.handleListMode}
              onSubmit={handleSubmitNews}
              isSubmitting={newsOperations.isSubmitting}
              existingNews={news || []}
            />
          </>
        ) : modals.pageMode === 'edit' ? (
          <>
            <div className={styles.createPostHeader}>
              <h1>Edit Post</h1>
            </div>
            <CreatePostForm
              onCancel={modals.handleListMode}
              onSubmit={handleSubmitNews}
              isSubmitting={newsOperations.isSubmitting}
              initialData={modals.editingNews}
              isEditMode={true}
              existingNews={news || []}
            />
          </>
        ) : null}

      {/* Delete News Modal */}
      <ConfirmationModal
          isOpen={modals.isDeleteModalOpen}
          itemName={modals.getDeleteModalItemName()}
        itemType="news"
          onConfirm={handleDeleteConfirm}
          onCancel={modals.handleCloseDeleteModal}
          isDeleting={newsOperations.isDeleting}
      />

      {/* Recently Deleted Modal */}
      <RecentlyDeletedModal
          isOpen={modals.showRecentlyDeletedModal}
          onClose={modals.handleCloseRecentlyDeleted}
        orgId={orgId}
        onRestore={() => {
          refreshNews();
          setSuccessModal({ isVisible: true, message: 'News restored successfully!', type: 'success' });
        }}
        onPermanentDelete={() => {
          refreshNews();
          setSuccessModal({ isVisible: true, message: 'News permanently deleted!', type: 'success' });
        }}
      />

      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={() => setSuccessModal({ isVisible: false, message: '', type: 'success' })}
        type={successModal.type}
        autoHideDuration={4000}
      />
    </div>
    </ErrorBoundary>
  );
}
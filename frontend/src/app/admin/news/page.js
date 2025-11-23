'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { useAdminNews } from '../hooks/useAdminData';
import { useNewsOperations, useNewsFilters, useNewsModals, useNewsURL } from './hooks';
import { NewsTable, CreatePostForm, SearchAndFilterControls, ViewDetailsModal } from './components';
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
  const { displayedNews, stats } = useNewsFilters(news, urlState.searchQuery, urlState.sortBy, urlState.statusFilter);

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

  // Handle error display - show in modal for better UX
  useEffect(() => {
    if (error && currentAdmin?.org) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Only show error modal if we're not already showing an error
      if (!successModal.isVisible || successModal.type !== 'error') {
        setSuccessModal({ isVisible: true, message: `Failed to fetch news: ${errorMessage}`, type: 'error' });
      }
    }
  }, [error, currentAdmin?.org, successModal.isVisible, successModal.type]);

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

  // Handle archive confirmation
  const handleArchiveConfirm = useCallback(async () => {
    if (modals.archivingNews) {
      await newsOperations.handleArchiveNews(modals.archivingNews.id);
      modals.handleCloseArchiveModal();
    }
  }, [modals, newsOperations]);

  // Handle unarchive confirmation
  const handleUnarchiveConfirm = useCallback(async () => {
    if (modals.unarchivingNews) {
      await newsOperations.handleUnarchiveNews(modals.unarchivingNews.id);
      modals.handleCloseUnarchiveModal();
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
  if (!currentAdmin || !currentAdmin?.org) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingMessage} aria-live="polite">
          {!currentAdmin ? 'Loading admin session...' : 'Loading admin data...'}
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
              <h1>News and Announcements</h1>
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
              statusFilter={urlState.statusFilter}
              onStatusFilterChange={urlState.handleStatusFilterChange}
              showCount={urlState.showCount}
              onShowCountChange={urlState.handleShowCountChange}
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
                onView={modals.handleView}
                onArchive={modals.handleArchive}
                onUnarchive={modals.handleUnarchive}
                onBulkDelete={modals.handleBulkDeleteRequest}
                onSelectionChange={handleSelectionChange}
                selectedItems={modals.selectedItems}
                itemsPerPage={urlState.showCount}
              />
            )}
          </>
        ) : modals.pageMode === 'create' ? (
          <>
            <CreatePostForm
              onSubmit={handleSubmitNews}
              isSubmitting={newsOperations.isSubmitting}
              existingNews={news || []}
              onCancel={modals.handleListMode}
              headerTitle="Create New Post"
            />
          </>
        ) : modals.pageMode === 'edit' ? (
          <>
            <CreatePostForm
              onSubmit={handleSubmitNews}
              isSubmitting={newsOperations.isSubmitting}
              initialData={modals.editingNews}
              isEditMode={true}
              existingNews={news || []}
              onCancel={modals.handleListMode}
              headerTitle="Edit Post"
            />
          </>
        ) : null}

      {/* View Details Modal */}
      {modals.showViewModal && (
        <ViewDetailsModal
          news={modals.viewingNews}
          onClose={modals.handleCloseViewModal}
        />
      )}

      {/* Delete News Modal */}
      <ConfirmationModal
          isOpen={modals.isDeleteModalOpen}
          itemName={modals.getDeleteModalItemName()}
        itemType="news"
          onConfirm={handleDeleteConfirm}
          onCancel={modals.handleCloseDeleteModal}
          isDeleting={newsOperations.isDeleting}
      />

      {/* Archive News Modal */}
      <ConfirmationModal
        isOpen={modals.showArchiveModal}
        itemName={modals.archivingNews?.title}
        itemType="news"
        actionType="archive"
        onConfirm={handleArchiveConfirm}
        onCancel={modals.handleCloseArchiveModal}
        isLoading={newsOperations.isDeleting}
      />

      {/* Unarchive News Modal */}
      <ConfirmationModal
        isOpen={modals.showUnarchiveModal}
        itemName={modals.unarchivingNews?.title}
        itemType="news"
        actionType="unarchive"
        onConfirm={handleUnarchiveConfirm}
        onCancel={modals.handleCloseUnarchiveModal}
        isLoading={newsOperations.isDeleting}
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
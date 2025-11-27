import { useState, useCallback } from 'react';

/**
 * Custom hook for managing news modal states and handlers
 * @param {object} urlState - URL state from useNewsURL hook (optional)
 * @returns {object} Modal states and handlers
 */
export const useNewsModals = (urlState = null) => {
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [viewingNews, setViewingNews] = useState(null);
  const [editingNews, setEditingNews] = useState(null);
  const [deletingNews, setDeletingNews] = useState(null);
  const [archivingNews, setArchivingNews] = useState(null);
  const [unarchivingNews, setUnarchivingNews] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  // Page mode state - initialize from URL if available
  const [pageMode, setPageMode] = useState(() => {
    if (urlState?.isCreateMode) return 'create';
    if (urlState?.editId) return 'edit';
    return 'list';
  });

  // Handle edit action - updates URL parameter
  const handleEdit = useCallback((newsItem) => {
    setEditingNews(newsItem);
    setPageMode('edit');
    // Update URL parameter
    if (urlState?.updateURLParams && newsItem?.id) {
      urlState.updateURLParams({ edit: newsItem.id.toString() });
    }
  }, [urlState]);

  // Handle delete action
  const handleDelete = useCallback((newsItem) => {
    setDeletingNews(newsItem);
    setShowDeleteModal(true);
  }, []);

  // Handle view action
  const handleView = useCallback((newsItem) => {
    setViewingNews(newsItem);
    setShowViewModal(true);
  }, []);

  // Handle close view modal
  const handleCloseViewModal = useCallback(() => {
    setShowViewModal(false);
    setViewingNews(null);
  }, []);

  // Handle bulk delete request
  const handleBulkDeleteRequest = useCallback((selectedNewsIds) => {
    setSelectedItems(selectedNewsIds);
    setShowDeleteModal(true);
  }, []);

  // Handle bulk archive request
  const handleBulkArchiveRequest = useCallback((selectedNewsIds) => {
    setSelectedItems(selectedNewsIds);
    setShowArchiveModal(true);
  }, []);

  // Handle bulk unarchive request
  const handleBulkUnarchiveRequest = useCallback((selectedNewsIds) => {
    setSelectedItems(selectedNewsIds);
    setUnarchivingNews(null); // Clear single unarchive to indicate bulk operation
    setShowUnarchiveModal(true);
  }, []);

  // Handle archive action
  const handleArchive = useCallback((newsItem) => {
    setArchivingNews(newsItem);
    setShowArchiveModal(true);
  }, []);

  // Handle close archive modal
  const handleCloseArchiveModal = useCallback(() => {
    setShowArchiveModal(false);
    setArchivingNews(null);
    // Clear selected items if closing after bulk archive operation
    setSelectedItems(prev => {
      // Only clear if there are selected items (indicating it was a bulk operation)
      // Single archive operations don't set selectedItems
      return prev.length > 0 ? [] : prev;
    });
  }, []);

  // Handle unarchive action
  const handleUnarchive = useCallback((newsItem) => {
    setUnarchivingNews(newsItem);
    setShowUnarchiveModal(true);
  }, []);

  // Handle close unarchive modal
  const handleCloseUnarchiveModal = useCallback(() => {
    setShowUnarchiveModal(false);
    setUnarchivingNews(null);
    // Clear selected items if closing after bulk unarchive operation
    setSelectedItems(prev => {
      // Only clear if there are selected items (indicating it was a bulk operation)
      // Single unarchive operations don't set selectedItems
      return prev.length > 0 ? [] : prev;
    });
  }, []);

  // Handle close all modals
  const handleCloseModals = useCallback(() => {
    setShowDeleteModal(false);
    setShowViewModal(false);
    setShowArchiveModal(false);
    setShowUnarchiveModal(false);
    setViewingNews(null);
    setEditingNews(null);
    setDeletingNews(null);
    setArchivingNews(null);
    setUnarchivingNews(null);
    setSelectedItems([]);
  }, []);

  // Handle create mode - updates URL parameter
  const handleCreateMode = useCallback(() => {
    setPageMode('create');
    setEditingNews(null);
    // Update URL parameter
    if (urlState?.updateURLParams) {
      urlState.updateURLParams({ create: 'true' });
    }
  }, [urlState]);

  // Handle list mode - clears URL parameters
  const handleListMode = useCallback(() => {
    setPageMode('list');
    setEditingNews(null);
    // Clear edit and create parameters from URL
    if (urlState?.updateURLParams) {
      urlState.updateURLParams({ edit: '', create: '' });
    }
  }, [urlState]);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setDeletingNews(null);
    setSelectedItems([]);
  }, []);

  // Check if delete modal should be open
  const isDeleteModalOpen = showDeleteModal && (!!deletingNews || selectedItems.length > 0);

  // Get delete modal item name
  const getDeleteModalItemName = useCallback(() => {
    if (deletingNews) {
      return deletingNews.title;
    }
    if (selectedItems.length > 0) {
      return `${selectedItems.length} selected news items`;
    }
    return '';
  }, [deletingNews, selectedItems]);

  // Get archive modal item name
  const getArchiveModalItemName = useCallback(() => {
    if (archivingNews) {
      return archivingNews.title;
    }
    if (selectedItems.length > 0) {
      return `${selectedItems.length} selected news items`;
    }
    return '';
  }, [archivingNews, selectedItems]);

  return {
    // Modal states
    showDeleteModal,
    showViewModal,
    showArchiveModal,
    showUnarchiveModal,
    viewingNews,
    editingNews,
    deletingNews,
    archivingNews,
    unarchivingNews,
    selectedItems,
    pageMode,
    isDeleteModalOpen,
    
    // Modal handlers
    handleEdit,
    handleDelete,
    handleView,
    handleArchive,
    handleUnarchive,
    handleCloseViewModal,
    handleCloseArchiveModal,
    handleCloseUnarchiveModal,
    handleBulkDeleteRequest,
    handleBulkArchiveRequest,
    handleBulkUnarchiveRequest,
    handleCloseModals,
    handleCreateMode,
    handleListMode,
    handleCloseDeleteModal,
    
    // Utility functions
    getDeleteModalItemName,
    getArchiveModalItemName,
    
    // State setters (for direct control if needed)
    setEditingNews,
    setSelectedItems,
    setPageMode
  };
};

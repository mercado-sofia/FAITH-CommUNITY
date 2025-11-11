import { useState, useCallback } from 'react';

/**
 * Custom hook for managing news modal states and handlers
 * @returns {object} Modal states and handlers
 */
export const useNewsModals = () => {
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecentlyDeletedModal, setShowRecentlyDeletedModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [deletingNews, setDeletingNews] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  // Page mode state
  const [pageMode, setPageMode] = useState('list'); // 'list', 'create', or 'edit'

  // Handle edit action
  const handleEdit = useCallback((newsItem) => {
    setEditingNews(newsItem);
    setPageMode('edit');
  }, []);

  // Handle delete action
  const handleDelete = useCallback((newsItem) => {
    setDeletingNews(newsItem);
    setShowDeleteModal(true);
  }, []);

  // Handle bulk delete request
  const handleBulkDeleteRequest = useCallback((selectedNewsIds) => {
    setSelectedItems(selectedNewsIds);
    setShowDeleteModal(true);
  }, []);

  // Handle close all modals
  const handleCloseModals = useCallback(() => {
    setShowDeleteModal(false);
    setShowRecentlyDeletedModal(false);
    setEditingNews(null);
    setDeletingNews(null);
    setSelectedItems([]);
  }, []);

  // Handle create mode
  const handleCreateMode = useCallback(() => {
    setPageMode('create');
    setEditingNews(null);
  }, []);

  // Handle list mode
  const handleListMode = useCallback(() => {
    setPageMode('list');
    setEditingNews(null);
  }, []);

  // Handle recently deleted modal
  const handleShowRecentlyDeleted = useCallback(() => {
    setShowRecentlyDeletedModal(true);
  }, []);

  const handleCloseRecentlyDeleted = useCallback(() => {
    setShowRecentlyDeletedModal(false);
  }, []);

  // Handle delete modal
  const handleShowDeleteModal = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

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

  return {
    // Modal states
    showDeleteModal,
    showRecentlyDeletedModal,
    editingNews,
    deletingNews,
    selectedItems,
    pageMode,
    isDeleteModalOpen,
    
    // Modal handlers
    handleEdit,
    handleDelete,
    handleBulkDeleteRequest,
    handleCloseModals,
    handleCreateMode,
    handleListMode,
    handleShowRecentlyDeleted,
    handleCloseRecentlyDeleted,
    handleShowDeleteModal,
    handleCloseDeleteModal,
    
    // Utility functions
    getDeleteModalItemName,
    
    // State setters (for direct control if needed)
    setEditingNews,
    setSelectedItems,
    setPageMode
  };
};

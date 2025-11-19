import { useState, useCallback } from 'react';

/**
 * Custom hook for managing news modal states and handlers
 * @returns {object} Modal states and handlers
 */
export const useNewsModals = () => {
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

  // Handle archive action
  const handleArchive = useCallback((newsItem) => {
    setArchivingNews(newsItem);
    setShowArchiveModal(true);
  }, []);

  // Handle close archive modal
  const handleCloseArchiveModal = useCallback(() => {
    setShowArchiveModal(false);
    setArchivingNews(null);
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
    handleCloseModals,
    handleCreateMode,
    handleListMode,
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

import { useState, useCallback } from 'react';

export const useModalManagement = () => {
  const [pageMode, setPageMode] = useState('list'); // 'list', 'create', or 'edit'
  const [editingProgram, setEditingProgram] = useState(null);
  const [viewingProgram, setViewingProgram] = useState(null);
  const [deletingProgram, setDeletingProgram] = useState(null);
  const [selectedCollaboration, setSelectedCollaboration] = useState(null);
  const [isCollaborationModalOpen, setIsCollaborationModalOpen] = useState(false);
  const [refreshCollaboratorsFn, setRefreshCollaboratorsFn] = useState(null);

  // Handle program view - show modal
  const handleViewProgram = useCallback((program) => {
    setViewingProgram(program);
  }, []);


  const handleEditProgram = useCallback((program) => {
    setEditingProgram(program);
    setPageMode('edit');
  }, []);

  const handleDeleteProgram = useCallback((program) => {
    setDeletingProgram(program);
  }, []);

  // Cancel program deletion
  const cancelDeleteProgram = useCallback(() => {
    setDeletingProgram(null);
  }, []);

  // Close view modal
  const closeViewModal = useCallback(() => {
    setViewingProgram(null);
  }, []);

  // Handle collaboration view
  const handleViewCollaboration = useCallback((collaboration) => {
    setSelectedCollaboration(collaboration);
    setIsCollaborationModalOpen(true);
  }, []);

  // Close collaboration modal
  const closeCollaborationModal = useCallback(() => {
    setIsCollaborationModalOpen(false);
    setSelectedCollaboration(null);
  }, []);

  // Reset edit mode
  const resetEditMode = useCallback(() => {
    setPageMode('list');
    setEditingProgram(null);
    setRefreshCollaboratorsFn(null);
  }, []);

  return {
    // State
    pageMode,
    editingProgram,
    viewingProgram,
    deletingProgram,
    selectedCollaboration,
    isCollaborationModalOpen,
    refreshCollaboratorsFn,
    
    // Setters
    setPageMode,
    setEditingProgram,
    setViewingProgram,
    setDeletingProgram,
    setSelectedCollaboration,
    setIsCollaborationModalOpen,
    setRefreshCollaboratorsFn,
    
    // Handlers
    handleViewProgram,
    handleEditProgram,
    handleDeleteProgram,
    cancelDeleteProgram,
    closeViewModal,
    handleViewCollaboration,
    closeCollaborationModal,
    resetEditMode
  };
};

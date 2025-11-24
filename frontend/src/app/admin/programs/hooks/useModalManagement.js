import { useState, useCallback } from 'react';

export const useModalManagement = () => {
  const [pageMode, setPageMode] = useState('list'); // 'list', 'create', or 'edit'
  const [editingProgram, setEditingProgram] = useState(null);
  const [viewingProgram, setViewingProgram] = useState(null);
  const [deletingProgram, setDeletingProgram] = useState(null);
  const [archivingProgram, setArchivingProgram] = useState(null);
  const [unarchivingProgram, setUnarchivingProgram] = useState(null);
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

  // Handle program archiving
  const handleArchiveProgram = useCallback((program) => {
    setArchivingProgram(program);
  }, []);

  // Cancel program archiving
  const cancelArchiveProgram = useCallback(() => {
    setArchivingProgram(null);
  }, []);

  // Handle program unarchiving
  const handleUnarchiveProgram = useCallback((program) => {
    setUnarchivingProgram(program);
  }, []);

  // Cancel program unarchiving
  const cancelUnarchiveProgram = useCallback(() => {
    setUnarchivingProgram(null);
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
    archivingProgram,
    unarchivingProgram,
    selectedCollaboration,
    isCollaborationModalOpen,
    refreshCollaboratorsFn,
    
    // Setters
    setPageMode,
    setEditingProgram,
    setViewingProgram,
    setDeletingProgram,
    setArchivingProgram,
    setUnarchivingProgram,
    setSelectedCollaboration,
    setIsCollaborationModalOpen,
    setRefreshCollaboratorsFn,
    
    // Handlers
    handleViewProgram,
    handleEditProgram,
    handleDeleteProgram,
    cancelDeleteProgram,
    handleArchiveProgram,
    cancelArchiveProgram,
    handleUnarchiveProgram,
    cancelUnarchiveProgram,
    closeViewModal,
    handleViewCollaboration,
    closeCollaborationModal,
    resetEditMode
  };
};

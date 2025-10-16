'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { useAdminPrograms } from '../hooks/useAdminData';
import { useCollaborationRequests } from './hooks';
import { ViewDetailsModal, ProgramsContainer, CollaborationsContainer, SearchAndFilterControls } from './components';
import ProgramForm from './components/ProgramForm/ProgramForm';
import { SkeletonLoader } from '../components';
import { ConfirmationModal } from '@/components';
import { SuccessModal } from '@/components';
import { useProgramsManagement, useProgramFilters, useModalManagement, useCollaborationManagement } from './hooks';
import styles from './programs.module.css';
import { FaPlus } from 'react-icons/fa';

export default function AdminProgramsPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });

  // Use SWR hook for programs data
  const { programs = [], isLoading, error, mutate: refreshPrograms } = useAdminPrograms();
  
  // Use collaboration requests hook
  const { 
    collaborations, 
    isLoading: collaborationsLoading, 
    error: collaborationsError, 
    acceptCollaboration, 
    declineCollaboration,
    fetchCollaborations
  } = useCollaborationRequests();
  
  // Show skeleton immediately on first load, then show content when data is ready
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Mark as initially loaded when data is available
  useEffect(() => {
    if (!isLoading && programs.length >= 0) {
      setHasInitiallyLoaded(true);
    }
  }, [isLoading, programs.length]);

  // Handle error display
  useEffect(() => {
    if (error) {
      setSuccessModal({ 
        isVisible: true, 
        message: 'Failed to load programs. Please try again.', 
        type: 'error' 
      });
    }
  }, [error]);

  // Handle collaboration error display
  useEffect(() => {
    if (collaborationsError) {
      setSuccessModal({ 
        isVisible: true, 
        message: 'Failed to load collaborations. Please try again.', 
        type: 'error' 
      });
    }
  }, [collaborationsError]);

  // Use custom hooks
  const modals = useModalManagement();
  const programsManagement = useProgramsManagement(currentAdmin, refreshPrograms, setSuccessModal, () => modals.setPageMode('list'), modals.cancelDeleteProgram);
  const filters = useProgramFilters(programs, collaborations);
  const collaborationManagement = useCollaborationManagement(
    acceptCollaboration,
    declineCollaboration,
    fetchCollaborations,
    refreshPrograms,
    setSuccessModal
  );

  // Close success modal
  const closeSuccessModal = () => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  };

  // Handle opt-out callback - refresh both programs and collaborators
  const handleOptOut = (programIdToRemove) => {
    collaborationManagement.handleOptOut(programIdToRemove, modals.refreshCollaboratorsFn, modals.pageMode);
  };

  // Handle collaboration action with modal close
  const handleCollaborationActionWithClose = (collaborationId, action) => {
    collaborationManagement.handleCollaborationAction(collaborationId, action);
    modals.closeCollaborationModal();
  };

  // Show skeleton immediately on first load or when loading
  if (!hasInitiallyLoaded || isLoading || (filters.statusFilter === 'Collaborations' && collaborationsLoading)) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1>Programs</h1>
          </div>
        </div>
        
        <SkeletonLoader type="grid" count={6} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {modals.pageMode === 'list' ? (
        <>
          {/* Header Section - Consistent with other admin pages */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <h1>Programs</h1>
              <button 
                onClick={() => modals.setPageMode('create')}
                className={styles.addButton}
              >
                <FaPlus /> Add Program
              </button>
            </div>
          </div>

          {/* Search and Filter Controls - Show for all tabs including Collaborations */}
          <SearchAndFilterControls
            searchQuery={filters.searchQuery}
            sortBy={filters.sortBy}
            onSearchChange={filters.handleSearchChange}
            onFilterChange={filters.handleFilterChange}
            // Collaboration-specific props
            isCollaborationTab={filters.statusFilter === 'Collaborations'}
            collaborationStatusFilter={filters.collaborationStatusFilter}
            onCollaborationStatusChange={filters.handleCollaborationStatusChange}
          />

          {/* Status Navigation Tabs */}
          <div className={styles.statusTabs}>
            {['Active', 'Upcoming', 'Completed', 'Collaborations'].map((status) => (
              <button
                key={status}
                className={`${styles.statusTab} ${filters.statusFilter === status ? styles.activeTab : ''}`}
                onClick={() => filters.handleFilterChange('status', status)}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Programs Grid or Collaborations Section */}
          {filters.statusFilter === 'Collaborations' ? (
            <CollaborationsContainer
              filteredCollaborations={filters.filteredAndSortedCollaborations()}
              collaborationStatusFilter={filters.collaborationStatusFilter}
              onViewCollaboration={modals.handleViewCollaboration}
              onShowSuccessModal={setSuccessModal}
              onAcceptCollaboration={acceptCollaboration}
              onDeclineCollaboration={declineCollaboration}
            />
          ) : (
            <ProgramsContainer
              filteredPrograms={filters.filteredAndSortedPrograms()}
              onViewDetails={modals.handleViewProgram}
              onEdit={modals.handleEditProgram}
              onDelete={modals.handleDeleteProgram}
              onMarkCompleted={programsManagement.handleMarkCompleted}
              onMarkActive={programsManagement.handleMarkActive}
              onOptOut={handleOptOut}
              onShowSuccessModal={setSuccessModal}
              onToggleVolunteerAcceptance={programsManagement.handleToggleVolunteerAcceptance}
            />
          )}
        </>
      ) : modals.pageMode === 'create' ? (
        <>
          <div className={styles.createPostHeader}>
            <h1>Add New Program</h1>
          </div>
          <ProgramForm
            mode="create"
            onCancel={() => modals.setPageMode('list')}
            onSubmit={programsManagement.handleSubmitProgram}
          />
        </>
      ) : modals.pageMode === 'edit' ? (
        <>
          <div className={styles.createPostHeader}>
            <h1>Edit Program</h1>
          </div>
          <ProgramForm
            mode="edit"
            program={modals.editingProgram}
            onCancel={modals.resetEditMode}
            onSubmit={(programData) => programsManagement.handleUpdateProgram(programData, modals.editingProgram)}
            onRefreshCollaborators={modals.setRefreshCollaboratorsFn}
          />
        </>
      ) : null}

      {/* Modals */}
      {modals.viewingProgram && (
        <ViewDetailsModal
          program={modals.viewingProgram}
          onClose={modals.closeViewModal}
          mode="view"
        />
      )}

      {/* Collaboration Modal */}
      {modals.isCollaborationModalOpen && modals.selectedCollaboration && (
        <ViewDetailsModal
          collaboration={modals.selectedCollaboration}
          onClose={modals.closeCollaborationModal}
          mode="collaboration"
          onAccept={() => {
            handleCollaborationActionWithClose(modals.selectedCollaboration.collaboration_id, 'accept');
          }}
          onDecline={() => {
            handleCollaborationActionWithClose(modals.selectedCollaboration.collaboration_id, 'decline');
          }}
        />
      )}

      <ConfirmationModal
        isOpen={!!modals.deletingProgram}
        itemName={modals.deletingProgram?.title || 'this program'}
        itemType="program"
        onConfirm={() => programsManagement.confirmDeleteProgram(modals.deletingProgram)}
        onCancel={modals.cancelDeleteProgram}
        isDeleting={programsManagement.isDeleting}
      />

      {/* Success Modal */}
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={closeSuccessModal}
        type={successModal.type}
        autoHideDuration={4000}
      />
    </div>
  );
}
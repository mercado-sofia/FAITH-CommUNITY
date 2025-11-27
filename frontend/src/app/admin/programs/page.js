'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'next/navigation';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { useAdminPrograms, useArchivedPrograms } from '@/hooks/admin/useAdminData';
import { useCollaborationRequests } from './hooks';
import { ViewDetailsModal, ProgramsContainer, CollaborationsContainer, SearchAndFilterControls } from './components';
import ProgramForm from './components/ProgramForm/ProgramForm';
import { SkeletonLoader } from '../components';
import { ConfirmationModal, ErrorBoundary, SuccessModal } from '@/components';
import { handleApiError } from '@/utils/admin/errorHandler';
import { TIMEOUTS } from '@/utils/admin/constants';
import { useProgramsManagement, useProgramFilters, useModalManagement, useCollaborationManagement } from './hooks';
import styles from './programs.module.css';
import { FaPlus, FaUsers } from 'react-icons/fa';
import { FiArchive } from 'react-icons/fi';
import { IoMdCheckboxOutline } from 'react-icons/io';
import { LuCalendarClock } from 'react-icons/lu';
import { HiLightningBolt } from 'react-icons/hi';

export default function AdminProgramsPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const searchParams = useSearchParams();
  
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });

  // Use SWR hook for programs data
  const { programs = [], isLoading, error, mutate: refreshPrograms } = useAdminPrograms();
  
  // Fetch archived programs when archive tab is active
  const { programs: archivedPrograms = [], isLoading: archivedLoading, mutate: refreshArchivedPrograms } = useArchivedPrograms(currentAdmin?.org);
  
  // Use collaboration requests hook
  const { 
    collaborations, 
    isLoading: collaborationsLoading, 
    error: collaborationsError, 
    acceptCollaboration, 
    declineCollaboration,
    fetchCollaborations
  } = useCollaborationRequests();
  
  // Get the appropriate programs list based on active tab (must be before useEffect that uses them)
  const activeTabFromUrl = searchParams.get('tab') || 'active';
  const allPrograms = activeTabFromUrl === 'archived' ? archivedPrograms : programs;
  const allProgramsLoading = activeTabFromUrl === 'archived' ? archivedLoading : isLoading;
  
  // Show skeleton immediately on first load, then show content when data is ready
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Mark as initially loaded when data is available
  useEffect(() => {
    if (!allProgramsLoading && allPrograms.length >= 0) {
      setHasInitiallyLoaded(true);
    }
  }, [allProgramsLoading, allPrograms.length]);

  // Handle error display
  useEffect(() => {
    if (error) {
      const errorInfo = handleApiError(error, 'programs_load', {
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

  // Handle collaboration error display
  useEffect(() => {
    if (collaborationsError) {
      const errorInfo = handleApiError(collaborationsError, 'collaborations_load', {
        redirectOnAuth: true,
        logError: true
      });
      setSuccessModal({ 
        isVisible: true, 
        message: errorInfo.message, 
        type: 'error' 
      });
    }
  }, [collaborationsError]);

  // Use custom hooks
  const modals = useModalManagement();
  
  // Create a refresh function that refreshes both regular and archived programs
  const refreshAllPrograms = useCallback(() => {
    refreshPrograms();
    if (currentAdmin?.org) {
      refreshArchivedPrograms();
    }
  }, [refreshPrograms, refreshArchivedPrograms, currentAdmin?.org]);
  
  const programsManagement = useProgramsManagement(
    currentAdmin, 
    refreshAllPrograms, 
    setSuccessModal, 
    () => modals.setPageMode('list'), 
    modals.cancelDeleteProgram,
    modals.cancelArchiveProgram,
    modals.cancelUnarchiveProgram
  );
  
  const filters = useProgramFilters(allPrograms, collaborations);
  const collaborationManagement = useCollaborationManagement(
    acceptCollaboration,
    declineCollaboration,
    fetchCollaborations,
    refreshPrograms,
    setSuccessModal
  );

  // Close success modal (memoized)
  const closeSuccessModal = useCallback(() => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  }, []);

  // Handle opt-out callback - refresh both programs and collaborators (memoized)
  const handleOptOut = useCallback((programIdToRemove) => {
    collaborationManagement.handleOptOut(programIdToRemove, modals.refreshCollaboratorsFn, modals.pageMode);
  }, [collaborationManagement, modals.refreshCollaboratorsFn, modals.pageMode]);


  // Show skeleton immediately on first load or when loading
  if (!hasInitiallyLoaded || allProgramsLoading || (filters.activeTab === 'collaborations' && collaborationsLoading)) {
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
    <ErrorBoundary>
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
            isCollaborationTab={filters.activeTab === 'collaborations'}
            collaborationStatusFilter={filters.collaborationStatusFilter}
            onCollaborationStatusChange={filters.handleCollaborationStatusChange}
            // Count props
            totalCount={filters.activeTab === 'collaborations' ? collaborations?.length || 0 : allPrograms?.length || 0}
            filteredCount={filters.activeTab === 'collaborations' ? filters.filteredAndSortedCollaborations()?.length || 0 : filters.filteredAndSortedPrograms()?.length || 0}
          />

          {/* Status Navigation Tabs */}
          <div className={styles.statusTabs}>
            {[
              { key: 'active', label: 'Active', icon: <HiLightningBolt /> },
              { key: 'upcoming', label: 'Upcoming', icon: <LuCalendarClock /> },
              { key: 'completed', label: 'Completed', icon: <IoMdCheckboxOutline /> },
              { key: 'collaborations', label: 'Collaborations', icon: <FaUsers /> },
              { key: 'archived', label: 'Archived', icon: <FiArchive /> }
            ].map((tab) => {
              const isActive = filters.activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  className={`${styles.statusTab} ${isActive ? styles.activeTab : ''}`}
                  onClick={() => {
                    filters.handleTabChange(tab.key);
                  }}
                >
                  {tab.icon && (
                    <span className={styles.statusTabIcon}>
                      {tab.icon}
                    </span>
                  )}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Programs Grid or Collaborations Section */}
          {filters.activeTab === 'collaborations' ? (
            <CollaborationsContainer
              filteredCollaborations={filters.filteredAndSortedCollaborations()}
              collaborationStatusFilter={filters.collaborationStatusFilter}
              onViewCollaboration={modals.handleViewCollaboration}
              onShowSuccessModal={setSuccessModal}
              onAcceptCollaboration={acceptCollaboration}
              onDeclineCollaboration={declineCollaboration}
              onEditProgram={modals.handleEditProgram}
              onOptOut={handleOptOut}
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
              onArchive={modals.handleArchiveProgram}
              onUnarchive={modals.handleUnarchiveProgram}
            />
          )}
        </>
      ) : modals.pageMode === 'create' ? (
        <ProgramForm
          mode="create"
          headerTitle="Add New Program"
          onCancel={() => modals.setPageMode('list')}
          onSubmit={programsManagement.handleSubmitProgram}
        />
      ) : modals.pageMode === 'edit' ? (
        <ProgramForm
          mode="edit"
          headerTitle="Edit Program"
          program={modals.editingProgram}
          onCancel={modals.resetEditMode}
          onSubmit={(programData) => programsManagement.handleUpdateProgram(programData, modals.editingProgram)}
          onRefreshCollaborators={modals.setRefreshCollaboratorsFn}
        />
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

      <ConfirmationModal
        isOpen={!!modals.archivingProgram}
        itemName={modals.archivingProgram?.title || 'this program'}
        itemType="program"
        actionType="archive"
        customMessage={`Are you sure you want to archive "${modals.archivingProgram?.title || 'this program'}"? This will hide the program from the public portal, but it will still be visible in your admin interface. You can unarchive it later if needed.`}
        onConfirm={() => programsManagement.handleArchiveProgram(modals.archivingProgram?.id)}
        onCancel={modals.cancelArchiveProgram}
        isLoading={programsManagement.isDeleting}
      />

      <ConfirmationModal
        isOpen={!!modals.unarchivingProgram}
        itemName={modals.unarchivingProgram?.title || 'this program'}
        itemType="program"
        actionType="unarchive"
        customMessage={`Are you sure you want to unarchive "${modals.unarchivingProgram?.title || 'this program'}"? This will restore the program and make it visible on the public portal again.`}
        onConfirm={() => programsManagement.handleUnarchiveProgram(modals.unarchivingProgram?.id)}
        onCancel={modals.cancelUnarchiveProgram}
        isLoading={programsManagement.isDeleting}
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
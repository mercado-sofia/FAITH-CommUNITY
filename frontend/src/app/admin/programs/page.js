'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams, useRouter } from 'next/navigation';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { useAdminPrograms } from '@/hooks/admin/useAdminData';
import { useCollaborationRequests } from '@/hooks/admin/useCollaborationRequests';
import { ViewDetailsModal, ProgramsContainer, CollaborationsContainer, SearchAndFilterControls } from './components';
import ProgramForm from './components/ProgramForm/ProgramForm';
import { SkeletonLoader } from '../components';
import { ConfirmationModal, ErrorBoundary, SuccessModal } from '@/components';
import { handleApiError } from '@/utils/admin/errorHandler';
import { TIMEOUTS } from '@/utils/admin/constants';
import { useProgramsManagement } from '@/hooks/admin/useProgramsManagement';
import { useProgramFilters } from '@/hooks/admin/useProgramFilters';
import { useModalManagement } from '@/hooks/admin/useModalManagement';
import { useCollaborationManagement } from '@/hooks/admin/useCollaborationManagement';
import styles from './programs.module.css';
import { FaPlus, FaUsers } from 'react-icons/fa';
import { FiArchive } from 'react-icons/fi';
import { IoMdCheckboxOutline } from 'react-icons/io';
import { LuCalendarClock } from 'react-icons/lu';
import { HiLightningBolt } from 'react-icons/hi';
import { usePortalDemoMode } from '@/hooks/shared/usePortalDemoMode';
import { DEMO_READONLY_MESSAGE } from '@/config/portalDemo';

export default function AdminProgramsPage() {
  const { isReadOnly } = usePortalDemoMode();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const searchParams = useSearchParams();
  const router = useRouter();
  
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
  
  // Get the appropriate programs list
  const allPrograms = programs;
  const allProgramsLoading = isLoading;
  
  // Redirect to archive page if someone tries to access archived tab via URL
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab === 'archived') {
      router.push('/admin/programs/archive');
    }
  }, [searchParams, router]);
  
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
  
  // Create a refresh function that refreshes programs
  const refreshAllPrograms = useCallback(() => {
    refreshPrograms();
  }, [refreshPrograms]);
  
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
              <div>
                <h1>Programs</h1>
                <div className={styles.resultsCount}>
                  {filters.activeTab === 'collaborations' ? (
                    filters.filteredAndSortedCollaborations()?.length === (collaborations?.length || 0) ? (
                      <span>{collaborations?.length || 0} collaboration{(collaborations?.length || 0) !== 1 ? 's' : ''}</span>
                    ) : (
                      <span>{filters.filteredAndSortedCollaborations()?.length || 0} of {collaborations?.length || 0} collaborations</span>
                    )
                  ) : (
                    filters.filteredAndSortedPrograms()?.length === (allPrograms?.length || 0) ? (
                      <span>{allPrograms?.length || 0} program{allPrograms?.length !== 1 ? 's' : ''}</span>
                    ) : (
                      <span>{filters.filteredAndSortedPrograms()?.length || 0} of {allPrograms?.length || 0} programs</span>
                    )
                  )}
                </div>
              </div>
              <button 
                onClick={() => modals.setPageMode('create')}
                className={styles.addButton}
                disabled={isReadOnly}
                title={isReadOnly ? DEMO_READONLY_MESSAGE : undefined}
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
            archiveButton={
              <button
                className={styles.archiveToggleButton}
                onClick={() => router.push('/admin/programs/archive')}
                title="View Archived Programs"
              >
                <FiArchive className={styles.archiveIcon} />
                Archive
              </button>
            }
          />

          {/* Status Navigation Tabs */}
          <div className={styles.statusTabs}>
            <div className={styles.statusTabsLeft}>
              {[
                { key: 'active', label: 'Active', icon: <HiLightningBolt /> },
                { key: 'upcoming', label: 'Upcoming', icon: <LuCalendarClock /> },
                { key: 'completed', label: 'Completed', icon: <IoMdCheckboxOutline /> },
                { key: 'collaborations', label: 'Collaborations', icon: <FaUsers /> }
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
          isOpen={!!modals.viewingProgram}
          portal="admin"
          mode="view"
          onClose={modals.closeViewModal}
          onArchive={programsManagement.handleArchiveProgram}
          onUnarchive={programsManagement.handleUnarchiveProgram}
        />
      )}

      {/* Collaboration Modal */}
      {modals.isCollaborationModalOpen && modals.selectedCollaboration && (
        <ViewDetailsModal
          collaboration={modals.selectedCollaboration}
          isOpen={modals.isCollaborationModalOpen}
          portal="admin"
          mode="collaboration"
          onClose={modals.closeCollaborationModal}
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
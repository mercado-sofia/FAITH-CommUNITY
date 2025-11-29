'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { useArchivedPrograms } from '@/hooks/admin/useAdminData';
import { ViewDetailsModal, ProgramsContainer, SearchAndFilterControls } from '../components';
import ProgramForm from '../components/ProgramForm/ProgramForm';
import { SkeletonLoader } from '../../components';
import { ConfirmationModal, ErrorBoundary, SuccessModal } from '@/components';
import { handleApiError } from '@/utils/admin/errorHandler';
import { TIMEOUTS } from '@/utils/admin/constants';
import { useProgramsManagement } from '@/hooks/admin/useProgramsManagement';
import { useModalManagement } from '@/hooks/admin/useModalManagement';
import { filterAndSortPrograms } from '@/utils/admin/programUtils';
import styles from '../programs.module.css';
import { FiArrowLeft } from 'react-icons/fi';

export default function ArchiveProgramsPage() {
  const router = useRouter();
  const currentAdmin = useSelector(selectCurrentAdmin);
  
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Use SWR hook for archived programs data
  const { programs: archivedPrograms = [], isLoading: loading, error, mutate: refreshArchivedPrograms } = useArchivedPrograms(
    currentAdmin?.org && currentAdmin.org !== '' ? currentAdmin.org : null
  );

  // Show skeleton immediately on first load, then show content when data is ready
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Mark as initially loaded when data is available
  useEffect(() => {
    if (!loading && archivedPrograms.length >= 0) {
      setHasInitiallyLoaded(true);
    }
  }, [loading, archivedPrograms.length]);

  // Use custom hooks
  const modals = useModalManagement();
  
  // Create a refresh function
  const refreshAllPrograms = useCallback(() => {
    refreshArchivedPrograms();
  }, [refreshArchivedPrograms]);
  
  const programsManagement = useProgramsManagement(
    currentAdmin, 
    refreshAllPrograms, 
    setSuccessModal, 
    () => modals.setPageMode('list'), 
    modals.cancelDeleteProgram,
    modals.cancelArchiveProgram,
    modals.cancelUnarchiveProgram
  );

  // Filter and sort archived programs
  const filteredAndSortedPrograms = useCallback(() => {
    return filterAndSortPrograms(archivedPrograms, searchQuery, null, sortBy, []);
  }, [archivedPrograms, searchQuery, sortBy]);

  // Handle error display
  useEffect(() => {
    if (error) {
      const errorInfo = handleApiError(error, 'archived_programs_load', {
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

  // Close success modal (memoized)
  const closeSuccessModal = useCallback(() => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((filterType, value) => {
    if (filterType === 'sort') {
      setSortBy(value);
    }
  }, []);

  // Show skeleton immediately on first load or when loading
  if (!hasInitiallyLoaded || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1>Archives</h1>
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
            {/* Header Section */}
            <div className={styles.header}>
              <div className={styles.headerTop}>
                <h1>Archives</h1>
                <button
                  onClick={() => router.push('/admin/programs')}
                  className={styles.addButton}
                  title="Go back to Programs"
                >
                  <FiArrowLeft /> Go back
                </button>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <SearchAndFilterControls
              searchQuery={searchQuery}
              sortBy={sortBy}
              onSearchChange={handleSearchChange}
              onFilterChange={handleFilterChange}
            />

            {/* Programs Grid */}
            <ProgramsContainer
              filteredPrograms={filteredAndSortedPrograms()}
              onViewDetails={modals.handleViewProgram}
              onEdit={modals.handleEditProgram}
              onDelete={modals.handleDeleteProgram}
              onMarkCompleted={programsManagement.handleMarkCompleted}
              onMarkActive={programsManagement.handleMarkActive}
              onShowSuccessModal={setSuccessModal}
              onToggleVolunteerAcceptance={programsManagement.handleToggleVolunteerAcceptance}
              onArchive={modals.handleArchiveProgram}
              onUnarchive={modals.handleUnarchiveProgram}
              emptyStateTitle="No archived programs found"
              emptyStateText="You don't have any archived programs yet. Archived programs will appear here."
            />
          </>
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

        <ConfirmationModal
          isOpen={!!modals.deletingProgram}
          itemName={modals.deletingProgram?.title || 'this program'}
          itemType="program"
          onConfirm={() => programsManagement.confirmDeleteProgram(modals.deletingProgram)}
          onCancel={modals.cancelDeleteProgram}
          isDeleting={programsManagement.isDeleting}
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


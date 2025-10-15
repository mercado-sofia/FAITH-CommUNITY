'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { useAdminPrograms } from '../hooks/useAdminData';
import { ProgramCard, ViewDetailsModal } from './components';
import ViewVolunteersModal from './components/ViewVolunteersModal';
import { CollaborationsSection } from './components/CollaborationsSection';
import ProgramForm from './components/ProgramForm/ProgramForm';
import { SkeletonLoader } from '../components';
import { ConfirmationModal } from '@/components';
import { SuccessModal } from '@/components';
import { SearchAndFilterControls } from './components';
import styles from './programs.module.css';
import { FaPlus } from 'react-icons/fa';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AdminProgramsPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [pageMode, setPageMode] = useState('list'); // 'list', 'create', or 'edit'
  const [editingProgram, setEditingProgram] = useState(null);
  const [viewingProgram, setViewingProgram] = useState(null);
  const [viewingVolunteersProgram, setViewingVolunteersProgram] = useState(null);
  const [deletingProgram, setDeletingProgram] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshCollaboratorsFn, setRefreshCollaboratorsFn] = useState(null);

  // Use SWR hook for programs data
  const { programs = [], isLoading, error, mutate: refreshPrograms } = useAdminPrograms();
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'Active');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');

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

  // Sync URL parameters with state when URL changes
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const urlSearch = searchParams.get('search');
    const urlSort = searchParams.get('sort');

    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
    if (urlSearch !== null) {
      setSearchQuery(urlSearch);
    }
    if (urlSort) {
      setSortBy(urlSort);
    }
  }, [searchParams]);

  // Handle program submission for approval
  const handleSubmitProgram = async (programData) => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('Submission already in progress, ignoring duplicate request');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (!currentAdmin?.org || !currentAdmin?.id) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Missing organization or admin ID. Please log in again.', 
          type: 'error' 
        });
        return;
      }
      
      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
          type: 'error' 
        });
        return;
      }

      // Use FormData for file uploads
      const formData = new FormData();
      formData.append('title', programData.title);
      formData.append('description', programData.description || '');
      formData.append('category', programData.category || '');
      formData.append('event_start_date', programData.event_start_date || '');
      formData.append('event_end_date', programData.event_end_date || '');
      
      // Add collaborators if any
      if (programData.collaborators && programData.collaborators.length > 0) {
        const collaboratorIds = programData.collaborators.map(collaborator => collaborator.id);
        formData.append('collaborators', JSON.stringify(collaboratorIds));
      }
      
      // Add image if provided
      if (programData.image && programData.image instanceof File) {
        formData.append('image', programData.image);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/program-projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to submit program: ${errorText}`);
      }

      const responseData = await response.json();
      
      // Check if it's a collaborative program
      if (programData.collaborators && programData.collaborators.length > 0) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Collaborative program created successfully! Collaboration requests have been sent to the invited organizations.', 
          type: 'success' 
        });
      } else {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Program created successfully!', 
          type: 'success' 
        });
      }

      setPageMode('list');
      refreshPrograms();
    } catch (error) {
      setSuccessModal({ 
        isVisible: true, 
        message: `Failed to submit program: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle program update
  const handleUpdateProgram = async (programData) => {
    try {
      if (!editingProgram?.id) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Program ID not found. Please try again.', 
          type: 'error' 
        });
        return;
      }

      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
          type: 'error' 
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${editingProgram.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(programData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update program`);
      }

      const result = await response.json();
      
      setSuccessModal({ 
        isVisible: true, 
        message: 'Program updated successfully!', 
        type: 'success' 
      });
      setPageMode('list');
      setEditingProgram(null);
      setRefreshCollaboratorsFn(null);
      refreshPrograms();
    } catch (error) {
      setSuccessModal({ 
        isVisible: true, 
        message: `Failed to update program: ${error.message}`, 
        type: 'error' 
      });
    }
  };

  // Handle program view - show modal
  const handleViewProgram = (program) => {
    setViewingProgram(program);
  };

  // Handle volunteers view - show modal
  const handleViewVolunteers = (program) => {
    setViewingVolunteersProgram(program);
  };

  const handleEditProgram = (program) => {
    setEditingProgram(program);
    setPageMode('edit');
  };

  const handleDeleteProgram = (program) => {
    setDeletingProgram(program);
  };

  // Handle mark program as completed
  const handleMarkCompleted = async (program) => {
    try {
      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
          type: 'error' 
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${program.id}/mark-completed`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to mark program as completed`);
      }

      setSuccessModal({ 
        isVisible: true, 
        message: 'Program marked as completed successfully!', 
        type: 'success' 
      });
      refreshPrograms();
    } catch (error) {
      setSuccessModal({ 
        isVisible: true, 
        message: `Failed to mark program as completed: ${error.message}`, 
        type: 'error' 
      });
    }
  };

  // Handle mark program as active
  const handleMarkActive = async (program) => {
    try {
      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
          type: 'error' 
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${program.id}/mark-active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to mark program as active`);
      }

      setSuccessModal({ 
        isVisible: true, 
        message: 'Program marked as active successfully!', 
        type: 'success' 
      });
      refreshPrograms();
    } catch (error) {
      setSuccessModal({ 
        isVisible: true, 
        message: `Failed to mark program as active: ${error.message}`, 
        type: 'error' 
      });
    }
  };

  // Confirm program deletion
  const confirmDeleteProgram = async () => {
    if (!deletingProgram) return;
    
    setIsDeleting(true);
    try {
      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
          type: 'error' 
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${deletingProgram.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete program');
      }

      setSuccessModal({ 
        isVisible: true, 
        message: 'Program deleted successfully!', 
        type: 'success' 
      });
      setDeletingProgram(null);
      refreshPrograms();
    } catch (error) {
      setSuccessModal({ 
        isVisible: true, 
        message: 'Failed to delete program. Please try again.', 
        type: 'error' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel program deletion
  const cancelDeleteProgram = () => {
    setDeletingProgram(null);
    setIsDeleting(false);
  };

  // Close success modal
  const closeSuccessModal = () => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  };

  // Close view modal
  const closeViewModal = () => {
    setViewingProgram(null);
  };

  // Handle opt-out callback - refresh both programs and collaborators
  const handleOptOut = useCallback(async () => {
    // Refresh the programs list
    await refreshPrograms();
    
    // If we're in edit mode and have a refresh function, also refresh collaborators
    if (pageMode === 'edit' && refreshCollaboratorsFn) {
      try {
        await refreshCollaboratorsFn();
      } catch (error) {
        // Handle error silently in production
      }
    }
  }, [refreshPrograms, pageMode, refreshCollaboratorsFn]);

  // Helper function to determine program status based on dates
  const getProgramStatusByDates = (program) => {
    if (!program.event_start_date) {
      // If no start date, use the database status
      return program.status || 'Active';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const startDate = new Date(program.event_start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = program.event_end_date ? new Date(program.event_end_date) : null;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999); // Set to end of day
    }

    // If start date is in the future, it's upcoming
    if (startDate > today) {
      return 'Upcoming';
    }
    
    // If end date exists and is in the past, it's completed
    if (endDate && endDate < today) {
      return 'Completed';
    }
    
    // If start date is today or in the past, and either no end date or end date is today or in the future, it's active
    return 'Active';
  };

  // Filter and sort programs
  const filteredAndSortedPrograms = useCallback(() => {
    let filtered = (programs || []).filter((program) => {
      if (!program || !program.title) return false;
      
      const matchesSearch = 
        (program.title && program.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (program.description && program.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (program.category && program.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Use date-based status instead of database status
      const programStatus = getProgramStatusByDates(program);
      const matchesStatus = programStatus.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });

    // Sort programs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const dateANew = a.created_at || a.date || new Date(0);
          const dateBNew = b.created_at || b.date || new Date(0);
          return new Date(dateBNew) - new Date(dateANew);
        case 'oldest':
          const dateAOld = a.created_at || a.date || new Date(0);
          const dateBOld = b.created_at || b.date || new Date(0);
          return new Date(dateAOld) - new Date(dateBOld);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [programs, searchQuery, statusFilter, sortBy]);

  // Update URL parameters
  const updateURLParams = (params) => {
    const newSearchParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
             if (value && value !== 'all' && value !== '' && !(key === 'sort' && value === 'newest') && !(key === 'status' && value === 'Active')) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }
    });
    router.push(`?${newSearchParams.toString()}`, { scroll: false });
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    updateURLParams({ search: value });
  };

  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'status':
        setStatusFilter(value);
        updateURLParams({ status: value });
        break;
      case 'sort':
        setSortBy(value);
        updateURLParams({ sort: value });
        break;
    }
  };

  // Show skeleton immediately on first load or when loading
  if (!hasInitiallyLoaded || isLoading) {
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
      {pageMode === 'list' ? (
        <>
          {/* Header Section - Consistent with other admin pages */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <h1>Programs</h1>
              <button 
                onClick={() => setPageMode('create')}
                className={styles.addButton}
              >
                <FaPlus /> Add Program
              </button>
            </div>
          </div>

          {/* Search and Filter Controls - Hide for Collaborations tab */}
          {statusFilter !== 'Collaborations' && (
            <SearchAndFilterControls
              searchQuery={searchQuery}
              sortBy={sortBy}
              onSearchChange={handleSearchChange}
              onFilterChange={handleFilterChange}
              totalCount={programs?.length || 0}
              filteredCount={filteredAndSortedPrograms()?.length || 0}
            />
          )}

          {/* Status Navigation Tabs */}
          <div className={styles.statusTabs}>
            {['Active', 'Upcoming', 'Completed', 'Collaborations'].map((status) => (
              <button
                key={status}
                className={`${styles.statusTab} ${statusFilter === status ? styles.activeTab : ''}`}
                onClick={() => handleFilterChange('status', status)}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Programs Grid or Collaborations Section */}
          {statusFilter === 'Collaborations' ? (
            <CollaborationsSection onRefresh={refreshPrograms} />
          ) : (
            <div className={styles.programsSection}>
              {(filteredAndSortedPrograms()?.length || 0) === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyTitle}>No programs found</div>
                  <div className={styles.emptyText}>No programs match your current filters. Try adjusting your search criteria.</div>
                </div>
              ) : (
                <div className={styles.programsGrid}>
                  {(filteredAndSortedPrograms() || []).map((program) => (
                    <ProgramCard
                      key={program?.id || Math.random()}
                      program={program}
                      onViewDetails={() => handleViewProgram(program)}
                      onViewVolunteers={() => handleViewVolunteers(program)}
                      onEdit={() => handleEditProgram(program)}
                      onDelete={() => handleDeleteProgram(program)}
                      onMarkCompleted={() => handleMarkCompleted(program)}
                      onMarkActive={() => handleMarkActive(program)}
                      onOptOut={handleOptOut}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : pageMode === 'create' ? (
        <>
          <div className={styles.createPostHeader}>
            <h1>Add New Program</h1>
          </div>
          <ProgramForm
            mode="create"
            onCancel={() => setPageMode('list')}
            onSubmit={handleSubmitProgram}
          />
        </>
      ) : pageMode === 'edit' ? (
        <>
          <div className={styles.createPostHeader}>
            <h1>Edit Program</h1>
          </div>
          <ProgramForm
            mode="edit"
            program={editingProgram}
            onCancel={() => {
              setPageMode('list');
              setEditingProgram(null);
              setRefreshCollaboratorsFn(null);
            }}
            onSubmit={handleUpdateProgram}
            onRefreshCollaborators={setRefreshCollaboratorsFn}
          />
        </>
      ) : null}

      {/* Modals */}
      {viewingProgram && (
        <ViewDetailsModal
          program={viewingProgram}
          onClose={closeViewModal}
        />
      )}

      {viewingVolunteersProgram && (
        <ViewVolunteersModal
          program={viewingVolunteersProgram}
          isOpen={!!viewingVolunteersProgram}
          onClose={() => setViewingVolunteersProgram(null)}
        />
      )}

      <ConfirmationModal
        isOpen={!!deletingProgram}
        itemName={deletingProgram?.title || 'this program'}
        itemType="program"
        onConfirm={confirmDeleteProgram}
        onCancel={cancelDeleteProgram}
        isDeleting={isDeleting}
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
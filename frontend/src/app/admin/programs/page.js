'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { selectCurrentAdmin } from '../../../rtk/superadmin/adminSlice';
import { useAdminPrograms } from '../../../hooks/useAdminData';
import { ProgramCard, AddProgramModal, EditProgramModal, ViewDetailsModal } from './components';
import { DeleteConfirmationModal } from '../components';
import { SearchAndFilterControls } from './components';
import { SuccessModal, SkeletonLoader } from '../components';
import styles from './programs.module.css';
import { FaPlus } from 'react-icons/fa';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Track if programs page has been visited
let hasVisitedPrograms = false;

export default function AdminProgramsPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageReady, setPageReady] = useState(false);
  
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [viewingProgram, setViewingProgram] = useState(null);
  const [deletingProgram, setDeletingProgram] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use SWR hook for programs data
  const { programs = [], isLoading, error, mutate: refreshPrograms } = useAdminPrograms(currentAdmin?.org);
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'Active');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [showCount, setShowCount] = useState(parseInt(searchParams.get('show')) || 10);

  // Show skeleton immediately on first load, then show content when data is ready
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  
  // Mark as initially loaded when data is available
  useEffect(() => {
    if (!isLoading && programs.length >= 0) {
      setHasInitiallyLoaded(true);
      setPageReady(true);
      hasVisitedPrograms = true;
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
    const urlCategory = searchParams.get('category');
    const urlSort = searchParams.get('sort');
    const urlShow = searchParams.get('show');

    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
    if (urlSearch !== null) {
      setSearchQuery(urlSearch);
    }
    if (urlCategory) {
      setCategoryFilter(urlCategory);
    }
    if (urlSort) {
      setSortBy(urlSort);
    }
    if (urlShow) {
      setShowCount(parseInt(urlShow));
    }
  }, [searchParams]);



  // Handle program submission for approval
  const handleSubmitProgram = async (programData) => {
    try {
      if (!currentAdmin?.org || !currentAdmin?.id) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Missing organization or admin ID. Please log in again.', 
          type: 'error' 
        });
        return;
      }
      
      const orgAcronym = currentAdmin.org;
      const adminId = currentAdmin.id;

      // Wrap data inside a `submissions` array as required by backend
      const submissionPayload = {
        submissions: [
          {
            organization_id: orgAcronym, // Send org acronym - backend will convert to numeric ID
            section: 'programs',
            previous_data: {}, // no previous data since it's new
            proposed_data: programData,
            submitted_by: adminId,
          },
        ],
      };

      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to submit program: ${errorText}`);
      }

      setSuccessModal({ 
        isVisible: true, 
        message: 'Program submitted for approval! You can track its status in the submissions page.', 
        type: 'success' 
      });

      setShowAddModal(false);
      refreshPrograms();
    } catch (error) {
      setSuccessModal({ 
        isVisible: true, 
        message: `Failed to submit program: ${error.message}`, 
        type: 'error' 
      });
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

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${editingProgram.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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
      setEditingProgram(null);
      refreshPrograms();
    } catch (error) {
      console.error('Update program error:', error);
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

  const handleDeleteProgram = (program) => {
    setDeletingProgram(program);
  };

  // Confirm program deletion
  const confirmDeleteProgram = async () => {
    if (!deletingProgram) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${deletingProgram.id}`, {
        method: 'DELETE',
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

  // Filter and sort programs
  const filteredAndSortedPrograms = useCallback(() => {
    let filtered = (programs || []).filter((program) => {
      if (!program || !program.title) return false;
      
      const matchesSearch = 
        (program.title && program.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (program.description && program.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (program.category && program.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || program.category === categoryFilter;
      const matchesStatus = program.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
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

    return filtered.slice(0, showCount);
  }, [programs, searchQuery, categoryFilter, statusFilter, sortBy, showCount]);

  // Update URL parameters
  const updateURLParams = (params) => {
    const newSearchParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
             if (value && value !== 'all' && value !== '' && !(key === 'sort' && value === 'newest') && !(key === 'status' && value === 'Active') && !(key === 'show' && value === 10)) {
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
      case 'category':
        setCategoryFilter(value);
        updateURLParams({ category: value });
        break;
      case 'status':
        setStatusFilter(value);
        updateURLParams({ status: value });
        break;
      case 'sort':
        setSortBy(value);
        updateURLParams({ sort: value });
        break;
      case 'show':
        setShowCount(parseInt(value));
        updateURLParams({ show: value });
        break;
    }
  };

  // Show skeleton immediately on first load or when loading
  if (!hasInitiallyLoaded || (isLoading && !pageReady)) {
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
      {/* Header Section - Consistent with other admin pages */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1>Programs</h1>
          <button 
            onClick={() => setShowAddModal(true)}
            className={styles.addButton}
          >
            <FaPlus /> Add Program
          </button>
        </div>
      </div>


      {/* Search and Filter Controls */}
      <SearchAndFilterControls
        searchQuery={searchQuery}
        sortBy={sortBy}
        showCount={showCount}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        totalCount={programs?.length || 0}
        filteredCount={filteredAndSortedPrograms()?.length || 0}
      />

      {/* Status Navigation Tabs */}
      <div className={styles.statusTabs}>
        {['Active', 'Upcoming', 'Completed'].map((status) => (
          <button
            key={status}
            className={`${styles.statusTab} ${statusFilter === status ? styles.activeTab : ''}`}
            onClick={() => handleFilterChange('status', status)}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Programs Grid */}
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
                onEdit={() => setEditingProgram(program)}
                onDelete={() => handleDeleteProgram(program)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddProgramModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleSubmitProgram}
        />
      )}

      {editingProgram && (
        <EditProgramModal
          program={editingProgram}
          onClose={() => setEditingProgram(null)}
          onSubmit={handleUpdateProgram}
        />
      )}

      {viewingProgram && (
        <ViewDetailsModal
          program={viewingProgram}
          onClose={closeViewModal}
        />
      )}

      <DeleteConfirmationModal
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
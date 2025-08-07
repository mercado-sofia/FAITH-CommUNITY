'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '../../../rtk/superadmin/adminSlice';
import styles from './programs.module.css';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import AddProgramModal from './components/AddProgramModal';
import EditProgramModal from './components/EditProgramModal';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import ProgramCard from './components/ProgramCard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function ProgramsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAdmin = useSelector(selectCurrentAdmin);
  
  // State management
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'latest');
  const [showCount, setShowCount] = useState(parseInt(searchParams.get('show')) || 10);

  // Fetch submitted programs (pending approval)
  const fetchPrograms = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!currentAdmin?.org) {
        console.error('No organization ID found in admin session');
        setPrograms([]);
        return;
      }
      
      const orgId = currentAdmin.org;

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${orgId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch programs');
      }

      const data = await response.json();
      setPrograms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      setPrograms([]);
      setMessage({ type: 'error', text: 'Failed to load programs. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }, [currentAdmin?.org]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);



  // Handle program submission for approval
  const handleSubmitProgram = async (programData) => {
    try {
      if (!currentAdmin?.org || !currentAdmin?.id) {
        setMessage({ type: 'error', text: 'Missing organization or admin ID. Please log in again.' });
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

      console.log("📦 Payload to be submitted:", submissionPayload);
      console.log("🌐 Submitting to URL:", `${API_BASE_URL}/api/submissions`);

      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionPayload),
      });
      
      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Submission failed: ${response.status} - ${errorText}`);
        throw new Error('Failed to submit program');
      }

      setMessage({ 
        type: 'success', 
        text: 'Program submitted for approval! You can track its status in the submissions page.' 
      });

      setIsAddModalOpen(false);
      fetchPrograms();
      
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      console.error('❌ Error submitting program:', error);
      setMessage({ type: 'error', text: 'Failed to submit program. Please try again.' });
    }
  };

  // Handle program update
  const handleUpdateProgram = async (programData) => {
    try {
      if (!editingProgram?.id) {
        setMessage({ type: 'error', text: 'Program ID not found. Please try again.' });
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
        const errorText = await response.text();
        console.error(`❌ Update failed: ${response.status} - ${errorText}`);
        throw new Error('Failed to update program');
      }

      const result = await response.json();
      
      setMessage({ 
        type: 'success', 
        text: 'Program updated successfully!' 
      });
      setEditingProgram(null);
      fetchPrograms();
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error updating program:', error);
      setMessage({ type: 'error', text: 'Failed to update program. Please try again.' });
    }
  };

  // Handle program deletion
  const handleDeleteProgram = async (programId) => {
    if (!window.confirm('Are you sure you want to delete this program submission?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${programId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete program');
      }

      setMessage({ type: 'success', text: 'Program deleted successfully!' });
      fetchPrograms();
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error deleting program:', error);
      setMessage({ type: 'error', text: 'Failed to delete program. Please try again.' });
    }
  };

  // Filter and sort programs
  const filteredAndSortedPrograms = useMemo(() => {
    let filtered = programs.filter((program) => {
      const matchesSearch = 
        program.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || program.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });

    // Sort programs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
        case 'oldest':
          return new Date(a.created_at || a.date) - new Date(b.created_at || b.date);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered.slice(0, showCount);
  }, [programs, searchQuery, categoryFilter, sortBy, showCount]);

  // Update URL parameters
  const updateURLParams = (params) => {
    const newSearchParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
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

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading programs...</p>
        </div>
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
            onClick={() => setIsAddModalOpen(true)}
            className={styles.addButton}
          >
            <FaPlus /> Add Program
          </button>
        </div>
        <p className={styles.subheader}>
          View your approved programs. These programs are visible on your public organization page.
        </p>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Search and Filter Controls */}
      <SearchAndFilterControls
        searchQuery={searchQuery}
        categoryFilter={categoryFilter}
        sortBy={sortBy}
        showCount={showCount}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        totalCount={programs.length}
        filteredCount={filteredAndSortedPrograms.length}
      />

      {/* Programs Grid */}
      <div className={styles.programsSection}>
        {filteredAndSortedPrograms.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h3>No programs found</h3>
            <p>
              {programs.length === 0 
                ? "You haven't submitted any programs yet. Click 'Add Program' to get started!"
                : "No programs match your current filters. Try adjusting your search criteria."
              }
            </p>
          </div>
        ) : (
          <div className={styles.programsGrid}>
            {filteredAndSortedPrograms.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                onEdit={() => setEditingProgram(program)}
                onDelete={() => handleDeleteProgram(program.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddProgramModal
          onClose={() => setIsAddModalOpen(false)}
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
    </div>
  );
}
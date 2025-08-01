'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './programs.module.css';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import AddProgramModal from './components/AddProgramModal';
import EditProgramModal from './components/EditProgramModal';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import ProgramCard from './components/ProgramCard';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export default function ProgramsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'latest');
  const [showCount, setShowCount] = useState(parseInt(searchParams.get('show')) || 10);

  // Fetch submitted programs (pending approval)
  const fetchPrograms = async () => {
    try {
      setIsLoading(true);
      const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
      const orgId = adminData.org;
      
      if (!orgId) {
        console.error('No organization ID found');
        setPrograms([]);
        return;
      }

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
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  // Handle program submission for approval
  const handleSubmitProgram = async (programData) => {
    try {
      const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
      const orgId = adminData.org;
      
      if (!orgId) {
        setMessage({ type: 'error', text: 'Organization not found. Please log in again.' });
        return;
      }

      const submissionData = {
        organization_id: orgId,
        section: 'programs',
        data: programData,
        status: 'pending'
      };

      const response = await fetch(`${API_BASE_URL}/api/submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit program');
      }

      setMessage({ 
        type: 'success', 
        text: 'Program submitted for approval! You can track its status in the submissions page.' 
      });
      setIsAddModalOpen(false);
      fetchPrograms();
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      console.error('Error submitting program:', error);
      setMessage({ type: 'error', text: 'Failed to submit program. Please try again.' });
    }
  };

  // Handle program update submission
  const handleUpdateProgram = async (programData) => {
    try {
      const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
      const orgId = adminData.org;
      
      const submissionData = {
        organization_id: orgId,
        section: 'programs',
        data: programData,
        status: 'pending',
        program_id: editingProgram.id // Include original program ID for updates
      };

      const response = await fetch(`${API_BASE_URL}/api/submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit program update');
      }

      setMessage({ 
        type: 'success', 
        text: 'Program update submitted for approval!' 
      });
      setEditingProgram(null);
      fetchPrograms();
      
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (error) {
      console.error('Error updating program:', error);
      setMessage({ type: 'error', text: 'Failed to submit program update. Please try again.' });
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
      
      const matchesStatus = statusFilter === 'all' || program.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || program.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
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
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return filtered.slice(0, showCount);
  }, [programs, searchQuery, statusFilter, categoryFilter, sortBy, showCount]);

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
      case 'status':
        setStatusFilter(value);
        updateURLParams({ status: value });
        break;
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
          Submit programs for approval. Once approved by superadmin, they will appear on your public organization page.
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
        statusFilter={statusFilter}
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
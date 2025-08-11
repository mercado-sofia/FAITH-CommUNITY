'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import SubmissionTable from './components/SubmissionTable';
import BulkActionsBar from './components/BulkActionsBar';
import PaginationControls from '../volunteers/components/PaginationControls';
import styles from './submissions.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function SubmissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const admin = useSelector((state) => state.admin.admin);
  const orgAcronym = admin?.org;

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('filter') ? capitalizeFirstLetter(searchParams.get('filter')) : 'All status'
  );
  const [sortOrder, setSortOrder] = useState(
    searchParams.get('sort') === 'oldest' ? 'oldest' : 'latest'
  );
  const [sectionFilter, setSectionFilter] = useState(
    searchParams.get('section') ? capitalizeFirstLetter(searchParams.get('section')) : 'All Sections'
  );
  const [showCount, setShowCount] = useState(
    parseInt(searchParams.get('show')) || 10
  );
  const [currentPage, setCurrentPage] = useState(1);

  function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  const fetchSubmissions = useCallback(async () => {
    if (!orgAcronym) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/submissions/${orgAcronym}`);
      const data = await res.json();
      
      // Handle different response formats
      if (data.success && Array.isArray(data.data)) {
        setSubmissions(data.data);
      } else if (Array.isArray(data)) {
        setSubmissions(data);
      } else {
        console.error('Unexpected data format:', data);
        setSubmissions([]);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [orgAcronym]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (statusFilter.toLowerCase() !== 'all status') {
      params.set('filter', statusFilter.toLowerCase());
    }

    if (sortOrder && sortOrder !== 'latest') {
      params.set('sort', sortOrder);
    }

    if (sectionFilter.toLowerCase() !== 'all sections') {
      params.set('section', sectionFilter.toLowerCase());
    }

    if (showCount && showCount !== 10) {
      params.set('show', showCount.toString());
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, statusFilter, sortOrder, sectionFilter, showCount]);

  const filteredSubmissions = useMemo(() => {
    const filtered = submissions.filter((submission) => {
      const matchesSearch =
        submission.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        new Date(submission.submitted_at).toLocaleDateString().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter.toLowerCase() === 'all status' ||
        submission.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesSection =
        sectionFilter === 'All Sections' || 
        submission.section.toLowerCase() === sectionFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSection;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.submitted_at);
      const dateB = new Date(b.submitted_at);
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });
  }, [submissions, searchQuery, statusFilter, sectionFilter, sortOrder]);

  // Calculate pagination
  const totalItems = filteredSubmissions.length;
  const totalPages = Math.ceil(totalItems / showCount);
  const startIndex = (currentPage - 1) * showCount;
  const endIndex = Math.min(startIndex + showCount, totalItems);
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Optional: Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sectionFilter, sortOrder, showCount]);

  // Debug logging
  console.log('Rendering SubmissionsPage', {
    currentPage,
    totalPages,
    totalItems,
    showCount,
    startIndex,
    endIndex,
    filteredSubmissionsLength: filteredSubmissions.length,
    paginatedSubmissionsLength: paginatedSubmissions.length
  });

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Bulk actions handlers
  const handleBulkCancel = async () => {
    try {
      // Only cancel pending submissions from the selected items
      const pendingIds = Array.from(selectedItems).filter(id => {
        const submission = filteredSubmissions.find(s => s.id === id);
        return submission && submission.status === 'pending';
      });
      
      if (pendingIds.length === 0) {
        alert('No pending submissions selected to cancel.');
        return;
      }
      
      const promises = pendingIds.map(id => 
        fetch(`${API_BASE_URL}/api/submissions/${id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      fetchSubmissions();
      setSelectedItems(new Set());
      setShowBulkActions(false);
    } catch (err) {
      console.error('Bulk cancel error:', err);
      alert('Failed to cancel some submissions');
    }
  };

  const handleBulkDelete = async () => {
    try {
      console.log('[DEBUG] Bulk delete - Selected IDs:', Array.from(selectedItems));
      
      const response = await fetch(`${API_BASE_URL}/api/submissions/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: Array.from(selectedItems) })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete submissions: ${response.status}`);
      }
      
      fetchSubmissions();
      setSelectedItems(new Set());
      setShowBulkActions(false);
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert(`Failed to delete some submissions: ${err.message}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Submissions</h1>
      </div>

      <SearchAndFilterControls
        showCount={showCount}
        onShowCountChange={(value) => setShowCount(parseInt(value))}
        sectionFilter={sectionFilter}
        onSectionFilterChange={setSectionFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {showBulkActions && (
        <BulkActionsBar 
          selectedCount={selectedItems.size}
          selectedItems={selectedItems}
          submissions={filteredSubmissions}
          onCancel={handleBulkCancel}
          onDelete={handleBulkDelete}
          onClearSelection={() => {
            setSelectedItems(new Set());
            setShowBulkActions(false);
          }}
        />
      )}

      <div className={styles.tableContainer}>
        <SubmissionTable 
          orgAcronym={orgAcronym} 
          submissions={filteredSubmissions}
          loading={loading}
          onRefresh={fetchSubmissions}
          currentPage={currentPage}
          itemsPerPage={showCount}
          onPageChange={handlePageChange}
          selectedItems={selectedItems}
          onSelectItems={setSelectedItems}
          onShowBulkActions={setShowBulkActions}
        />
        
        {filteredSubmissions.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            startIndex={startIndex}
            endIndex={endIndex}
            totalCount={totalItems}
          />
        )}
      </div>
    </div>
  );
}
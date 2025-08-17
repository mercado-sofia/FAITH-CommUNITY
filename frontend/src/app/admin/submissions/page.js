'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminSubmissions } from '../../../hooks/useAdminData';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import SubmissionTable from './components/SubmissionTable';
import BulkActionsBar from './components/BulkActionsBar';
import PaginationControls from '../components/PaginationControls';
import SuccessModal from '../components/SuccessModal';
import styles from './submissions.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function SubmissionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const admin = useSelector((state) => state.admin.admin);
  const orgAcronym = admin?.org;

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
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });

  // Use SWR hook for submissions data
  const { submissions, isLoading: loading, error, mutate: refreshSubmissions } = useAdminSubmissions(orgAcronym);

  const showToast = useCallback((message, type = 'success') => {
    setSuccessModal({ isVisible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  }, []);

  function capitalizeFirstLetter(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // Handle error display
  useEffect(() => {
    if (error) {
      console.error('Submissions error:', error);
      showToast('Failed to load submissions. Please try again.', 'error');
    }
  }, [error, showToast]);

  // Handle authentication check
  useEffect(() => {
    if (!admin?.org) {
      showToast('Please log in to view submissions.', 'warning');
    }
  }, [admin?.org, showToast]);

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
    if (!Array.isArray(submissions)) return [];
    
    const filtered = submissions.filter((submission) => {
      const matchesSearch =
        submission.section?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        new Date(submission.submitted_at).toLocaleDateString().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter.toLowerCase() === 'all status' ||
        submission.status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesSection =
        sectionFilter === 'All Sections' || 
        submission.section?.toLowerCase() === sectionFilter.toLowerCase();

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
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    // Optional: Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sectionFilter, sortOrder, showCount]);

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Bulk actions handlers
  const handleBulkCancel = useCallback(async () => {
    try {
      // Only cancel pending submissions from the selected items
      const pendingIds = Array.from(selectedItems).filter(id => {
        const submission = filteredSubmissions.find(s => s.id === id);
        return submission && submission.status === 'pending';
      });
      
      if (pendingIds.length === 0) {
        showToast('No pending submissions selected to cancel.', 'warning');
        return;
      }
      
      const promises = pendingIds.map(id => 
        fetch(`${API_BASE_URL}/api/submissions/${id}`, { 
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
      );
      await Promise.all(promises);
      refreshSubmissions();
      setSelectedItems(new Set());
      setShowBulkActions(false);
      showToast('Submissions cancelled successfully!', 'success');
    } catch (err) {
      console.error('Bulk cancel error:', err);
      showToast('Failed to cancel some submissions', 'error');
    }
  }, [selectedItems, filteredSubmissions, refreshSubmissions, showToast]);

  const handleBulkDelete = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ ids: Array.from(selectedItems) })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete submissions: ${response.status}`);
      }
      
      refreshSubmissions();
      setSelectedItems(new Set());
      setShowBulkActions(false);
      showToast('Submissions deleted successfully!', 'success');
    } catch (err) {
      console.error('Bulk delete error:', err);
      showToast(`Failed to delete some submissions: ${err.message}`, 'error');
    }
  }, [selectedItems, refreshSubmissions, showToast]);

  // Show loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Submissions</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ 
            width: 40, 
            height: 40, 
            border: "4px solid #f1f5f9", 
            borderTop: "4px solid #16a085", 
            borderRadius: "50%", 
            animation: "spin 1s linear infinite",
            margin: '0 auto'
          }} />
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading submissions...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !admin?.org) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Submissions</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <p>Please log in to view submissions.</p>
        </div>
      </div>
    );
  }

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
          onRefresh={refreshSubmissions}
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
      
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={hideToast}
        type={successModal.type}
        autoHideDuration={3000}
      />
    </div>
  );
}
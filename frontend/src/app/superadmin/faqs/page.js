'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  useGetAllFaqsQuery,
  useCreateFaqMutation,
  useUpdateFaqMutation,
  useDeleteFaqMutation,
} from "../../../rtk/superadmin/faqApi";
import FAQTable from './components/FAQTable';
import CreateFAQModal from './components/CreateFAQModal';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import PaginationControls from './components/PaginationControls';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import styles from './faqs.module.css';

export default function ManageFaqs() {
  // URL management
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showEntries, setShowEntries] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '' });
  
  // Bulk actions
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  
  // Bulk delete modal state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // API hooks
  const { data: faqs = [], error: fetchError, isLoading: isFetching, refetch } = useGetAllFaqsQuery();
  const [createFaq, { isLoading: isCreating }] = useCreateFaqMutation();
  const [updateFaq, { isLoading: isUpdating }] = useUpdateFaqMutation();
  const [deleteFaq, { isLoading: isDeleting }] = useDeleteFaqMutation();

  // Function to update URL parameters
  const updateURLParams = useCallback((newParams) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newParams).forEach(([key, value]) => {
      // Define default values for each parameter
      const defaults = {
        search: '',
        sort: 'newest',
        show: 10,
        page: 1
      };
      
      // Only add to URL if value is not default and not empty
      if (value && value !== defaults[key] && value !== '') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    const newURL = `${pathname}?${params.toString()}`;
    router.replace(newURL, { scroll: false });
  }, [searchParams, pathname, router]);

  // Handle URL parameters for all filters
  useEffect(() => {
    const urlParams = {
      search: searchParams.get('search'),
      sort: searchParams.get('sort'),
      show: searchParams.get('show'),
      page: searchParams.get('page')
    };

    // Set filters based on URL parameters
    if (urlParams.search) {
      setSearchTerm(urlParams.search);
    }
    if (urlParams.sort) {
      setSortBy(urlParams.sort);
    }
    if (urlParams.show) {
      setShowEntries(parseInt(urlParams.show));
    }
    if (urlParams.page) {
      setCurrentPage(parseInt(urlParams.page));
    }
  }, [searchParams]);

  // Filter and search functionality
  const filteredFaqs = useMemo(() => {
    // Create a copy of the array to avoid mutating the original
    let filtered = [...faqs];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(searchLower) ||
        faq.answer.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    return filtered;
  }, [faqs, searchTerm, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredFaqs.length / showEntries);
  const startIndex = (currentPage - 1) * showEntries;
  const endIndex = startIndex + showEntries;
  const paginatedFaqs = filteredFaqs.slice(startIndex, endIndex);

  // Statistics
  const totalCount = faqs.length;

  // Success modal handler
  const showSuccessModal = (message) => {
    setSuccessModal({ isVisible: true, message });
  };

  const closeSuccessModal = () => {
    setSuccessModal({ isVisible: false, message: '' });
  };

  // FAQ CRUD operations
  const handleCreateFaq = async (formData) => {
    try {
      await createFaq(formData).unwrap();
      showSuccessModal('FAQ created successfully!');
      setShowCreateModal(false);
      refetch();
    } catch (error) {
      console.error('Create failed:', error);
      showSuccessModal('Failed to create FAQ');
    }
  };

  const handleUpdateFaq = async (faqData) => {
    try {
      await updateFaq(faqData).unwrap();
      showSuccessModal('FAQ updated successfully!');
      setEditingFaq(null);
      refetch();
    } catch (error) {
      console.error('Update failed:', error);
      showSuccessModal('Failed to update FAQ');
    }
  };

  const handleDeleteFaq = async (id) => {
    try {
      await deleteFaq(id).unwrap();
      showSuccessModal('FAQ deleted successfully!');
      refetch();
    } catch (error) {
      console.error('Delete failed:', error);
      showSuccessModal('Failed to delete FAQ');
    }
  };

  const handleBulkDeleteRequest = (selectedFaqIds) => {
    // Store selected items and show confirmation modal
    setSelectedItems(new Set(selectedFaqIds));
    setShowBulkDeleteModal(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedItems.size === 0) return;
    
    setIsBulkDeleting(true);
    try {
      const selectedIds = Array.from(selectedItems);
      await Promise.all(selectedIds.map(id => deleteFaq(id).unwrap()));
      showSuccessModal(`${selectedIds.length} FAQ(s) deleted successfully!`);
      setShowBulkDeleteModal(false);
      setSelectedItems(new Set());
      refetch();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      showSuccessModal('Failed to delete selected FAQs');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDeleteCancel = () => {
    setShowBulkDeleteModal(false);
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(new Set(paginatedFaqs.map(faq => faq.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, showEntries]);

  // Event handlers
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    updateURLParams({ search: value });
  }, [updateURLParams]);

  const handleSortChange = useCallback((value) => {
    setSortBy(value);
    updateURLParams({ sort: value });
  }, [updateURLParams]);

  const handleShowEntriesChange = useCallback((value) => {
    const numValue = Number(value);
    setShowEntries(numValue);
    setCurrentPage(1);
    updateURLParams({ show: numValue, page: 1 });
  }, [updateURLParams]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    updateURLParams({ page });
  }, [updateURLParams]);


  // Loading and error states
  if (isFetching) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.loading}>Loading FAQs...</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.error}>
          <h2>Error loading FAQs</h2>
          <p>{fetchError?.data?.error || fetchError?.message || 'Failed to fetch data'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerTop}>
        <h1>FAQs</h1>
      </div>

      {/* Search and Filter Controls */}
      <SearchAndFilterControls
        searchQuery={searchTerm}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        showCount={showEntries}
        onShowCountChange={handleShowEntriesChange}
        totalCount={totalCount}
        filteredCount={filteredFaqs.length}
        onAddNew={() => setShowCreateModal(true)}
        isCreating={isCreating}
      />

      {/* FAQ Table */}
      <FAQTable
        faqs={paginatedFaqs}
        onEdit={setEditingFaq}
        onDelete={handleDeleteFaq}
        onBulkDelete={handleBulkDeleteRequest}
        selectedItems={selectedItems}
        onSelectAll={handleSelectAll}
        onSelectItem={handleSelectItem}
        isDeleting={isDeleting}
        isUpdating={isUpdating}
        itemsPerPage={showEntries}
      />

      {/* Pagination */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        startIndex={startIndex}
        endIndex={endIndex}
        totalCount={filteredFaqs.length}
      />

      {/* Success Modal */}
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={closeSuccessModal}
      />

      {/* Modals */}
      <CreateFAQModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateFaq}
        isCreating={isCreating}
      />

      {editingFaq && (
        <CreateFAQModal
          isOpen={!!editingFaq}
          onClose={() => setEditingFaq(null)}
          onCreate={handleUpdateFaq}
          isCreating={isUpdating}
          initialData={editingFaq}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showBulkDeleteModal}
        itemName={`${selectedItems.size} FAQ${selectedItems.size > 1 ? 's' : ''}`}
        itemType="FAQ"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={handleBulkDeleteCancel}
        isDeleting={isBulkDeleting}
      />
    </div>
  );
}
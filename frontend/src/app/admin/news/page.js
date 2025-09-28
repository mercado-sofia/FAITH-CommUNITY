'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { useAdminNews } from '../hooks/useAdminData';
import { NewsTable, CreatePostForm } from './components';
import { SearchAndFilterControls, RecentlyDeletedModal } from './components';
import { ErrorBoundary } from '@/components';
import { DeleteConfirmationModal, SkeletonLoader } from '../components';
import { SuccessModal } from '@/components';
import { invalidateNewsCache } from '../utils/cacheInvalidator';
import styles from './news.module.css';
import { FaPlus } from 'react-icons/fa';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AdminNewsPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [pageMode, setPageMode] = useState('list'); // 'list', 'create', or 'edit'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecentlyDeletedModal, setShowRecentlyDeletedModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [deletingNews, setDeletingNews] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // Memoize the selection change handler to prevent unnecessary re-renders
  const handleSelectionChange = useCallback((newSelection) => {
    setSelectedItems(newSelection);
  }, []);

  // Use SWR hook for news data - only fetch when currentAdmin and org are available
  const { news = [], isLoading: loading, error, mutate: refreshNews } = useAdminNews(
    currentAdmin?.org && currentAdmin.org !== '' ? currentAdmin.org : null
  );

  // Initialize state from URL parameters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(() => {
    const sortParam = searchParams.get('sort');
    return sortParam || 'newest';
  });
  const [showCount, setShowCount] = useState(parseInt(searchParams.get('show')) || 10);

  const orgId = currentAdmin?.org;

  // Auto-clear success modal after 3 seconds
  useEffect(() => {
    if (successModal.isVisible) {
      const timer = setTimeout(() => {
        setSuccessModal({ isVisible: false, message: '', type: 'success' });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [successModal.isVisible]);

  // Function to update URL parameters
  const updateURLParams = (newParams) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    Object.keys(newParams).forEach(key => {
      const value = newParams[key];
      // Only add to URL if it's not the default value
      if (value && value !== '' && 
          !((key === 'sort' && value.toLowerCase() === 'newest') ||
            (key === 'show' && value === '10'))) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/admin/news${query}`, { scroll: false });
  };

  // Custom setters that update URL
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    updateURLParams({ search: value });
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    updateURLParams({ sort: value.toLowerCase() });
  };

  const handleShowCountChange = (value) => {
    setShowCount(value);
    updateURLParams({ show: value.toString() });
  };

  // Validation helper function
  const validateNewsData = (newsData) => {
    const errors = [];
    if (!newsData.title?.trim()) errors.push('News title is required.');
    if (!newsData.slug?.trim()) errors.push('News slug is required.');
    if (!newsData.content?.trim()) errors.push('News content is required.');
    if (!newsData.excerpt?.trim()) errors.push('News excerpt is required.');
    if (!newsData.publishedAt) errors.push('Published date is required.');
    return errors;
  };

  // Handle error display
  useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setSuccessModal({ isVisible: true, message: `Failed to fetch news: ${errorMessage}`, type: 'error' });
    }
  }, [error]);

  // Handle news submission (direct publishing)
  const handleSubmitNews = async (newsData) => {
    setIsSubmitting(true);
    try {
      if (!orgId) {
        setSuccessModal({ isVisible: true, message: 'Organization information not found. Please try again.', type: 'error' });
        return;
      }

      // Validate required fields
      const validationErrors = validateNewsData(newsData);
      if (validationErrors.length > 0) {
        setSuccessModal({ isVisible: true, message: validationErrors[0], type: 'error' });
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', newsData.title.trim());
      formData.append('slug', newsData.slug.trim());
      formData.append('content', newsData.content.trim());
      formData.append('excerpt', newsData.excerpt.trim());
      formData.append('published_at', newsData.publishedAt);
      
      // Add featured image if provided
      if (newsData.featuredImage) {
        formData.append('featured_image', newsData.featuredImage);
      }

      const adminToken = localStorage.getItem("adminToken");
      
      if (!adminToken) {
        setSuccessModal({ isVisible: true, message: 'Authentication required. Please log in again.', type: 'error' });
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/news/${orgId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
          // Don't set Content-Type header - let browser set it with boundary for FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        console.error('News creation failed:', { status: response.status, error: errorData });
        
        // Handle specific error cases
        if (errorData.errorCode === 'DUPLICATE_TITLE') {
          throw new Error(errorData.message || 'A post with this title already exists in your organization.');
        }
        
        throw new Error(errorData.message || `Failed to create news: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      setSuccessModal({ isVisible: true, message: 'News created successfully!', type: 'success' });
      setPageMode('list');
      refreshNews(); // Refresh the admin list
      invalidateNewsCache(); // Invalidate public news cache
    } catch (error) {
      console.error('News creation error:', error);
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to create news. Please try again.';
      setSuccessModal({ isVisible: true, message: errorMessage, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle news update (using CreatePostForm)
  const handleUpdateNews = async (newsData) => {
    setIsSubmitting(true);
    try {
      if (!editingNews?.id) {
        setSuccessModal({ isVisible: true, message: 'News ID not found. Please try again.', type: 'error' });
        return;
      }

      // Validate required fields
      const validationErrors = validateNewsData(newsData);
      if (validationErrors.length > 0) {
        setSuccessModal({ isVisible: true, message: validationErrors[0], type: 'error' });
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', newsData.title.trim());
      formData.append('slug', newsData.slug.trim());
      formData.append('content', newsData.content.trim());
      formData.append('excerpt', newsData.excerpt.trim());
      formData.append('published_at', newsData.publishedAt);
      
      // Add featured image if provided
      if (newsData.featuredImage) {
        formData.append('featured_image', newsData.featuredImage);
      }

      const adminToken = localStorage.getItem("adminToken");
      
      if (!adminToken) {
        setSuccessModal({ isVisible: true, message: 'Authentication required. Please log in again.', type: 'error' });
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/news/${editingNews.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`
          // Don't set Content-Type header - let browser set it with boundary for FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        console.error('News update failed:', { status: response.status, error: errorData });
        
        // Handle specific error cases
        if (errorData.errorCode === 'DUPLICATE_TITLE') {
          throw new Error(errorData.message || 'A post with this title already exists in your organization.');
        }
        
        throw new Error(errorData.message || `Failed to update news: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      setSuccessModal({ isVisible: true, message: 'News updated successfully!', type: 'success' });
      setPageMode('list');
      setEditingNews(null);
      refreshNews(); // Refresh the admin list
      invalidateNewsCache(); // Invalidate public news cache
    } catch (error) {
      console.error('News update error:', error);
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to update news. Please try again.';
      setSuccessModal({ isVisible: true, message: errorMessage, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle news deletion
  const handleDeleteNews = async (newsId) => {
    setIsDeleting(true);
    try {
      const adminToken = localStorage.getItem("adminToken");
      
      if (!adminToken) {
        setSuccessModal({ isVisible: true, message: 'Authentication required. Please log in again.', type: 'error' });
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/news/${newsId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('News deletion failed:', { status: response.status, error: errorText });
        throw new Error(`Failed to delete news: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      setSuccessModal({ isVisible: true, message: 'News deleted successfully!', type: 'success' });
      setShowDeleteModal(false);
      setDeletingNews(null);
      refreshNews(); // Refresh the admin list
      invalidateNewsCache(); // Invalidate public news cache
    } catch (error) {
      console.error('News deletion error:', error);
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to delete news. Please try again.';
      setSuccessModal({ isVisible: true, message: errorMessage, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and sort news
  const filteredNews = (news || []).filter(item => {
    if (!item || !item.title) return false;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Sort news
  const sortedNews = [...filteredNews].sort((a, b) => {
    switch (sortBy.toLowerCase()) {
      case 'newest':
        // Sort by date field (newest first)
        const dateA = a.date || a.created_at || new Date(0);
        const dateB = b.date || b.created_at || new Date(0);
        return new Date(dateB) - new Date(dateA);
      case 'oldest':
        // Sort by date field (oldest first)
        const dateAOld = a.date || a.created_at || new Date(0);
        const dateBOld = b.date || b.created_at || new Date(0);
        return new Date(dateAOld) - new Date(dateBOld);
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      default:
        // Default to newest
        const dateADef = a.date || a.created_at || new Date(0);
        const dateBDef = b.date || b.created_at || new Date(0);
        return new Date(dateBDef) - new Date(dateADef);
    }
  });

  const displayedNews = sortedNews || [];


  const handleEdit = (newsItem) => {
    setEditingNews(newsItem);
    setPageMode('edit');
  };

  const handleDelete = (newsItem) => {
    setDeletingNews(newsItem);
    setShowDeleteModal(true);
  };

  const handleBulkDeleteRequest = (selectedNewsIds) => {
    // Store selected items and show confirmation modal
    setSelectedItems(selectedNewsIds);
    setShowDeleteModal(true);
  };

  const handleBulkDelete = async (selectedNewsIds) => {
    setIsDeleting(true);
    try {
      const adminToken = localStorage.getItem("adminToken");
      
      if (!adminToken) {
        setSuccessModal({ isVisible: true, message: 'Authentication required. Please log in again.', type: 'error' });
        return;
      }

      // Delete each selected news item
      const deletePromises = selectedNewsIds.map(newsId => 
        fetch(`${API_BASE_URL}/api/news/${newsId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const failedDeletes = results.filter(result => result.status === 'rejected').length;
      
      if (failedDeletes > 0) {
        setSuccessModal({ 
          isVisible: true, 
          message: `${selectedNewsIds.length - failedDeletes} news items deleted successfully. ${failedDeletes} failed to delete.`, 
          type: 'warning' 
        });
      } else {
        setSuccessModal({ 
          isVisible: true, 
          message: `${selectedNewsIds.length} news items deleted successfully!`, 
          type: 'success' 
        });
      }

      // Clear selections and close modal
      setSelectedItems([]);
      setShowDeleteModal(false);
      refreshNews(); // Refresh the admin list
      invalidateNewsCache(); // Invalidate public news cache
    } catch (error) {
      console.error('Bulk delete error:', error);
      setSuccessModal({ isVisible: true, message: 'Failed to delete news items. Please try again.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModals = () => {
    setShowDeleteModal(false);
    setShowRecentlyDeletedModal(false);
    setEditingNews(null);
    setDeletingNews(null);
    setSelectedItems([]);
  };

  // Display error message if there's an error and we have a valid admin
  if (error && currentAdmin?.org) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          Error loading news: {error.message}
        </div>
      </div>
    );
  }

  // Show loading state if admin data is not yet available
  if (!currentAdmin?.org) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingMessage}>
          Loading admin data...
        </div>
      </div>
    );
  }

  // Loading state
  if (!currentAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          {localStorage.getItem('adminToken') ? 'Loading admin session...' : 'Please log in to access this page.'}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={styles.container}>
        {pageMode === 'list' ? (
          <>
            <div className={styles.headerTop}>
              <h1>News</h1>
              <div className={styles.headerActions}>
                <button
                  onClick={() => setPageMode('create')}
                  className={styles.addButton}
                  disabled={isSubmitting}
                >
                  <FaPlus /> New Post
                </button>
              </div>
            </div>

            <SearchAndFilterControls
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              showCount={showCount}
              onShowCountChange={handleShowCountChange}
              totalCount={news?.length || 0}
              filteredCount={filteredNews?.length || 0}
              onRecentlyDeletedClick={() => setShowRecentlyDeletedModal(true)}
            />

            {loading && (
              <SkeletonLoader 
                type="table" 
                count={showCount} 
                columns={[
                  { type: 'checkbox', width: '40px' },
                  { type: 'title', width: '50%' },
                  { type: 'date', width: '30%' },
                  { type: 'actions', width: '20%' }
                ]}
              />
            )}

            {error && (
              <div className={styles.errorContainer}>
                <p className={styles.errorMessage}>
                  {error instanceof Error ? error.message : String(error)}
                </p>
              </div>
            )}

            {!loading && !error && (
              <NewsTable
                news={displayedNews || []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onBulkDelete={handleBulkDeleteRequest}
                onSelectionChange={handleSelectionChange}
                selectedItems={selectedItems}
                itemsPerPage={showCount}
              />
            )}
          </>
        ) : pageMode === 'create' ? (
          <>
            <div className={styles.createPostHeader}>
              <h1>Create New Post</h1>
            </div>
            <CreatePostForm
              onCancel={() => setPageMode('list')}
              onSubmit={handleSubmitNews}
              isSubmitting={isSubmitting}
              existingNews={news || []}
            />
          </>
        ) : pageMode === 'edit' ? (
          <>
            <div className={styles.createPostHeader}>
              <h1>Edit Post</h1>
            </div>
            <CreatePostForm
              onCancel={() => {
                setPageMode('list');
                setEditingNews(null);
              }}
              onSubmit={handleUpdateNews}
              isSubmitting={isSubmitting}
              initialData={editingNews}
              isEditMode={true}
              existingNews={news || []}
            />
          </>
        ) : null}

      {/* Delete News Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal && (!!deletingNews || selectedItems.length > 0)}
        itemName={deletingNews?.title || `${selectedItems.length} selected news items`}
        itemType="news"
        onConfirm={() => {
          if (deletingNews) {
            handleDeleteNews(deletingNews.id);
          } else if (selectedItems.length > 0) {
            handleBulkDelete(selectedItems);
          }
        }}
        onCancel={handleCloseModals}
        isDeleting={isDeleting}
      />

      {/* Recently Deleted Modal */}
      <RecentlyDeletedModal
        isOpen={showRecentlyDeletedModal}
        onClose={() => setShowRecentlyDeletedModal(false)}
        orgId={orgId}
        onRestore={() => {
          refreshNews();
          invalidateNewsCache(); // Invalidate public news cache
          setSuccessModal({ isVisible: true, message: 'News restored successfully!', type: 'success' });
        }}
        onPermanentDelete={() => {
          refreshNews();
          invalidateNewsCache(); // Invalidate public news cache
          setSuccessModal({ isVisible: true, message: 'News permanently deleted!', type: 'success' });
        }}
      />

      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={() => setSuccessModal({ isVisible: false, message: '', type: 'success' })}
        type={successModal.type}
        autoHideDuration={4000}
      />
    </div>
    </ErrorBoundary>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { selectCurrentAdmin } from '../../../rtk/superadmin/adminSlice';
import { useAdminNews } from '../../../hooks/useAdminData';
import NewsCard from './components/NewsCard';
import AddNewsModal from './components/AddNewsModal';
import EditNewsModal from './components/EditNewsModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import RecentlyDeletedModal from './components/RecentlyDeletedModal';
import ErrorBoundary from '../../../components/ErrorBoundary';
import SuccessModal from '../components/SuccessModal';
import styles from './news.module.css';
import { FaPlus, FaTrash } from 'react-icons/fa';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AdminNewsPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRecentlyDeletedModal, setShowRecentlyDeletedModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [deletingNews, setDeletingNews] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use SWR hook for news data
  const { news = [], isLoading: loading, error, mutate: refreshNews } = useAdminNews(currentAdmin?.org);
  
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

  // Handle error display
  useEffect(() => {
    if (error) {
      setSuccessModal({ isVisible: true, message: 'Failed to fetch news. Please try again.', type: 'error' });
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

      // Validate news data
      if (!newsData.title || !newsData.title.trim()) {
        setSuccessModal({ isVisible: true, message: 'News title is required.', type: 'error' });
        return;
      }

      if (!newsData.description || !newsData.description.trim()) {
        setSuccessModal({ isVisible: true, message: 'News description is required.', type: 'error' });
        return;
      }

      if (!newsData.date) {
        setSuccessModal({ isVisible: true, message: 'News date is required.', type: 'error' });
        return;
      }

      // Sanitize data
      const sanitizedData = {
        title: newsData.title.trim(),
        description: newsData.description.trim(),
        date: newsData.date
      };

      const adminToken = localStorage.getItem("adminToken");
      
      if (!adminToken) {
        setSuccessModal({ isVisible: true, message: 'Authentication required. Please log in again.', type: 'error' });
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/admin/news/${orgId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(sanitizedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('News creation failed:', { status: response.status, error: errorText });
        throw new Error(`Failed to create news: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      setSuccessModal({ isVisible: true, message: 'News created successfully!', type: 'success' });
      setShowAddModal(false);
      refreshNews(); // Refresh the list
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

  // Handle news update
  const handleUpdateNews = async (newsData) => {
    setIsUpdating(true);
    try {
      if (!editingNews?.id) {
        setSuccessModal({ isVisible: true, message: 'News ID not found. Please try again.', type: 'error' });
        return;
      }

      // Validate news data
      if (!newsData.title || !newsData.title.trim()) {
        setSuccessModal({ isVisible: true, message: 'News title is required.', type: 'error' });
        return;
      }

      if (!newsData.description || !newsData.description.trim()) {
        setSuccessModal({ isVisible: true, message: 'News description is required.', type: 'error' });
        return;
      }

      if (!newsData.date) {
        setSuccessModal({ isVisible: true, message: 'News date is required.', type: 'error' });
        return;
      }

      // Sanitize data
      const sanitizedData = {
        title: newsData.title.trim(),
        description: newsData.description.trim(),
        date: newsData.date
      };

      const adminToken = localStorage.getItem("adminToken");
      
      if (!adminToken) {
        setSuccessModal({ isVisible: true, message: 'Authentication required. Please log in again.', type: 'error' });
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/admin/news/${editingNews.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(sanitizedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('News update failed:', { status: response.status, error: errorText });
        throw new Error(`Failed to update news: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      setSuccessModal({ isVisible: true, message: 'News updated successfully!', type: 'success' });
      setShowEditModal(false);
      setEditingNews(null);
      refreshNews(); // Refresh the list
    } catch (error) {
      console.error('News update error:', error);
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to update news. Please try again.';
      setSuccessModal({ isVisible: true, message: errorMessage, type: 'error' });
    } finally {
      setIsUpdating(false);
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
      
      const response = await fetch(`${API_BASE_URL}/api/admin/news/${newsId}`, {
        method: 'DELETE',
        headers: {
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
      refreshNews(); // Refresh the list
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

  const displayedNews = (sortedNews || []).slice(0, showCount);

  const handleEdit = (newsItem) => {
    setEditingNews(newsItem);
    setShowEditModal(true);
  };

  const handleDelete = (newsItem) => {
    setDeletingNews(newsItem);
    setShowDeleteModal(true);
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowRecentlyDeletedModal(false);
    setEditingNews(null);
    setDeletingNews(null);
  };

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
      {/* Header Section - Consistent with other admin pages */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1>News & Announcements</h1>
          <div className={styles.headerActions}>
            <button 
              onClick={() => setShowRecentlyDeletedModal(true)}
              className={styles.recentlyDeletedButton}
            >
              <FaTrash /> Recently Deleted
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className={styles.addButton}
            >
              <FaPlus /> Add News
            </button>
          </div>
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
      />

      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading news...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.newsGrid}>
          {(displayedNews?.length || 0) === 0 ? (
            <div className={styles.emptyState}>
              <p>No news found.</p>
              {searchQuery && (
                <p>Try adjusting your search terms.</p>
              )}
            </div>
          ) : (
            (displayedNews || []).map((newsItem) => (
              <NewsCard
                key={newsItem.id}
                news={newsItem}
                onEdit={() => handleEdit(newsItem)}
                onDelete={() => handleDelete(newsItem)}
              />
            ))
          )}
        </div>
      )}

      {/* Show More Button */}
      {(filteredNews?.length || 0) > showCount && (
        <div className={styles.showMoreContainer}>
          <button
            className={styles.showMoreButton}
            onClick={() => setShowCount(showCount + 10)}
          >
            Show More ({(filteredNews?.length || 0) - showCount} remaining)
          </button>
        </div>
      )}

      {/* Add News Modal */}
      {showAddModal && (
        <AddNewsModal
          onClose={handleCloseModals}
          onSubmit={handleSubmitNews}
          orgId={orgId}
        />
      )}

      {/* Edit News Modal */}
      {showEditModal && editingNews && (
        <EditNewsModal
          news={editingNews}
          onClose={handleCloseModals}
          onSubmit={handleUpdateNews}
        />
      )}

      {/* Delete News Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal && !!deletingNews}
        itemName={deletingNews?.title || 'this news item'}
        itemType="news"
        onConfirm={() => handleDeleteNews(deletingNews?.id)}
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
          setSuccessModal({ isVisible: true, message: 'News restored successfully!', type: 'success' });
        }}
        onPermanentDelete={() => {
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

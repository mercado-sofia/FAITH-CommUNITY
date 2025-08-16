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
import ErrorBoundary from '../../../components/ErrorBoundary';
import styles from './news.module.css';
import { FaPlus } from 'react-icons/fa';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AdminNewsPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [deletingNews, setDeletingNews] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use SWR hook for news data
  const { news, isLoading: loading, error, mutate: refreshNews } = useAdminNews(currentAdmin?.org);
  
  // Initialize state from URL parameters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(() => {
    const sortParam = searchParams.get('sort');
    return sortParam ? sortParam.charAt(0).toUpperCase() + sortParam.slice(1).toLowerCase() : 'Newest';
  });
  const [showCount, setShowCount] = useState(parseInt(searchParams.get('show') || '10'));

  const orgId = currentAdmin?.org;

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [message.text]);

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
      setMessage({ type: 'error', text: 'Failed to fetch news. Please try again.' });
    }
  }, [error]);

  // Handle news submission (direct publishing)
  const handleSubmitNews = async (newsData) => {
    setIsSubmitting(true);
    try {
      if (!orgId) {
        setMessage({ type: 'error', text: 'Organization information not found. Please try again.' });
        return;
      }

      // Validate news data
      if (!newsData.title || !newsData.title.trim()) {
        setMessage({ type: 'error', text: 'News title is required.' });
        return;
      }

      if (!newsData.description || !newsData.description.trim()) {
        setMessage({ type: 'error', text: 'News description is required.' });
        return;
      }

      if (!newsData.date) {
        setMessage({ type: 'error', text: 'News date is required.' });
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
        setMessage({ type: 'error', text: 'Authentication required. Please log in again.' });
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

      setMessage({ type: 'success', text: 'News created successfully!' });
      setShowAddModal(false);
      refreshNews(); // Refresh the list
    } catch (error) {
      console.error('News creation error:', error);
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to create news. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle news update
  const handleUpdateNews = async (newsData) => {
    setIsUpdating(true);
    try {
      if (!editingNews?.id) {
        setMessage({ type: 'error', text: 'News ID not found. Please try again.' });
        return;
      }

      // Validate news data
      if (!newsData.title || !newsData.title.trim()) {
        setMessage({ type: 'error', text: 'News title is required.' });
        return;
      }

      if (!newsData.description || !newsData.description.trim()) {
        setMessage({ type: 'error', text: 'News description is required.' });
        return;
      }

      if (!newsData.date) {
        setMessage({ type: 'error', text: 'News date is required.' });
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
        setMessage({ type: 'error', text: 'Authentication required. Please log in again.' });
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

      setMessage({ type: 'success', text: 'News updated successfully!' });
      setShowEditModal(false);
      setEditingNews(null);
      refreshNews(); // Refresh the list
    } catch (error) {
      console.error('News update error:', error);
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to update news. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
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
        setMessage({ type: 'error', text: 'Authentication required. Please log in again.' });
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

      setMessage({ type: 'success', text: 'News deleted successfully!' });
      setShowDeleteModal(false);
      setDeletingNews(null);
      refreshNews(); // Refresh the list
    } catch (error) {
      console.error('News deletion error:', error);
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to delete news. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and sort news
  const filteredNews = news.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Sort news
  const sortedNews = [...filteredNews].sort((a, b) => {
    switch (sortBy.toLowerCase()) {
      case 'newest':
        // Sort by date field (newest first)
        return new Date(b.date || b.created_at) - new Date(a.date || a.created_at);
      case 'oldest':
        // Sort by date field (oldest first)
        return new Date(a.date || a.created_at) - new Date(b.date || b.created_at);
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        // Default to newest
        return new Date(b.date || b.created_at) - new Date(a.date || a.created_at);
    }
  });

  const displayedNews = sortedNews.slice(0, showCount);

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
          <button 
            onClick={() => setShowAddModal(true)}
            className={styles.addButton}
          >
            <FaPlus /> Add News
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <SearchAndFilterControls
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        showCount={showCount}
        onShowCountChange={handleShowCountChange}
        totalCount={news.length}
        filteredCount={filteredNews.length}
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
          {displayedNews.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No news found.</p>
              {searchQuery && (
                <p>Try adjusting your search terms.</p>
              )}
            </div>
          ) : (
            displayedNews.map((newsItem) => (
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
      {filteredNews.length > showCount && (
        <div className={styles.showMoreContainer}>
          <button
            className={styles.showMoreButton}
            onClick={() => setShowCount(showCount + 10)}
          >
            Show More ({filteredNews.length - showCount} remaining)
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
      </div>
    </ErrorBoundary>
    );
  }

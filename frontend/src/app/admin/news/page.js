'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '../../../rtk/superadmin/adminSlice';
import NewsCard from './components/NewsCard';
import AddNewsModal from './components/AddNewsModal';
import EditNewsModal from './components/EditNewsModal';
import DeleteNewsModal from './components/DeleteNewsModal';
import SearchAndFilterControls from './components/SearchAndFilterControls';
import styles from './news.module.css';
import { FaPlus } from 'react-icons/fa';

const API_BASE_URL = 'http://localhost:8080';

export default function AdminNewsPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [deletingNews, setDeletingNews] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [showCount, setShowCount] = useState(10);

  const orgId = currentAdmin?.org;

  useEffect(() => {
    if (currentAdmin) {
      fetchNews();
    }
  }, [currentAdmin]);

  useEffect(() => {
    console.log('Current admin:', currentAdmin);
    console.log('Org ID:', orgId);
  }, [currentAdmin, orgId]);

  const fetchNews = async () => {
    if (!orgId) {
      setError('Organization information not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/news/${orgId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }

      const data = await response.json();
      setNews(data);
      setError(null);
    } catch (error) {
      console.error('❌ Error fetching news:', error);
      setError('Failed to fetch news');
    } finally {
      setLoading(false);
    }
  };

  // Handle news submission (direct publishing)
  const handleSubmitNews = async (newsData) => {
    try {
      if (!orgId) {
        setMessage({ type: 'error', text: 'Organization information not found. Please try again.' });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/news/${orgId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newsData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ News creation failed: ${response.status} - ${errorText}`);
        throw new Error('Failed to create news');
      }

      const result = await response.json();
      console.log('✅ News created successfully:', result);

      setMessage({ type: 'success', text: 'News created successfully!' });
      setShowAddModal(false);
      fetchNews(); // Refresh the list
    } catch (error) {
      console.error('❌ Error creating news:', error);
      setMessage({ type: 'error', text: 'Failed to create news. Please try again.' });
    }
  };

  // Handle news update
  const handleUpdateNews = async (newsData) => {
    try {
      if (!editingNews?.id) {
        setMessage({ type: 'error', text: 'News ID not found. Please try again.' });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/news/${editingNews.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newsData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Update failed: ${response.status} - ${errorText}`);
        throw new Error('Failed to update news');
      }

      const result = await response.json();
      console.log('✅ News updated successfully:', result);

      setMessage({ type: 'success', text: 'News updated successfully!' });
      setShowEditModal(false);
      setEditingNews(null);
      fetchNews(); // Refresh the list
    } catch (error) {
      console.error('❌ Error updating news:', error);
      setMessage({ type: 'error', text: 'Failed to update news. Please try again.' });
    }
  };

  // Handle news deletion
  const handleDeleteNews = async (newsId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/news/${newsId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Delete failed: ${response.status} - ${errorText}`);
        throw new Error('Failed to delete news');
      }

      const result = await response.json();
      console.log('✅ News deleted successfully:', result);

      setMessage({ type: 'success', text: 'News deleted successfully!' });
      setShowDeleteModal(false);
      setDeletingNews(null);
      fetchNews(); // Refresh the list
    } catch (error) {
      console.error('❌ Error deleting news:', error);
      setMessage({ type: 'error', text: 'Failed to delete news. Please try again.' });
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
        <p className={styles.subheader}>
          Manage your organization's news and announcements. These news items are visible on your public organization page.
        </p>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <SearchAndFilterControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        resultsCount={filteredNews.length}
      />

      {loading && (
        <div className={styles.loading}>
          Loading news...
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
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
      {showDeleteModal && deletingNews && (
        <DeleteNewsModal
          news={deletingNews}
          onConfirm={() => handleDeleteNews(deletingNews.id)}
          onCancel={handleCloseModals}
        />
      )}
    </div>
  );
}

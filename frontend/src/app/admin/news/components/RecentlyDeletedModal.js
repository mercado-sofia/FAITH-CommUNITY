'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaUndo, FaClock } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import styles from './styles/RecentlyDeletedModal.module.css';

const RecentlyDeletedModal = ({ isOpen, onClose, orgId, onRestore, onPermanentDelete }) => {
  const [deletedNews, setDeletedNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const fetchDeletedNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/news/${orgId}/deleted`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deleted news: ${response.status}`);
      }

      const data = await response.json();
      setDeletedNews(data);
    } catch (error) {
      console.error('Error fetching deleted news:', error);
      setError('Failed to load recently deleted news. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [orgId, API_BASE_URL]);

  useEffect(() => {
    if (isOpen && orgId) {
      fetchDeletedNews();
    }
  }, [isOpen, orgId, fetchDeletedNews]);

  const handleRestore = async (newsId) => {
    setRestoringId(newsId);
    try {
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/news/${newsId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to restore news: ${response.status}`);
      }

      // Remove from deleted list and refresh
      setDeletedNews(prev => prev.filter(news => news.id !== newsId));
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      console.error('Error restoring news:', error);
      setError('Failed to restore news. Please try again.');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDeleteClick = (news) => {
    setNewsToDelete(news);
    setShowDeleteConfirmModal(true);
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!newsToDelete) return;

    setDeletingId(newsToDelete.id);
    setIsDeleting(true);
    try {
      const adminToken = localStorage.getItem("adminToken");
      if (!adminToken) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/news/${newsToDelete.id}/permanent`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to permanently delete news: ${response.status}`);
      }

      // Remove from deleted list
      setDeletedNews(prev => prev.filter(news => news.id !== newsToDelete.id));
      if (onPermanentDelete) {
        onPermanentDelete();
      }
    } catch (error) {
      console.error('Error permanently deleting news:', error);
      setError('Failed to permanently delete news. Please try again.');
    } finally {
      setDeletingId(null);
      setIsDeleting(false);
      setNewsToDelete(null);
      setShowDeleteConfirmModal(false);
    }
  };

  const handlePermanentDeleteCancel = () => {
    setShowDeleteConfirmModal(false);
    setNewsToDelete(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const getDaysRemainingColor = (days) => {
    if (days <= 3) return '#dc2626'; // Red for urgent
    if (days <= 7) return '#f59e0b'; // Orange for warning
    return '#06100f'; // Dark green/black for safe
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Recently Deleted News</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalContent}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Loading recently deleted news...</p>
            </div>
          ) : deletedNews.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No recently deleted news found.</p>
              <p className={styles.emptyStateSubtext}>
                Deleted news items will appear here for 15 days before being permanently removed.
              </p>
            </div>
          ) : (
            <div className={styles.deletedNewsList}>
              {deletedNews.map((news) => (
                <div key={news.id} className={styles.deletedNewsItem}>
                  <div className={styles.newsInfo}>
                    <div className={styles.newsHeader}>
                      <h3 className={styles.newsTitle}>{news.title}</h3>
                      <div className={styles.newsMeta}>
                        <div className={styles.dateContainer}>
                          <span className={styles.date}>
                            Deleted: {formatDate(news.deleted_at)}
                          </span>
                        </div>
                        <div className={styles.daysRemainingContainer}>
                          <FaClock className={styles.clockIcon} />
                          <span 
                            className={styles.daysRemaining}
                            style={{ color: getDaysRemainingColor(news.days_until_permanent_deletion) }}
                          >
                            {news.days_until_permanent_deletion} days remaining
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className={styles.newsDescription}>
                      {truncateText(news.description)}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={styles.restoreButton}
                      onClick={() => handleRestore(news.id)}
                      disabled={restoringId === news.id}
                      title="Restore news"
                    >
                      {restoringId === news.id ? (
                        <div className={styles.spinner}></div>
                      ) : (
                        <FaUndo />
                      )}
                      {restoringId === news.id ? 'Restoring...' : 'Restore'}
                    </button>
                    <button
                      className={styles.permanentDeleteButton}
                      onClick={() => handlePermanentDeleteClick(news)}
                      disabled={deletingId === news.id}
                      title="Permanently delete"
                    >
                      {deletingId === news.id ? (
                        <div className={styles.spinner}></div>
                      ) : (
                        <FiTrash2 />
                      )}
                      {deletingId === news.id ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteConfirmModal}
          itemName={newsToDelete?.title || 'this news item'}
          itemType="news"
          onConfirm={handlePermanentDeleteConfirm}
          onCancel={handlePermanentDeleteCancel}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default RecentlyDeletedModal;

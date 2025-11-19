'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaUndo, FaEye } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import { formatDateShort, formatDateTime } from '@/utils/dateUtils.js';
import { ConfirmationModal } from '@/components';
import styles from './RecentlyDeletedModal.module.css';
import { API_BASE_URL } from '@/config/api';

const ArchiveModal = ({ isOpen, onClose, orgId, onRestore, onPermanentDelete, onView }) => {
  const [archivedNews, setArchivedNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchArchivedNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL || ''}/api/news/archived/${orgId}`, {
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch archived news: ${response.status}`);
      }

      const data = await response.json();
      setArchivedNews(data);
    } catch (error) {
      setError('Failed to load archived news. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (isOpen && orgId) {
      fetchArchivedNews();
    }
  }, [isOpen, orgId, fetchArchivedNews]);

  const handleUnarchive = async (newsId) => {
    setRestoringId(newsId);
    try {
      const response = await fetch(`${API_BASE_URL || ''}/api/news/restore/${newsId}`, {
        method: 'PATCH',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to unarchive news: ${response.status}`);
      }

      // Remove from archived list and refresh
      setArchivedNews(prev => prev.filter(news => news.id !== newsId));
      if (onRestore) {
        onRestore();
      }
    } catch (error) {
      setError('Failed to unarchive news. Please try again.');
    } finally {
      setRestoringId(null);
    }
  };

  const handleView = (news) => {
    if (onView) {
      onView(news);
    } else {
      // Fallback: open in new tab if slug exists
      if (news.slug) {
        window.open(`/news/${news.slug}`, '_blank');
      }
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
      const response = await fetch(`${API_BASE_URL || ''}/api/news/permanent/${newsToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to permanently delete news: ${response.status}`);
      }

      // Remove from archived list
      setArchivedNews(prev => prev.filter(news => news.id !== newsToDelete.id));
      if (onPermanentDelete) {
        onPermanentDelete();
      }
    } catch (error) {
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
    return formatDateTime(dateString);
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Archive</h2>
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
              <p>Loading archived news...</p>
            </div>
          ) : archivedNews.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No archived news found.</p>
              <p className={styles.emptyStateSubtext}>
                Archived news items will appear here. You can view, unarchive, or permanently delete them.
              </p>
            </div>
          ) : (
            <div className={styles.deletedNewsList}>
              {archivedNews.map((news) => (
                <div key={news.id} className={styles.deletedNewsItem}>
                  <div className={styles.newsInfo}>
                    <div className={styles.newsHeader}>
                      <h3 className={styles.newsTitle}>{news.title}</h3>
                      <div className={styles.newsMeta}>
                        <div className={styles.dateContainer}>
                          <span className={styles.date}>
                            Archived: {formatDate(news.archived_at || news.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className={styles.newsDescription}>
                      {truncateText(news.excerpt || news.description)}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={styles.viewButton}
                      onClick={() => handleView(news)}
                      title="View news"
                    >
                      <FaEye />
                      View
                    </button>
                    <button
                      className={styles.restoreButton}
                      onClick={() => handleUnarchive(news.id)}
                      disabled={restoringId === news.id}
                      title="Unarchive news"
                    >
                      {restoringId === news.id ? (
                        <div className={styles.spinner}></div>
                      ) : (
                        <FaUndo />
                      )}
                      {restoringId === news.id ? 'Unarchiving...' : 'Unarchive'}
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
                      {deletingId === news.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirmModal}
          itemName={newsToDelete?.title || 'this news item'}
          itemType="news"
          actionType="delete"
          onConfirm={handlePermanentDeleteConfirm}
          onCancel={handlePermanentDeleteCancel}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default ArchiveModal;

'use client';

import { IoClose } from 'react-icons/io5';
import { formatDateLong, formatDateTime } from '@/utils/dateUtils.js';
import { API_BASE_URL } from '@/config/api';
import Image from 'next/image';
import DOMPurify from 'dompurify';
import styles from './ViewDetailsModal.module.css';

const ViewDetailsModal = ({ news, onClose }) => {
  if (!news) return null;

  // Handle click outside to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Draft';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return formatDateLong(dateString);
  };

  const formatDateTimeDisplay = (dateString) => {
    if (!dateString) return 'N/A';
    return formatDateTime(dateString);
  };

  // Determine what date label and value to show based on status
  const getDateInfo = () => {
    const status = (news.status || 'draft').toLowerCase();
    // Always use published_at (not date field) - published_at is the source of truth
    const publishedAt = news.published_at;
    
    if (status === 'published' || (status === 'archived' && publishedAt)) {
      // Published or archived (was published before)
      return {
        label: 'Date Published',
        value: formatDate(publishedAt || news.created_at)
      };
    } else if (status === 'scheduled' && publishedAt) {
      // Scheduled for future publication
      return {
        label: 'Scheduled For',
        value: formatDateTimeDisplay(publishedAt)
      };
    } else {
      // Draft - show created date
      return {
        label: 'Created',
        value: formatDate(news.created_at)
      };
    }
  };

  const dateInfo = getDateInfo();

  // Get featured image URL
  const getFeaturedImageUrl = () => {
    if (!news.featured_image) return null;
    if (news.featured_image.startsWith('http')) {
      return news.featured_image;
    }
    // Use API_BASE_URL from config for consistency
    return `${API_BASE_URL || ''}/${news.featured_image}`;
  };

  const featuredImageUrl = getFeaturedImageUrl();

  // Sanitize HTML content
  const sanitizedContent = news.content ? DOMPurify.sanitize(news.content) : '';

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>News Details</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <IoClose />
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* Featured Image */}
          {featuredImageUrl && (
            <div className={styles.imageContainer}>
              <Image
                src={featuredImageUrl}
                alt={news.title || 'Featured image'}
                width={400}
                height={250}
                className={styles.featuredImage}
                unoptimized
              />
            </div>
          )}

          {/* Title */}
          <div className={styles.titleSection}>
            <h3 className={styles.title}>{news.title || 'Untitled'}</h3>
            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status</span>
                <span className={styles.metaValue}>{formatStatus(news.status)}</span>
              </div>
              {/* Only show date next to status if not a draft (draft shows created date in footer) */}
              {(news.status || 'draft').toLowerCase() !== 'draft' && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{dateInfo.label}</span>
                  <span className={styles.metaValue}>{dateInfo.value}</span>
                </div>
              )}
            </div>
          </div>

          {/* Excerpt */}
          {news.excerpt && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Excerpt</span>
              <p className={styles.sectionValue}>{news.excerpt}</p>
            </div>
          )}

          {/* Content */}
          {sanitizedContent && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Content</span>
              <div 
                className={styles.contentHtml}
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            </div>
          )}

          {/* Additional Info */}
          <div className={styles.infoGrid}>
            {news.slug && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Slug</span>
                <span className={styles.infoValue}>{news.slug}</span>
              </div>
            )}
            {news.created_at && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Created</span>
                <span className={styles.infoValue}>{formatDateTimeDisplay(news.created_at)}</span>
              </div>
            )}
            {(() => {
              // Only show "Last Updated" if updated_at exists and is meaningfully different from published_at
              // This ensures we only show it when there was an actual content edit, not when status changed
              if (!news.updated_at || !news.published_at) {
                return null;
              }
              
              const publishedDate = new Date(news.published_at);
              const updatedDate = new Date(news.updated_at);
              
              // Check if dates are valid
              if (isNaN(publishedDate.getTime()) || isNaN(updatedDate.getTime())) {
                return null;
              }
              
              // Only show if updated_at is significantly different from published_at (at least 5 seconds)
              const timeDifference = updatedDate.getTime() - publishedDate.getTime();
              if (timeDifference > 5000) { // 5 seconds threshold
                return (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Last Updated</span>
                    <span className={styles.infoValue}>{formatDateTimeDisplay(news.updated_at)}</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewDetailsModal;


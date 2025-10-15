'use client';

import { useState } from 'react';
import { FiEdit3, FiTrash2, FiEye, FiCalendar, FiImage } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import styles from './HighlightCard.module.css';

export default function HighlightCard({ highlight, onEdit, onView, onDelete }) {
  const [imageError, setImageError] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  const truncateText = (text, maxLength = 120) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getImageUrl = () => {
    if (!highlight.media || highlight.media.length === 0) return null;
    
    // Get the first image from media array
    const firstImage = highlight.media.find(item => 
      item.type === 'image' || 
      item.mimetype?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(item.filename || item.url)
    );
    
    return firstImage?.url || firstImage?.filename || null;
  };

  const imageUrl = getImageUrl();

  return (
    <div className={styles.card}>
      {/* Image Section */}
      <div className={styles.imageSection}>
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={highlight.title || 'Highlight image'}
            className={styles.image}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.placeholderImage}>
            <FiImage className={styles.placeholderIcon} />
            <span>No Image</span>
          </div>
        )}
        
        {/* Media Count Badge */}
        {highlight.media && highlight.media.length > 0 && (
          <div className={styles.mediaCount}>
            {highlight.media.length} {highlight.media.length === 1 ? 'file' : 'files'}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {highlight.title || 'Untitled Highlight'}
          </h3>
          <div className={styles.actions}>
            <button
              className={styles.actionButton}
              onClick={() => onView(highlight)}
              title="View Details"
            >
              <FiEye />
            </button>
            <button
              className={styles.actionButton}
              onClick={() => onEdit(highlight)}
              title="Edit Highlight"
            >
              <FiEdit3 />
            </button>
            <button
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={() => onDelete(highlight)}
              title="Delete Highlight"
            >
              <FiTrash2 />
            </button>
          </div>
        </div>

        <p className={styles.description}>
          {truncateText(highlight.description)}
        </p>

        <div className={styles.footer}>
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <FiCalendar className={styles.metaIcon} />
              <span>{formatDate(highlight.created_at || highlight.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FiEdit3, FiTrash2, FiEye, FiCalendar, FiImage, FiVideo, FiArchive } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';
import styles from './HighlightCard.module.css';

export default function HighlightCard({ highlight, onEdit, onView, onDelete, onArchive, onUnarchive }) {
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
    // Strip HTML tags for preview
    if (typeof document !== 'undefined') {
      const textContent = document.createElement('div');
      textContent.innerHTML = DOMPurify.sanitize(text);
      const plainText = (textContent.textContent || textContent.innerText || '').trim();
      return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
    }
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getFirstMediaItem = () => {
    if (!highlight.media || highlight.media.length === 0) return null;
    return highlight.media[0];
  };

  const isVideo = (item) => {
    if (!item) return false;
    return item.type === 'video' || 
           item.mimetype?.startsWith('video/') ||
           /\.(mp4|avi|mov|wmv|flv|webm)$/i.test(item.filename || item.url || '');
  };

  const isImage = (item) => {
    if (!item) return false;
    return item.type === 'image' || 
           item.mimetype?.startsWith('image/') ||
           /\.(jpg|jpeg|png|gif|webp)$/i.test(item.filename || item.url || '');
  };

  const firstMediaItem = getFirstMediaItem();
  const firstMediaIsVideo = firstMediaItem ? isVideo(firstMediaItem) : false;
  const firstMediaIsImage = firstMediaItem ? isImage(firstMediaItem) : false;
  const firstMediaUrl = firstMediaItem?.url || firstMediaItem?.filename || null;

  return (
    <div className={styles.card}>
      {/* Media Section */}
      <div className={styles.imageSection}>
        {firstMediaIsVideo && firstMediaUrl ? (
          <div className={styles.videoContainer}>
            <video
              className={styles.video}
              preload="metadata"
              muted
            >
              <source src={firstMediaUrl} type={firstMediaItem?.mimetype || 'video/mp4'} />
              Your browser does not support the video tag.
            </video>
            <div className={styles.videoOverlay}>
              <FiVideo className={styles.videoIcon} />
            </div>
          </div>
        ) : firstMediaIsImage && firstMediaUrl && !imageError ? (
          <Image
            src={firstMediaUrl}
            alt={highlight.title || 'Highlight image'}
            className={styles.image}
            width={300}
            height={200}
            style={{ objectFit: 'cover' }}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={styles.placeholderImage}>
            {firstMediaItem ? (
              <>
                <FiVideo className={styles.placeholderIcon} />
                <span>Media Preview</span>
              </>
            ) : (
              <>
                <FiImage className={styles.placeholderIcon} />
                <span>No Media</span>
              </>
            )}
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
            {highlight.status !== 'archived' && onEdit && (
              <button
                className={styles.actionButton}
                onClick={() => onEdit(highlight)}
                title="Edit Highlight"
              >
                <FiEdit3 />
              </button>
            )}
            {highlight.status === 'archived' && onUnarchive ? (
              <button
                className={styles.actionButton}
                onClick={() => onUnarchive(highlight)}
                title="Unarchive Highlight"
              >
                <FiArchive />
              </button>
            ) : highlight.status !== 'archived' && onArchive ? (
              <button
                className={styles.actionButton}
                onClick={() => onArchive(highlight)}
                title="Archive Highlight"
              >
                <FiArchive />
              </button>
            ) : null}
            {highlight.status !== 'archived' && onDelete && (
              <button
                className={`${styles.actionButton} ${styles.deleteButton}`}
                onClick={() => onDelete(highlight)}
                title="Delete Highlight"
              >
                <FiTrash2 />
              </button>
            )}
          </div>
        </div>

        {/* Associated Program - Display directly under title */}
        {(highlight.program_title || highlight.program_id) && (
          <div className={styles.meta} style={{ marginTop: '8px', marginBottom: '8px' }}>
            <div className={styles.metaItem} style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <span style={{ fontWeight: '600', color: '#4b5563' }}>Associated Program:</span>{' '}
              {highlight.program_title || `Program ID: ${highlight.program_id}`}
            </div>
          </div>
        )}

        {/* Year - Display if available */}
        {highlight.year && (
          <div className={styles.meta} style={{ marginTop: '4px', marginBottom: '8px' }}>
            <div className={styles.metaItem} style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <span style={{ fontWeight: '600', color: '#4b5563' }}>Year:</span>{' '}
              {highlight.year}
            </div>
          </div>
        )}

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

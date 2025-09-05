"use client"

import { FiX } from "react-icons/fi"
import Image from "next/image"
import styles from "./styles/ViewNewsModal.module.css"

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

export default function ViewNewsModal({ news, onClose }) {
  if (!news) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>News Details</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <FiX size={16} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.publishedDate}>
            Published at: {formatDate(news.published_at || news.date || news.created_at)}
          </div>
          
          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            <div className={styles.value}>{news.title}</div>
          </div>

          {news.featured_image && (
            <div className={styles.field}>
              <label className={styles.label}>Featured Image</label>
              <div className={styles.imageContainer}>
                <Image 
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/${news.featured_image}`}
                  alt={news.title}
                  width={400}
                  height={250}
                  className={styles.featuredImage}
                  style={{ objectFit: 'cover' }}
                />
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Excerpt</label>
            <div className={styles.value}>
              {news.excerpt || 'No excerpt provided'}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Content</label>
            <div className={styles.contentValue} dangerouslySetInnerHTML={{ __html: news.content || 'No content provided' }}></div>
          </div>

          {news.updated_at && (
            <div className={styles.field}>
              <label className={styles.label}>Last Updated</label>
              <div className={styles.value}>
                {formatDate(news.updated_at)}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button 
            className={styles.closeBtn}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

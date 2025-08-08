'use client';

import { FaEdit, FaCalendar } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import styles from './styles/NewsCard.module.css';

const NewsCard = ({ news, onEdit, onDelete }) => {
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

  const truncateText = (text, maxLength = 150) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className={styles.newsCard}>
      <div className={styles.newsContent}>
        <div className={styles.newsHeader}>
          <div className={styles.newsMeta}>
            <div className={styles.dateContainer}>
              <FaCalendar className={styles.dateIcon} />
              <span className={styles.date}>{formatDate(news.date || news.created_at)}</span>
            </div>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.editButton}
              onClick={() => onEdit(news)}
              title="Edit news"
            >
              <FaEdit />
            </button>
            <button
              className={styles.deleteButton}
              onClick={() => onDelete(news)}
              title="Delete news"
            >
              <FiTrash2 />
            </button>
          </div>
        </div>

        <h3 className={styles.newsTitle}>{news.title}</h3>
        <p className={styles.newsDescription}>
          {truncateText(news.description)}
        </p>
      </div>
    </div>
  );
};

export default NewsCard;

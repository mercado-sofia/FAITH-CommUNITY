'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FaEdit, FaCalendar, FaTag } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import styles from './styles/ProgramCard.module.css';

const ProgramCard = ({ program, onEdit, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
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

  const getCategoryLabel = (category) => {
    const categoryMap = {
      outreach: 'Outreach',
      education: 'Education',
      health: 'Health',
      environment: 'Environment',
      community: 'Community Development',
      youth: 'Youth Programs',
      women: 'Women Empowerment',
      elderly: 'Elderly Care',
      disaster: 'Disaster Relief',
      other: 'Other'
    };
    return categoryMap[category] || category || 'Uncategorized';
  };

  return (
    <div className={styles.programCard}>
      {/* Program Image */}
      {program.image ? (
        <div className={styles.imageContainer}>
          <Image
            src={program.image}
            alt={program.title}
            className={styles.programImage}
            width={400}
            height={200}
            style={{ objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className={styles.imageContainer}>
          <div className={styles.imagePlaceholder}>
            <FaTag className={styles.placeholderIcon} />
            <span>No Image</span>
          </div>
        </div>
      )}

      {/* Program Content */}
      <div className={styles.programContent}>
        <div className={styles.programHeader}>
          <h3 className={styles.programTitle}>{program.title}</h3>
        </div>

        <p className={styles.programDescription}>
          {program.description && program.description.length > 120
            ? `${program.description.substring(0, 120)}...`
            : program.description || 'No description provided'
          }
        </p>

        {/* Program Status Badge */}
        {program.status && (
          <div className={`${styles.statusBadge} ${styles[program.status]}`}>
            {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
          </div>
        )}

        {/* Program Meta Information */}
        <div className={styles.programMeta}>
          <div className={styles.metaItem}>
            <FaTag className={styles.metaIcon} />
            <span className={styles.metaText}>
              {getCategoryLabel(program.category)}
            </span>
          </div>

          {program.date && (
            <div className={styles.metaItem}>
              <FaCalendar className={styles.metaIcon} />
              <span className={styles.metaText}>
                {formatDate(program.date)}
              </span>
            </div>
          )}

          {program.created_at && (
            <div className={styles.metaItem}>
              <FaCalendar className={styles.metaIcon} />
              <span className={styles.metaText}>
                Created: {formatDate(program.created_at)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            onClick={onEdit}
            className={styles.editButton}
            disabled={isDeleting}
            title="Edit program"
          >
            <FaEdit /> Edit
          </button>
          
          <button
            onClick={handleDelete}
            className={styles.deleteButton}
            disabled={isDeleting}
            title="Delete program"
          >
            <FiTrash2 /> {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgramCard;

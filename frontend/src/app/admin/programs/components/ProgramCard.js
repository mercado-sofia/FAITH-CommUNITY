'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FaEdit, FaTrash, FaCalendar, FaClock, FaTag, FaExclamationTriangle } from 'react-icons/fa';
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', class: 'pending', icon: FaClock },
      approved: { label: 'Approved', class: 'approved', icon: FaCalendar },
      rejected: { label: 'Rejected', class: 'rejected', icon: FaExclamationTriangle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span className={`${styles.statusBadge} ${styles[config.class]}`}>
        <IconComponent className={styles.statusIcon} />
        {config.label}
      </span>
    );
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
      {program.image && (
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
          <div className={styles.imageOverlay}>
            {getStatusBadge(program.status)}
          </div>
        </div>
      )}

      {/* Program Content */}
      <div className={styles.programContent}>
        <div className={styles.programHeader}>
          <h3 className={styles.programTitle}>{program.title}</h3>
          {!program.image && (
            <div className={styles.statusContainer}>
              {getStatusBadge(program.status)}
            </div>
          )}
        </div>

        <p className={styles.programDescription}>
          {program.description && program.description.length > 120
            ? `${program.description.substring(0, 120)}...`
            : program.description || 'No description provided'
          }
        </p>

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
              <FaClock className={styles.metaIcon} />
              <span className={styles.metaText}>
                Submitted: {formatDate(program.created_at)}
              </span>
            </div>
          )}
        </div>

        {/* Rejection Feedback */}
        {program.status === 'rejected' && program.feedback && (
          <div className={styles.rejectionFeedback}>
            <FaExclamationTriangle className={styles.feedbackIcon} />
            <div className={styles.feedbackContent}>
              <strong>Rejection Reason:</strong>
              <p>{program.feedback}</p>
            </div>
          </div>
        )}

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
            <FaTrash /> {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgramCard;

'use client'

import React from 'react'
import { FaTimes, FaTag, FaCalendar, FaEye } from 'react-icons/fa'
import { getProgramImageUrl } from '@/utils/uploadPaths'
import styles from '../programs.module.css'

const ProgramDetailsModal = ({ program, isOpen, onClose }) => {
  if (!isOpen || !program) return null

  // Debug logging to check program data
  console.log('🔍 ProgramDetailsModal - Program data:', program);
  console.log('🔍 Additional images:', program.additional_images);
  console.log('🔍 Additional images length:', program.additional_images?.length);

  // Use the new upload path utility
  const imageSource = getProgramImageUrl(program.image);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatProgramDates = (program) => {
    if (program.multiple_dates && Array.isArray(program.multiple_dates) && program.multiple_dates.length > 0) {
      if (program.multiple_dates.length === 1) {
        return formatDate(program.multiple_dates[0]);
      } else if (program.multiple_dates.length === 2) {
        return `${formatDate(program.multiple_dates[0])} & ${formatDate(program.multiple_dates[1])}`;
      } else {
        return `${formatDate(program.multiple_dates[0])} +${program.multiple_dates.length - 1} more dates`;
      }
    } else if (program.event_start_date && program.event_end_date) {
      const startDate = new Date(program.event_start_date);
      const endDate = new Date(program.event_end_date);
      
      if (startDate.getTime() === endDate.getTime()) {
        return formatDate(program.event_start_date);
      } else {
        return `${formatDate(program.event_start_date)} - ${formatDate(program.event_end_date)}`;
      }
    } else if (program.event_date) {
      return formatDate(program.event_date);
    }
    return 'Not specified';
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

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Program Details</h2>
          <button 
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.contentLayout}>
            {/* Top Section - Image and Program Info Side by Side */}
            <div className={styles.topSection}>
              {/* Left - Program Image */}
              <div className={styles.imageSection}>
                {imageSource ? (
                  <img 
                    src={imageSource}
                    alt={program.title}
                    className={styles.programImage}
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div className={styles.imagePlaceholder} style={{ display: imageSource ? 'none' : 'flex' }}>
                  <FaEye />
                  <span>No image available</span>
                </div>
              </div>

              {/* Right - Program Title, Status, Program Details */}
              <div className={styles.programInfoSection}>
                <h3 className={styles.programTitle}>{program.title}</h3>
                
                {/* Status Badge */}
                {program.status && (
                  <div className={`${styles.statusBadge} ${styles[program.status]}`}>
                    {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                  </div>
                )}

                {/* Program Details */}
                <div className={styles.detailsSection}>
                  <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                      <FaTag className={styles.detailIcon} />
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Category</span>
                        <span className={styles.detailValue}>
                          {getCategoryLabel(program.category)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.detailItem}>
                      <FaCalendar className={styles.detailIcon} />
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Event Date(s)</span>
                        <span className={styles.detailValue}>
                          {formatProgramDates(program)}
                        </span>
                      </div>
                    </div>

                    {program.created_at && (
                      <div className={styles.detailItem}>
                        <FaCalendar className={styles.detailIcon} />
                        <div className={styles.detailContent}>
                          <span className={styles.detailLabel}>Created</span>
                          <span className={styles.detailValue}>
                            {formatDate(program.created_at)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description - Full Width Below */}
            <div className={styles.descriptionSection}>
              <h4 className={styles.sectionTitle}>Description</h4>
              <p className={styles.description}>
                {program.description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Additional Images - Full Width Below */}
          <div className={styles.additionalImagesSection}>
            <h4 className={styles.sectionTitle}>Additional Images</h4>
            <div className={styles.additionalImagesGrid}>
              {program.additional_images && program.additional_images.length > 0 ? (
                program.additional_images.map((imagePath, index) => (
                  <div key={index} className={styles.additionalImageContainer}>
                    <img
                      src={getProgramImageUrl(imagePath, 'additional')}
                      alt={`Additional ${index + 1}`}
                      className={styles.additionalImage}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                ))
              ) : (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                  No additional images available for this program.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.closeModalButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProgramDetailsModal

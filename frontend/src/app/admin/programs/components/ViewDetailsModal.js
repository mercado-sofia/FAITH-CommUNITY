'use client';

import React from 'react';
import Image from 'next/image';
import { FaTimes, FaTag, FaCalendar, FaEye } from 'react-icons/fa';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import styles from './styles/ViewDetailsModal.module.css';

const ViewDetailsModal = ({ program, onClose }) => {
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
        return `${formatDate(program.multiple_dates[0])} +${program.multiple_dates.length - 1} more`;
      }
    } else if (program.event_start_date && program.event_end_date) {
      const startDate = new Date(program.event_start_date);
      const endDate = new Date(program.event_end_date);
      
      if (startDate.getTime() === endDate.getTime()) {
        return formatDate(program.event_start_date);
      } else {
        return `${formatDate(program.event_start_date)} - ${formatDate(program.event_end_date)}`;
      }
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

  return (
    <div className={styles.modalOverlay} onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '14px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '0 10px' }}>
        <div className={styles.modalHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 0 24px', marginBottom: '24px' }}>
          <h2 className={styles.modalTitle} style={{ fontSize: '1.25rem', fontWeight: '700', color: '#06100f', margin: 0 }}>Program Details</h2>
          <button onClick={onClose} className={styles.closeButton} style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalBody} style={{ padding: '0 24px 24px 24px' }}>
          <div className={styles.contentLayout} style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
            {/* Top Section - Image and Program Info Side by Side */}
            <div className={styles.topSection} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>
              {/* Left - Program Image */}
              {program.image ? (
                <div className={styles.imageSection}>
                  <Image
                    src={getProgramImageUrl(program.image) || '/default-profile.png'}
                    alt={program.title}
                    className={styles.programImage}
                    width={600}
                    height={300}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div className={styles.imageSection}>
                  <div className={styles.imagePlaceholder}>
                    <FaEye />
                    <span>No image available</span>
                  </div>
                </div>
              )}

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
          {program.additional_images && program.additional_images.length > 0 && (
            <div className={styles.additionalImagesSection}>
              <h4 className={styles.sectionTitle}>Additional Images</h4>
              <div className={styles.additionalImagesGrid}>
                {program.additional_images.map((imagePath, index) => (
                  <div key={index} className={styles.additionalImageContainer}>
                    <Image
                      src={getProgramImageUrl(imagePath, 'additional')}
                      alt={`Additional ${index + 1}`}
                      className={styles.additionalImage}
                      width={200}
                      height={150}
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.closeModalButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewDetailsModal;

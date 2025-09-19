'use client';

import React from 'react';
import Image from 'next/image';
import { FaTimes, FaTag, FaCalendar, FaEye } from 'react-icons/fa';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import { formatProgramDates, formatDateShort } from '@/utils/dateUtils.js';
import styles from './ViewDetailsModal.module.css';

const ViewDetailsModal = ({ program, onClose }) => {
  // Using centralized date utilities - formatProgramDates is now imported

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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Program Details</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.contentLayout}>
            {/* Top Section - Image and Program Info Side by Side */}
            <div className={styles.topSection}>
              {/* Left - Program Image */}
              {program.image ? (
                <div className={styles.imageSection}>
                  <Image
                    src={getProgramImageUrl(program.image) || '/default-profile.png'}
                    alt={program.title}
                    className={styles.programImage}
                    width={600}
                    height={300}
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
                            {formatDateShort(program.created_at)}
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

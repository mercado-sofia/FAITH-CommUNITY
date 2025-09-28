'use client';

import React from 'react';
import Image from 'next/image';
import { FaTimes, FaTag, FaCalendar, FaEye, FaUsers, FaExclamationTriangle } from 'react-icons/fa';
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
                  {getProgramImageUrl(program.image) === 'IMAGE_UNAVAILABLE' ? (
                    <div className={styles.imagePlaceholder}>
                      <FaExclamationTriangle />
                      <span>Image unavailable</span>
                    </div>
                  ) : (
                    <Image
                      src={getProgramImageUrl(program.image)}
                      alt={program.title}
                      className={styles.programImage}
                      width={600}
                      height={300}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  )}
                  <div className={styles.imageError} style={{display: 'none'}}>
                    <FaExclamationTriangle />
                    <span>Image unavailable</span>
                  </div>
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
                {/* Category at the top */}
                {program.category && (
                  <div className={styles.categoryBadge}>
                    {getCategoryLabel(program.category)}
                  </div>
                )}
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

            {/* Collaboration Section */}
            {(() => {
              // Check if program is collaborative and has valid collaborators
              const hasCollaborators = program.is_collaborative && 
                                     program.collaborators && 
                                     Array.isArray(program.collaborators) && 
                                     program.collaborators.length > 0 &&
                                     program.collaborators.some(collab => 
                                       collab && 
                                       typeof collab === 'object' && 
                                       collab.email && 
                                       collab.email.trim() !== ''
                                     );

              if (!hasCollaborators) {
                return null;
              }

              // Filter out invalid collaborators
              const validCollaborators = program.collaborators.filter(collab => 
                collab && 
                typeof collab === 'object' && 
                collab.email && 
                collab.email.trim() !== ''
              );

              if (validCollaborators.length === 0) {
                return null;
              }

              return (
                <div className={styles.collaborationSection}>
                  <h4 className={styles.sectionTitle}>
                    <FaUsers className={styles.sectionIcon} />
                    Collaborators
                  </h4>
                  <div className={styles.collaboratorsList}>
                    {validCollaborators.map((collaborator, index) => (
                      <div key={collaborator.id || `collab-${index}`} className={styles.collaboratorItem}>
                        <div className={styles.collaboratorInfo}>
                          <span className={styles.collaboratorEmail}>{collaborator.email}</span>
                          {collaborator.organization_acronym && 
                           collaborator.organization_acronym.trim() !== '' && (
                            <span className={styles.collaboratorOrg}>
                              ({collaborator.organization_acronym})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
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
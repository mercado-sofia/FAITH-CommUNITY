import React from 'react';
import Image from 'next/image';
import { FaTimes, FaCheck, FaEye } from 'react-icons/fa';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import styles from './styles/ViewDetailsModal.module.css';

const ViewDetailsModal = ({ 
  isOpen, 
  onClose, 
  submissionData 
}) => {
  if (!isOpen || !submissionData) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSectionDisplayName = (section) => {
    const sectionMap = {
      'organization': 'Organization Information',
      'advocacy': 'Advocacy Information',
      'competency': 'Competency Information',
      'programs': 'Program Information'
    };
    return sectionMap[section] || section;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { text: 'Pending', className: styles.statusPending },
      'approved': { text: 'Approved', className: styles.statusApproved },
      'rejected': { text: 'Rejected', className: styles.statusRejected }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    return (
      <span className={`${styles.statusBadge} ${config.className}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.detailsModal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Submission Details</h3>
          <button 
            onClick={onClose}
            className={styles.modalCloseBtn}
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Section:</span>
              <span className={styles.detailValue}>
                {getSectionDisplayName(submissionData.section)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Submitted By:</span>
              <span className={styles.detailValue}>
                {submissionData.orgName || 'Unknown Organization'} ({submissionData.org || `Org #${submissionData.organization_id}`})
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Submission Date:</span>
              <span className={styles.detailValue}>
                {formatDate(submissionData.submitted_at)}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Status:</span>
              <span className={styles.detailValue}>
                {getStatusBadge(submissionData.status || 'pending')}
              </span>
            </div>
          </div>
          
          <div className={styles.dataComparison}>
            <h4 className={styles.comparisonTitle}>Data Changes</h4>
            <div className={styles.dataChangesContainer}>
              {submissionData.section === 'advocacy' || submissionData.section === 'competency' ? (
                <div className={styles.textComparison}>
                  <div className={styles.comparisonSection}>
                    <h5>Previous Data:</h5>
                    <div className={styles.dataContent}>
                      {submissionData.previous_data || "No previous data"}
                    </div>
                  </div>
                  <div className={styles.comparisonSection}>
                    <h5>Proposed Data:</h5>
                    <div className={styles.dataContent}>
                      {submissionData.proposed_data || "No proposed data"}
                    </div>
                  </div>
                </div>
              ) : submissionData.section === 'programs' ? (
                <div className={styles.programComparison}>
                  <div className={styles.comparisonSection}>
                    <h5>Program Details:</h5>
                    <div className={styles.programDetailsContainer}>
                      {(() => {
                        try {
                          const programData = typeof submissionData.proposed_data === 'string' 
                            ? JSON.parse(submissionData.proposed_data) 
                            : submissionData.proposed_data;
                          return (
                            <div className={styles.programInfo}>
                              <div className={styles.programFieldsGrid}>
                                <div className={styles.programField}>
                                  <strong>Title:</strong> 
                                  <span>{programData.title || 'N/A'}</span>
                                </div>
                                <div className={styles.programField}>
                                  <strong>Category:</strong> 
                                  <span>{programData.category || 'N/A'}</span>
                                </div>
                                <div className={styles.programField}>
                                  <strong>Status:</strong> 
                                  <span className={styles.statusValue}>{programData.status || 'N/A'}</span>
                                </div>
                                {(() => {
                                  // Format event dates for display
                                  if (programData.multiple_dates && Array.isArray(programData.multiple_dates) && programData.multiple_dates.length > 0) {
                                    return (
                                      <div className={styles.programField}>
                                        <strong>Event Dates:</strong>
                                        <div className={styles.eventDatesList}>
                                          {programData.multiple_dates.map((date, index) => (
                                            <span key={index} className={styles.eventDateTag}>
                                              {new Date(date).toLocaleDateString()}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  } else if (programData.event_start_date && programData.event_end_date) {
                                    if (programData.event_start_date === programData.event_end_date) {
                                      return (
                                        <div className={styles.programField}>
                                          <strong>Event Date:</strong> 
                                          <span>{new Date(programData.event_start_date).toLocaleDateString()}</span>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className={styles.programField}>
                                          <strong>Event Date Range:</strong> 
                                          <span>{new Date(programData.event_start_date).toLocaleDateString()} - {new Date(programData.event_end_date).toLocaleDateString()}</span>
                                        </div>
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                              </div>
                              
                              <div className={styles.programDescription}>
                                <div className={styles.programField}>
                                  <strong>Description:</strong>
                                  <div className={styles.descriptionContent}>
                                    {programData.description || 'N/A'}
                                  </div>
                                </div>
                              </div>

                              {programData.image && (
                                <div className={styles.programImagesSection}>
                                  <div className={styles.programField}>
                                    <strong>Main Image:</strong>
                                    <div className={styles.programImage}>
                                      <Image 
                                        src={getProgramImageUrl(programData.image) || '/default-profile.png'} 
                                        alt="Program" 
                                        width={200}
                                        height={150}
                                        style={{objectFit: 'cover', borderRadius: '8px'}} 
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {programData.additionalImages && Array.isArray(programData.additionalImages) && programData.additionalImages.length > 0 && (
                                <div className={styles.programImagesSection}>
                                  <div className={styles.programField}>
                                    <strong>Additional Images ({programData.additionalImages.length}):</strong>
                                    <div className={styles.additionalImagesGrid}>
                                      {programData.additionalImages.map((image, index) => (
                                        <div key={index} className={styles.additionalImageContainer}>
                                          <Image 
                                            src={getProgramImageUrl(image) || '/default-profile.png'} 
                                            alt={`Additional image ${index + 1}`} 
                                            width={100}
                                            height={100}
                                            style={{objectFit: 'cover', borderRadius: '6px'}} 
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        } catch (error) {
                          return (
                            <div className={styles.errorMessage}>
                              Error parsing program data: {error.message}
                            </div>
                          );
                        }
                      })()} 
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.jsonComparison}>
                  <div className={styles.comparisonSection}>
                    <h5>Previous Data:</h5>
                    <div className={styles.jsonDataContainer}>
                      <pre className={styles.jsonData}>
                        {JSON.stringify(submissionData.previous_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div className={styles.comparisonSection}>
                    <h5>Proposed Data:</h5>
                    <div className={styles.jsonDataContainer}>
                      <pre className={styles.jsonData}>
                        {JSON.stringify(submissionData.proposed_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            onClick={onClose}
            className={styles.modalCloseFooterBtn}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewDetailsModal;

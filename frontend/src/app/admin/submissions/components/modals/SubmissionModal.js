import Image from 'next/image';
import { FaTimes, FaTag, FaCalendar, FaEye, FaChartBar, FaExclamationTriangle, FaUsers } from 'react-icons/fa';
import { formatDateShort, formatDateTime } from '@/utils/dateUtils.js';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import styles from './SubmissionModal.module.css';

export default function SubmissionModal({ data, onClose }) {
  const formatData = (dataObj) => {
    // Handle different data types based on section
    if (data.section === 'organization') {
      if (!dataObj || typeof dataObj !== 'object') {
        return dataObj?.toString() || 'No data';
      }
      return (
        <div className={styles.orgData}>
          {dataObj.email && <div className={styles.dataField}><span className={styles.fieldLabel}>Email:</span> {dataObj.email}</div>}
          {dataObj.facebook && <div className={styles.dataField}><span className={styles.fieldLabel}>Facebook:</span> {dataObj.facebook}</div>}
          {dataObj.description && <div className={styles.dataField}><span className={styles.fieldLabel}>Description:</span> {dataObj.description}</div>}
        </div>
      );
    } else if (data.section === 'advocacy' || data.section === 'competency') {
      return (
        <div className={styles.textData}>
          <span className={styles.competencyAdvocacyText}>{dataObj}</span>
        </div>
      );
    } else if (data.section === 'programs') {
      // Format event dates for display
      const formatEventDates = (programData) => {
        if (programData.multiple_dates && Array.isArray(programData.multiple_dates) && programData.multiple_dates.length > 0) {
          return (
            <div className={styles.programDetailItem}>
              <FaCalendar className={styles.detailIcon} />
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>Event Date(s)</span>
                <div className={styles.eventDatesList}>
                  {programData.multiple_dates.map((date, index) => (
                    <span key={index} className={styles.eventDateTag}>
                      {formatDateShort(date)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        } else if (programData.event_start_date && programData.event_end_date) {
          if (programData.event_start_date === programData.event_end_date) {
            return (
              <div className={styles.programDetailItem}>
                <FaCalendar className={styles.detailIcon} />
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Event Date</span>
                  <span className={styles.detailValue}>
                    {formatDateShort(programData.event_start_date)}
                  </span>
                </div>
              </div>
            );
          } else {
            return (
              <div className={styles.programDetailItem}>
                <FaCalendar className={styles.detailIcon} />
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Event Date Range</span>
                  <span className={styles.detailValue}>
                    {formatDateShort(programData.event_start_date)} - {formatDateShort(programData.event_end_date)}
                  </span>
                </div>
              </div>
            );
          }
        }
        return null;
      };

      return (
        <div className={styles.programLayout}>
          {/* Left side - Image */}
          <div className={styles.programImageSection}>
            {dataObj.image ? (
              getProgramImageUrl(dataObj.image) === 'IMAGE_UNAVAILABLE' ? (
                <div className={styles.programImagePlaceholder}>
                  <FaExclamationTriangle />
                  <span>Image unavailable</span>
                </div>
              ) : (
                <Image 
                  src={getProgramImageUrl(dataObj.image)} 
                  alt="Program image" 
                  className={styles.programMainImage}
                  width={300}
                  height={200}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              )
            ) : (
              <div className={styles.programImagePlaceholder}>
                <FaEye />
                <span>No image available</span>
              </div>
            )}
            <div className={styles.programImageError} style={{display: 'none'}}>
              <FaExclamationTriangle />
              <span>Image unavailable</span>
            </div>
          </div>

          {/* Right side - Details */}
          <div className={styles.programDetailsSection}>
            {/* Status Badge - Top Right Corner */}
            {dataObj.status && (
              <span className={`${styles.statusIndicator} ${styles[dataObj.status?.toLowerCase()]}`}>
                {dataObj.status}
              </span>
            )}
            
            {/* Program Title */}
            <div className={styles.programTitle}>{dataObj.title}</div>

            {/* Category, Event Date, and Date Submitted in same row */}
            <div className={styles.programDetailItem}>
              {/* Category */}
              {dataObj.category && (
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>
                    <FaTag className={styles.detailIcon} />
                    Category
                  </span>
                  <span className={styles.detailValue}>{dataObj.category}</span>
                </div>
              )}
              
              {/* Event Dates */}
              {(() => {
                if (dataObj.multiple_dates && Array.isArray(dataObj.multiple_dates) && dataObj.multiple_dates.length > 0) {
                  return (
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>
                        <FaCalendar className={styles.detailIcon} />
                        Event Date(s)
                      </span>
                      <div className={styles.eventDatesList}>
                        {dataObj.multiple_dates.map((date, index) => (
                          <span key={index} className={styles.eventDateTag}>
                            {formatDateShort(date)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                } else if (dataObj.event_start_date && dataObj.event_end_date) {
                  if (dataObj.event_start_date === dataObj.event_end_date) {
                    return (
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>
                          <FaCalendar className={styles.detailIcon} />
                          Event Date
                        </span>
                        <span className={styles.detailValue}>
                          {formatDateShort(dataObj.event_start_date)}
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>
                          <FaCalendar className={styles.detailIcon} />
                          Event Date Range
                        </span>
                        <span className={styles.detailValue}>
                          {formatDateShort(dataObj.event_start_date)} - {formatDateShort(dataObj.event_end_date)}
                        </span>
                      </div>
                    );
                  }
                } else if (dataObj.event_dates && dataObj.event_dates.length > 0) {
                  return (
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>
                        <FaCalendar className={styles.detailIcon} />
                        Event Date
                      </span>
                      <div className={styles.eventDatesList}>
                        {dataObj.event_dates.map((date, index) => (
                          <span key={index} className={styles.eventDateTag}>
                            {formatDateShort(date)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              {/* Date Submitted */}
              <div className={styles.detailContent}>
                <span className={styles.detailLabel}>
                  <FaCalendar className={styles.detailIcon} />
                  Date Submitted
                </span>
                <span className={styles.detailValue}>
                  {formatDateShort(data.submitted_at)}
                </span>
              </div>
            </div>

            {/* Description */}
            {dataObj.description && (
              <div className={styles.programDescription}>
                <div className={styles.descriptionLabel}>Description</div>
                <div className={styles.descriptionText}>{dataObj.description}</div>
              </div>
            )}

            {/* Additional Images */}
            {dataObj.additionalImages && Array.isArray(dataObj.additionalImages) && dataObj.additionalImages.length > 0 && (
              <div className={styles.additionalImagesSection}>
                <div className={styles.additionalImagesLabel}>Additional Images ({dataObj.additionalImages.length})</div>
                <div className={styles.additionalImagesGrid}>
                  {dataObj.additionalImages.map((image, index) => (
                    <div key={index} className={styles.additionalImagePreview}>
                      {getProgramImageUrl(image, 'additional') === 'IMAGE_UNAVAILABLE' ? (
                        <div className={styles.imageError}>
                          <FaExclamationTriangle />
                          <span>Image {index + 1} unavailable</span>
                        </div>
                      ) : (
                        <Image 
                          src={getProgramImageUrl(image, 'additional')} 
                          alt={`Additional image ${index + 1}`} 
                          className={styles.additionalImage}
                          width={120}
                          height={120}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                      )}
                      <div className={styles.imageError} style={{display: 'none'}}>
                        <FaExclamationTriangle />
                        <span>Image {index + 1} unavailable</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collaboration Section */}
            {dataObj.collaborators && Array.isArray(dataObj.collaborators) && dataObj.collaborators.length > 0 && (
              <div className={styles.collaborationSection}>
                <div className={styles.collaborationLabel}>
                  <FaUsers className={styles.collaborationIcon} />
                  Collaborators ({dataObj.collaborators.length})
                </div>
                <div className={styles.collaboratorsList}>
                  {dataObj.collaborators.map((collaborator, index) => (
                    <div key={collaborator.id || index} className={styles.collaboratorItem}>
                      <div className={styles.collaboratorInfo}>
                        <span className={styles.collaboratorEmail}>{collaborator.email || 'Unknown Email'}</span>
                        <span className={styles.collaboratorOrg}>
                          ({collaborator.organization_acronym || collaborator.organization_name || 'Unknown Org'})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Comment for Programs */}
            {data.status === 'rejected' && data.comment_reject && (
              <div className={styles.rejectionSection}>
                <div className={styles.rejectionLabel}>Rejection Reason</div>
                <div className={styles.rejectionComment}>
                  {data.comment_reject}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Fallback to JSON display
    return (
      <pre className={styles.jsonData}>
        {JSON.stringify(dataObj, null, 2)}
      </pre>
    );
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContainer}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2 className={styles.modalTitle}>
              {data.section.charAt(0).toUpperCase() + data.section.slice(1)} Submission Details
            </h2>
            <p className={styles.modalSubtitle}>
              Review the submission information and changes
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {/* Submission Meta */}
          <div className={styles.submissionMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Status</span>
              <span className={`${styles.statusBadge} ${styles[data.status]}`}>
                {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Submitted</span>
                <span className={styles.metaValue}>
                  {formatDateShort(data.submitted_at)}
                </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Time</span>
              <span className={styles.metaValue}>
                {formatDateTime(data.submitted_at)}
              </span>
            </div>
          </div>

          {/* Rejection Feedback */}
          {data.status === 'rejected' && data.comment_reject && (
            <div className={styles.rejectionAlert}>
              <div className={styles.alertIcon}>
                <FaExclamationTriangle />
              </div>
              <div className={styles.alertContent}>
                <h4 className={styles.alertTitle}>Rejection Feedback</h4>
                <p className={styles.alertMessage}>{data.comment_reject}</p>
              </div>
            </div>
          )}

          {/* Data Comparison */}
          <div className={data.section === 'programs' ? styles.dataComparisonSingle : styles.dataComparison}>
            {/* For programs section, show only proposed data without previous data */}
            {data.section === 'programs' ? (
              <div className={styles.dataSection}>
                <h3 className={styles.sectionTitle}>Proposed Program</h3>
                <div className={styles.dataContent}>
                  {formatData(data.proposed_data)}
                </div>
              </div>
            ) : (
              <>
                {/* Previous Data */}
                <div className={styles.dataSection}>
                  <h3 className={styles.sectionTitle}>Previous Data</h3>
                  <div className={styles.dataContent}>
                    {data.previous_data ? (
                      formatData(data.previous_data)
                    ) : (
                      <div className={styles.noData}>No previous data</div>
                    )}
                  </div>
                </div>

                {/* Proposed Data */}
                <div className={styles.dataSection}>
                  <h3 className={styles.sectionTitle}>Proposed Changes</h3>
                  <div className={styles.dataContent}>
                    {formatData(data.proposed_data)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.modalActions}>
          <button 
            className={styles.closeButtonAction} 
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
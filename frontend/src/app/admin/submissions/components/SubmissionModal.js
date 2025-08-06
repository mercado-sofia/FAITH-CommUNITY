import styles from './styles/SubmissionModal.module.css';

export default function SubmissionModal({ data, onClose }) {
  const formatData = (dataObj) => {
    if (!dataObj || typeof dataObj !== 'object') {
      return dataObj?.toString() || 'No data';
    }

    // Handle different data types based on section
    if (data.section === 'organization') {
      return (
        <div className={styles.orgData}>
          {dataObj.org && <div className={styles.dataField}><span className={styles.fieldLabel}>Acronym:</span> {dataObj.org}</div>}
          {dataObj.orgName && <div className={styles.dataField}><span className={styles.fieldLabel}>Name:</span> {dataObj.orgName}</div>}
          {dataObj.email && <div className={styles.dataField}><span className={styles.fieldLabel}>Email:</span> {dataObj.email}</div>}
          {dataObj.facebook && <div className={styles.dataField}><span className={styles.fieldLabel}>Facebook:</span> {dataObj.facebook}</div>}
          {dataObj.description && <div className={styles.dataField}><span className={styles.fieldLabel}>Description:</span> {dataObj.description}</div>}
        </div>
      );
    } else if (data.section === 'advocacy' || data.section === 'competency') {
      return (
        <div className={styles.textData}>
          <p className={styles.textContent}>{dataObj}</p>
        </div>
      );
    } else if (data.section === 'programs') {
      return (
        <div className={styles.programData}>
          {dataObj.title && <div className={styles.dataField}><span className={styles.fieldLabel}>Title:</span> {dataObj.title}</div>}
          {dataObj.description && <div className={styles.dataField}><span className={styles.fieldLabel}>Description:</span> {dataObj.description}</div>}
          {dataObj.category && <div className={styles.dataField}><span className={styles.fieldLabel}>Category:</span> {dataObj.category}</div>}
          {dataObj.status && <div className={styles.dataField}><span className={styles.fieldLabel}>Status:</span> <span className={`${styles.statusIndicator} ${styles[dataObj.status?.toLowerCase()]}`}>{dataObj.status}</span></div>}
          {dataObj.date && <div className={styles.dataField}><span className={styles.fieldLabel}>Date:</span> {new Date(dataObj.date).toLocaleDateString()}</div>}
          {dataObj.image && (
            <div className={styles.dataField}>
              <span className={styles.fieldLabel}>Image:</span>
              <div className={styles.imagePreview}>
                <img 
                  src={dataObj.image} 
                  alt="Program image" 
                  className={styles.programImage}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className={styles.imageError} style={{display: 'none'}}>Image preview unavailable</div>
              </div>
            </div>
          )}
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
            ×
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
                {new Date(data.submitted_at).toLocaleDateString()}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Time</span>
              <span className={styles.metaValue}>
                {new Date(data.submitted_at).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Rejection Feedback */}
          {data.status === 'rejected' && data.rejection_reason && (
            <div className={styles.rejectionAlert}>
              <div className={styles.alertIcon}>⚠️</div>
              <div className={styles.alertContent}>
                <h4 className={styles.alertTitle}>Rejection Feedback</h4>
                <p className={styles.alertMessage}>{data.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* Data Comparison */}
          <div className={styles.dataComparison}>
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
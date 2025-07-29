import React from 'react';
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
      'competency': 'Competency Information'
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
            ) : (
              <div className={styles.jsonComparison}>
                <div className={styles.comparisonSection}>
                  <h5>Previous Data:</h5>
                  <pre className={styles.jsonData}>
                    {JSON.stringify(submissionData.previous_data, null, 2)}
                  </pre>
                </div>
                <div className={styles.comparisonSection}>
                  <h5>Proposed Data:</h5>
                  <pre className={styles.jsonData}>
                    {JSON.stringify(submissionData.proposed_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
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

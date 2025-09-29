import { useState } from 'react';
import { formatDateShort } from '@/utils/dateUtils.js';
import styles from './ReEditModal.module.css';

// Helper function to initialize form data based on submission section
const initializeFormData = (submission) => {
  const proposedData = submission?.proposed_data || {};
  
  if (submission?.section === 'organization') {
    return {
      email: proposedData?.email || '',
      facebook: proposedData?.facebook || '',
      description: proposedData?.description || ''
    };
  } else if (submission?.section === 'advocacy') {
    return {
      advocacy: typeof proposedData === 'string' ? proposedData : (proposedData?.advocacy || '')
    };
  } else if (submission?.section === 'competency') {
    return {
      competency: typeof proposedData === 'string' ? proposedData : (proposedData?.competency || '')
    };
  }
  
  return proposedData || {};
};

export default function ReEditModal({ submission, onClose, onSave }) {
  const [formData, setFormData] = useState(() => initializeFormData(submission));
  const [originalData] = useState(() => initializeFormData(submission));
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleInputChange = (field, value) => {
    // Sanitize input to prevent XSS
    const sanitizedValue = typeof value === 'string' ? value.replace(/<script[^>]*>.*?<\/script>/gi, '') : value;
    
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
  };

  const hasChanges = () => {
    if (!submission?.section) return false;

    if (submission.section === 'organization') {
      // Compare organization fields (org and orgName are now managed in admin settings)
      const fields = ['email', 'facebook', 'description'];
      return fields.some(field => {
        const original = (originalData[field] || '').toString().trim();
        const current = (formData[field] || '').toString().trim();
        return original !== current;
      });
    } else if (submission.section === 'advocacy') {
      const originalContent = (originalData.advocacy || '').toString().trim();
      const currentContent = (formData.advocacy || '').toString().trim();
      return originalContent !== currentContent;
    } else if (submission.section === 'competency') {
      const originalContent = (originalData.competency || '').toString().trim();
      const currentContent = (formData.competency || '').toString().trim();
      return originalContent !== currentContent;
    }

    return false;
  };

  const validateFormData = () => {
    if (!submission?.section) {
      return { isValid: false, message: 'Invalid submission section' };
    }

    // Check if any changes were made
    if (!hasChanges()) {
      return { isValid: false, message: 'Please make some changes before saving' };
    }

    if (submission.section === 'organization') {
      // Validate organization fields (org and orgName are now managed in admin settings)
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
      }
      if (formData.facebook && !/^https?:\/\/.+/.test(formData.facebook)) {
        return { isValid: false, message: 'Facebook link must be a valid URL starting with http:// or https://' };
      }
      // Check if at least one organization field has content (excluding org/orgName)
      const relevantFields = ['email', 'facebook', 'description'];
      const hasContent = relevantFields.some(field => 
        formData[field] && formData[field].toString().trim() !== ''
      );
      if (!hasContent) {
        return { isValid: false, message: 'Please fill in at least one organization field' };
      }
    } else if (submission.section === 'advocacy') {
      const advocacyContent = formData?.advocacy?.trim();
      if (!advocacyContent) {
        return { isValid: false, message: 'Advocacy information cannot be empty' };
      }
      if (advocacyContent.length < 10) {
        return { isValid: false, message: 'Advocacy information must be at least 10 characters long' };
      }
    } else if (submission.section === 'competency') {
      const competencyContent = formData?.competency?.trim();
      if (!competencyContent) {
        return { isValid: false, message: 'Competency information cannot be empty' };
      }
    }

    return { isValid: true };
  };

  const handleSave = async () => {
    // Clear previous validation errors
    setValidationError('');
    
    // Validate form data before saving
    const validation = validateFormData();
    if (!validation.isValid) {
      setValidationError(validation.message);
      return;
    }

    setIsLoading(true);
    try {
      // Trim whitespace for advocacy and competency content before saving
      const trimmedFormData = { ...formData };
      if (submission?.section === 'advocacy' && trimmedFormData.advocacy) {
        trimmedFormData.advocacy = trimmedFormData.advocacy.trim();
      } else if (submission?.section === 'competency' && trimmedFormData.competency) {
        trimmedFormData.competency = trimmedFormData.competency.trim();
      }
      
      await onSave(submission.id, trimmedFormData);
      onClose();
    } catch (error) {
      // Let the parent component handle the error message
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormFields = () => {
    if (!submission?.section) {
      return (
        <div className={styles.formFields}>
          <p>Error: No section information available</p>
        </div>
      );
    }

    if (submission.section === 'organization') {
      return (
        <div className={styles.formFields}>
          <div className={styles.fieldGroup}>
            <label>Email:</label>
            <input
              type="email"
              value={formData?.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={styles.formInput}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label>Facebook Link:</label>
            <input
              type="url"
              value={formData?.facebook || ''}
              onChange={(e) => handleInputChange('facebook', e.target.value)}
              className={styles.formInput}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label>Description:</label>
            <textarea
              value={formData?.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={styles.formTextarea}
              rows={4}
            />
          </div>
        </div>
      );
    } else if (submission.section === 'advocacy') {
      return (
        <div className={styles.formFields}>
          <div className={styles.fieldGroup}>
            <label>Advocacy Information:</label>
            <textarea
              value={formData?.advocacy || ''}
              onChange={(e) => handleInputChange('advocacy', e.target.value)}
              className={styles.formTextarea}
              rows={8}
              placeholder="Enter advocacy information..."
            />
          </div>
        </div>
      );
    } else if (submission.section === 'competency') {
      return (
        <div className={styles.formFields}>
          <div className={styles.fieldGroup}>
            <label>Competency Information:</label>
            <textarea
              value={formData?.competency || ''}
              onChange={(e) => handleInputChange('competency', e.target.value)}
              className={styles.formTextarea}
              rows={8}
              placeholder="Enter competency information..."
            />
          </div>
        </div>
      );
    }
    
    return (
      <div className={styles.formFields}>
        <p>Unsupported section type: {submission?.section || 'unknown'}</p>
      </div>
    );
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContainer}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2 className={styles.modalTitle}>
              Edit {submission.section.charAt(0).toUpperCase() + submission.section.slice(1)} Submission
            </h2>
            <p className={styles.modalSubtitle}>
              Make changes to your submission and save to update
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {/* Submission Info */}
          <div className={styles.submissionMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Status</span>
              <span className={`${styles.statusBadge} ${styles[submission.status]}`}>
                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Submitted</span>
              <span className={styles.metaValue}>
                {formatDateShort(submission.submitted_at)}
              </span>
            </div>
          </div>

          {/* Rejection Feedback */}
          {submission.rejection_reason && (
            <div className={styles.rejectionAlert}>
              <div className={styles.alertIcon}>⚠️</div>
              <div className={styles.alertContent}>
                <h4 className={styles.alertTitle}>Rejection Feedback</h4>
                <p className={styles.alertMessage}>{submission.rejection_reason}</p>
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className={styles.validationError}>
              <div className={styles.errorIcon}>⚠️</div>
              <div className={styles.errorMessage}>{validationError}</div>
            </div>
          )}

          {/* Form Fields */}
          <div className={styles.formSection}>
            {renderFormFields()}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.modalActions}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
            disabled={isLoading}
            type="button"
          >
            Cancel
          </button>
          <button 
            className={styles.saveButton} 
            onClick={handleSave}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

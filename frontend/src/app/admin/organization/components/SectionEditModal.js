'use client'

import { useEffect } from 'react'
import styles from './styles/SectionEditModal.module.css'

export default function SectionEditModal({
  isOpen,
  currentSection,
  advocacyData,
  competencyData,
  handleInputChange,
  handleSave,
  handleCancel,
  saving,
  originalData
}) {
  // Lock body scroll when modal is open to prevent background shifting
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Lock body scroll and maintain position
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore body scroll and position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Check if any changes have been made
  const hasChanges = () => {
    if (!originalData) return false;
    
    if (currentSection === 'advocacy') {
      return originalData.advocacy !== advocacyData.advocacy;
    }
    
    if (currentSection === 'competency') {
      return originalData.competency !== competencyData.competency;
    }
    
    return false;
  };

  if (!isOpen) return null

  // Organization fields are now handled by the main EditModal component
  // This modal only handles advocacy and competency sections

  const renderAdvocacyFields = () => (
    <div className={styles.formSection}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Advocacy Information:</label>
        <textarea
          name="advocacy"
          value={advocacyData.advocacy}
          onChange={handleInputChange}
          className={styles.textarea}
          placeholder="Enter your organization's advocacy information, mission, vision, goals, programs, and initiatives..."
          rows={6}
        />
      </div>
    </div>
  )

  const renderCompetencyFields = () => (
    <div className={styles.formSection}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Competency Information:</label>
        <textarea
          name="competency"
          value={competencyData.competency}
          onChange={handleInputChange}
          className={styles.textarea}
          placeholder="Enter your organization's competencies, expertise areas, certifications, partnerships, resources, and achievements..."
          rows={6}
        />
      </div>
    </div>
  )

  const getSectionTitle = () => {
    switch(currentSection) {
      case 'organization': return 'Organization Details'
      case 'advocacy': return 'Advocacy Details'
      case 'competency': return 'Competency Details'
      default: return 'Details'
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{getSectionTitle()}</h2>
          <button 
            className={styles.closeButton}
            onClick={handleCancel}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.mainContent}>
            {currentSection === 'advocacy' && renderAdvocacyFields()}
            {currentSection === 'competency' && renderCompetencyFields()}

            {/* Action Buttons */}
            <div className={styles.buttonSection}>
              <button 
                onClick={handleCancel}
                className={styles.cancelButton}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className={styles.saveButton}
                disabled={saving || !hasChanges()}
              >
                {saving ? (
                  <>
                    <span className={styles.spinner}></span>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

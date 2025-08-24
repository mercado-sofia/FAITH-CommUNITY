'use client'


import { useModalScrollLock, useFormChanges } from '../hooks'
import { AutoResizeTextarea } from './components'
import styles from './SectionEditModal.module.css'

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
  // Use custom hooks for modal functionality
  useModalScrollLock(isOpen);
  const { hasSectionChangesFromData } = useFormChanges();

  // Check if any changes have been made using the custom hook
  const hasChanges = () => hasSectionChangesFromData(originalData, advocacyData, currentSection);

  if (!isOpen) return null

  // Organization fields are now handled by the main EditModal component
  // This modal only handles advocacy and competency sections

  const renderAdvocacyFields = () => (
    <div className={styles.formSection}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Advocacy Information:</label>
        <AutoResizeTextarea
          name="advocacy"
          value={advocacyData.advocacy}
          onChange={handleInputChange}
          placeholder="Enter your organization's advocacy information, mission, vision, goals, programs, and initiatives..."
        />
      </div>
    </div>
  )

  const renderCompetencyFields = () => (
    <div className={styles.formSection}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Competency Information:</label>
        <AutoResizeTextarea
          name="competency"
          value={competencyData.competency}
          onChange={handleInputChange}
          placeholder="Enter your organization's competencies, expertise areas, certifications, partnerships, resources, and achievements..."
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

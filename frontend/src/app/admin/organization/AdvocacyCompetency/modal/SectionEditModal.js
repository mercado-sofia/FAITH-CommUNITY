'use client'

import { useModalScrollLock, useFormChanges } from '../../hooks'
import AutoResizeTextarea from '../components/AutoResizeTextarea'
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

  // Get current input value based on section
  const getCurrentValue = () => {
    if (currentSection === 'advocacy') {
      return advocacyData?.advocacy || '';
    } else if (currentSection === 'competency') {
      return competencyData?.competency || '';
    }
    return '';
  };

  // Get character count
  const getCharacterCount = () => {
    const value = getCurrentValue();
    return value ? value.trim().length : 0;
  };

  // Check if input is valid (at least 10 characters)
  const isValidInput = () => {
    const count = getCharacterCount();
    return count === 0 || count >= 10; // Allow empty (will be saved as empty) or at least 10 chars
  };

  // Check if save should be disabled
  const isSaveDisabled = () => {
    return saving || !hasChanges() || !isValidInput();
  };

  if (!isOpen) return null

  // Organization fields are now handled by the main EditModal component
  // This modal only handles advocacy and competency sections

  const renderAdvocacyFields = () => {
    const charCount = getCharacterCount();
    const isValid = isValidInput();
    
    return (
      <div className={styles.formSection}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Advocacy Information:</label>
          <AutoResizeTextarea
            name="advocacy"
            value={advocacyData.advocacy}
            onChange={handleInputChange}
            placeholder="Enter your organization's advocacy information, mission, vision, goals, programs, and initiatives..."
          />
          <div className={styles.characterCount}>
            <span className={isValid ? styles.validCount : styles.invalidCount}>
              {charCount} {charCount === 1 ? 'character' : 'characters'}
            </span>
            {!isValid && charCount > 0 && (
              <span className={styles.errorMessage}>
                (Minimum 10 characters required)
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCompetencyFields = () => {
    const charCount = getCharacterCount();
    const isValid = isValidInput();
    
    return (
      <div className={styles.formSection}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Competency Information:</label>
          <AutoResizeTextarea
            name="competency"
            value={competencyData.competency}
            onChange={handleInputChange}
            placeholder="Enter your organization's competencies, expertise areas, certifications, partnerships, resources, and achievements..."
          />
          <div className={styles.characterCount}>
            <span className={isValid ? styles.validCount : styles.invalidCount}>
              {charCount} {charCount === 1 ? 'character' : 'characters'}
            </span>
            {!isValid && charCount > 0 && (
              <span className={styles.errorMessage}>
                (Minimum 10 characters required)
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

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
                disabled={isSaveDisabled()}
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

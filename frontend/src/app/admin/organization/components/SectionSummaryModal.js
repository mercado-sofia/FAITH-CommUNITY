'use client'

import Image from 'next/image'
import styles from './styles/SummaryModal.module.css'

export default function SectionSummaryModal({
  isOpen,
  currentSection,
  originalData,
  pendingChanges,
  saving,
  handleCancelModal,
  handleConfirmChanges
}) {
  if (!isOpen || !originalData || !pendingChanges) return null

  const getSectionTitle = () => {
    switch(currentSection) {
      case 'organization': return 'Organization Information'
      case 'advocacy': return 'Advocacy Information'
      case 'competency': return 'Competency Information'
      default: return 'Information'
    }
  }

  const getActionButtonText = () => {
    switch(currentSection) {
      case 'organization': return 'Confirm Changes'
      case 'advocacy': 
      case 'competency': 
        return 'Submit for Approval'
      default: return 'Confirm Changes'
    }
  }

  const getWarningText = () => {
    switch(currentSection) {
      case 'organization': 
        return 'Confirming these changes will immediately update your organization information on the official website.'
      case 'advocacy': 
      case 'competency': 
        return 'Submitting these changes will send them to the superadmin for approval. Changes will not be visible until approved.'
      default: 
        return 'Please review your changes before confirming.'
    }
  }

  const renderFieldComparison = (fieldName, label, originalValue, newValue) => {
    if (originalValue === newValue) return null

    return (
      <div key={fieldName} className={styles.changeItem}>
        <h4 className={styles.fieldLabel}>{label}</h4>
        <div className={styles.comparison}>
          <div className={styles.beforeSection}>
            <span className={styles.sectionLabel}>Previous:</span>
            {fieldName === 'logo' ? (
              originalValue ? (
                <Image
                  src={originalValue}
                  alt="Previous logo"
                  width={60}
                  height={60}
                  className={styles.logoPreview}
                />
              ) : (
                <span className={styles.emptyValue}>No logo</span>
              )
            ) : (
              <span className={styles.value}>{originalValue || "Not specified"}</span>
            )}
          </div>
          <div className={styles.afterSection}>
            <span className={styles.sectionLabel}>New:</span>
            {fieldName === 'logo' ? (
              newValue ? (
                <Image
                  src={newValue}
                  alt="New logo"
                  width={60}
                  height={60}
                  className={styles.logoPreview}
                />
              ) : (
                <span className={styles.emptyValue}>No logo</span>
              )
            ) : (
              <span className={styles.value}>{newValue || "Not specified"}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderOrganizationChanges = () => {
    const changes = []
    
    if (originalData.logo !== pendingChanges.logo) {
      changes.push(renderFieldComparison('logo', 'Logo', originalData.logo, pendingChanges.logo))
    }
    if (originalData.org !== pendingChanges.org) {
      changes.push(renderFieldComparison('org', 'Organization Acronym', originalData.org, pendingChanges.org))
    }
    if (originalData.orgName !== pendingChanges.orgName) {
      changes.push(renderFieldComparison('orgName', 'Organization Name', originalData.orgName, pendingChanges.orgName))
    }
    if (originalData.email !== pendingChanges.email) {
      changes.push(renderFieldComparison('email', 'Email', originalData.email, pendingChanges.email))
    }
    if (originalData.facebook !== pendingChanges.facebook) {
      changes.push(renderFieldComparison('facebook', 'Facebook Link', originalData.facebook, pendingChanges.facebook))
    }
    if (originalData.description !== pendingChanges.description) {
      changes.push(renderFieldComparison('description', 'Description', originalData.description, pendingChanges.description))
    }

    return changes
  }

  const renderAdvocacyChanges = () => {
    const changes = []
    
    if (originalData.advocacy !== pendingChanges.advocacy) {
      changes.push(renderFieldComparison('advocacy', 'Advocacy Information', originalData.advocacy, pendingChanges.advocacy))
    }

    return changes
  }

  const renderCompetencyChanges = () => {
    const changes = []
    
    if (originalData.competency !== pendingChanges.competency) {
      changes.push(renderFieldComparison('competency', 'Competency Information', originalData.competency, pendingChanges.competency))
    }

    return changes
  }

  const renderChanges = () => {
    switch(currentSection) {
      case 'organization': return renderOrganizationChanges()
      case 'advocacy': return renderAdvocacyChanges()
      case 'competency': return renderCompetencyChanges()
      default: return []
    }
  }

  const changes = renderChanges()

  if (changes.length === 0) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContainer}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>No Changes Detected</h2>
          </div>
          <div className={styles.modalContent}>
            <p className={styles.noChangesText}>No changes were made to the {getSectionTitle().toLowerCase()}.</p>
            <div className={styles.buttonSection}>
              <button onClick={handleCancelModal} className={styles.cancelButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Review {getSectionTitle()} Changes</h2>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.warningSection}>
            <p className={styles.warningText}>
              {getWarningText()}
            </p>
          </div>

          <div className={styles.changesSection}>
            <h3 className={styles.changesTitle}>Summary of Changes:</h3>
            <div className={styles.changesList}>
              {changes}
            </div>
          </div>

          <div className={styles.buttonSection}>
            <button 
              onClick={handleCancelModal}
              className={styles.cancelButton}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirmChanges}
              className={styles.confirmButton}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Processing...
                </>
              ) : (
                getActionButtonText()
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

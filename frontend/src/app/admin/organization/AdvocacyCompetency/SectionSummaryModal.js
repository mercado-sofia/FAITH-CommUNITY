// SectionSummaryModal.js
'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { AiOutlineExclamationCircle } from 'react-icons/ai'
import styles from './SectionSummaryModal.module.css'

export default function SectionSummaryModal({
  isOpen,
  currentSection,
  originalData,
  pendingChanges,
  saving,
  handleCancelModal,
  handleConfirmChanges,
}) {
  // Lock background scroll while modal is open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen || !originalData || !pendingChanges) return null

  const getSectionTitle = () => {
    switch (currentSection) {
      case 'organization':
        return 'Organization Information'
      case 'advocacy':
        return 'Advocacy Information'
      case 'competency':
        return 'Competency Information'
      default:
        return 'Information'
    }
  }

  const getActionButtonText = () => {
    switch (currentSection) {
      case 'organization':
        return 'Confirm Changes'
      case 'advocacy':
      case 'competency':
        return 'Submit for Approval'
      default:
        return 'Confirm Changes'
    }
  }

  const getWarningText = () => {
    switch (currentSection) {
      case 'organization':
        return 'Confirming these changes will immediately update your organization information on the official website.'
      case 'advocacy':
      case 'competency':
        return 'Submitting these changes will send them to the superadmin for approval. Changes will not be visible until approved.'
      default:
        return 'Please review your changes before confirming.'
    }
  }

  const renderFieldComparison = (fieldName, originalValue, newValue) => {
    if (originalValue === newValue) return null

    const formatText = (text) => {
      if (!text) return 'Not specified'
      return String(text).trim()
    }

    return (
      <div key={fieldName} className={styles.changeItem}>
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
              <div className={styles.value}>{formatText(originalValue)}</div>
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
              <div className={styles.value}>{formatText(newValue)}</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // --- Per-section diffs (only show changed fields) ---
  const renderOrganizationChanges = () => {
    const changes = []

    if (originalData.logo !== pendingChanges.logo) {
      changes.push(
        renderFieldComparison('logo', originalData.logo, pendingChanges.logo)
      )
    }
    if (originalData.org !== pendingChanges.org) {
      changes.push(
        renderFieldComparison('org', originalData.org, pendingChanges.org)
      )
    }
    if (originalData.orgName !== pendingChanges.orgName) {
      changes.push(
        renderFieldComparison(
          'orgName',
          originalData.orgName,
          pendingChanges.orgName
        )
      )
    }
    if (originalData.email !== pendingChanges.email) {
      changes.push(
        renderFieldComparison('email', originalData.email, pendingChanges.email)
      )
    }
    if (originalData.facebook !== pendingChanges.facebook) {
      changes.push(
        renderFieldComparison(
          'facebook',
          originalData.facebook,
          pendingChanges.facebook
        )
      )
    }
    if (originalData.description !== pendingChanges.description) {
      changes.push(
        renderFieldComparison(
          'description',
          originalData.description,
          pendingChanges.description
        )
      )
    }

    return changes
  }

  const renderAdvocacyChanges = () => {
    const changes = []
    if (originalData.advocacy !== pendingChanges.advocacy) {
      changes.push(
        renderFieldComparison(
          'advocacy',
          originalData.advocacy,
          pendingChanges.advocacy
        )
      )
    }
    return changes
  }

  const renderCompetencyChanges = () => {
    const changes = []
    if (originalData.competency !== pendingChanges.competency) {
      changes.push(
        renderFieldComparison(
          'competency',
          originalData.competency,
          pendingChanges.competency
        )
      )
    }
    return changes
  }

  const renderChanges = () => {
    switch (currentSection) {
      case 'organization':
        return renderOrganizationChanges()
      case 'advocacy':
        return renderAdvocacyChanges()
      case 'competency':
        return renderCompetencyChanges()
      default:
        return []
    }
  }

  const changes = renderChanges()

  const getSectionDisplayName = () => {
    switch (currentSection) {
      case 'organization':
        return 'Organization'
      case 'advocacy':
        return 'Advocacy'
      case 'competency':
        return 'Competency'
      default:
        return 'Information'
    }
  }

  if (changes.length === 0) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContainer}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>No Changes Detected</h2>
          </div>

          {/* scroll area kept for consistent layout */}
          <div className={styles.modalScrollArea}>
            <div className={styles.modalContent}>
              <p className={styles.noChangesText}>
                No changes were made to the {getSectionTitle().toLowerCase()}.
              </p>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button onClick={handleCancelModal} className={styles.modalCancelBtn}>
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        {/* Header (fixed) */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Review {getSectionTitle()} Changes</h2>
        </div>

                 {/* Scrollable area */}
         <div className={styles.modalScrollArea}>
           <div className={styles.modalContent}>
             <div className={styles.changesSection}>
               <h3 className={styles.changesTitle}>Section: {getSectionDisplayName()}</h3>
               <div className={styles.changesList}>{changes}</div>
             </div>

             <div className={styles.warningSection}>
               <div className={styles.warningContent}>
                 <AiOutlineExclamationCircle className={styles.warningIcon} />
                 <p className={styles.warningText}>{getWarningText()}</p>
               </div>
             </div>
           </div>
         </div>

        {/* Actions (fixed) */}
        <div className={styles.modalActions}>
          <button
            onClick={handleCancelModal}
            className={styles.modalCancelBtn}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            onClick={handleConfirmChanges}
            className={styles.modalConfirmBtn}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className={styles.spinner} />
                Processing...
              </>
            ) : (
              getActionButtonText()
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
"use client";

import { useEffect } from 'react';
import Image from "next/image";
import { AiOutlineExclamationCircle } from 'react-icons/ai';
import { getOrganizationImageUrl } from "@/utils/uploadPaths";
import styles from "./SummaryModal.module.css";

export default function SummaryModal({
  isOpen = true, // Default to true for backward compatibility
  currentSection = 'organization', // 'organization', 'advocacy', or 'competency'
  originalData,
  pendingChanges,
  saving,
  handleCancelModal,
  handleConfirmChanges
}) {
  // Lock background scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !originalData || !pendingChanges) return null;

  const fieldLabels = {
    logo: "Organization Logo",
    org: "Organization Acronym",
    orgName: "Organization Name",
    email: "Email",
    facebook: "Facebook Link",
    description: "Description",
    advocacy: "Advocacy",
    competency: "Competency"
  };

  const getSectionTitle = () => {
    switch (currentSection) {
      case 'organization':
        return 'Organization Information';
      case 'advocacy':
        return 'Advocacy Information';
      case 'competency':
        return 'Competency Information';
      default:
        return 'Information';
    }
  };

  const getActionButtonText = () => {
    switch (currentSection) {
      case 'organization':
        return 'Confirm Changes';
      case 'advocacy':
      case 'competency':
        return 'Save Changes';
      default:
        return 'Confirm Changes';
    }
  };

  const getWarningText = () => {
    switch (currentSection) {
      case 'organization':
        return 'Confirming these changes will immediately update your organization information on the official website.';
      case 'advocacy':
      case 'competency':
        return 'Saving these changes will immediately update the information on the official website.';
      default:
        return 'Please review your changes before confirming.';
    }
  };

  // Render field comparison for organization section
  const renderOrganizationChanges = () => {
    const changes = [];

    // Check each organization field
    Object.keys(pendingChanges).forEach((key) => {
      if (key === "id" || key === "email" || originalData[key] === pendingChanges[key]) {
        return;
      }

      changes.push(
        <div key={key} className={styles.changeItem}>
          <h4 className={styles.fieldName}>{fieldLabels[key] || key}</h4>
          <div className={styles.comparison}>
            <div className={styles.beforeSection}>
              <div className={styles.sectionLabel}>Previous</div>
              <div className={styles.value}>
                {key === "logo" ? (
                  originalData[key] ? (
                    <Image
                      src={getOrganizationImageUrl(originalData[key], 'logo')}
                      alt="Previous logo"
                      width={60}
                      height={60}
                      className={styles.logoPreview}
                    />
                  ) : (
                    <span style={{ fontStyle: 'italic' }}>No previous data</span>
                  )
                ) : (
                  originalData[key] || <span style={{ fontStyle: 'italic' }}>No previous data</span>
                )}
              </div>
            </div>
            <div className={styles.afterSection}>
              <div className={styles.sectionLabel}>New</div>
              <div className={styles.value}>
                {key === "logo" ? (
                  pendingChanges[key] ? (
                    <Image
                      src={getOrganizationImageUrl(pendingChanges[key], 'logo')}
                      alt="New logo"
                      width={60}
                      height={60}
                      className={styles.logoPreview}
                    />
                  ) : (
                    <span className={styles.emptyValue}>No logo</span>
                  )
                ) : (
                  pendingChanges[key] || <span className={styles.emptyValue}>Empty</span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });

    return changes;
  };

  // Render field comparison for advocacy section
  const renderAdvocacyChanges = () => {
    if (originalData.advocacy === pendingChanges.advocacy) return [];

    return [
      <div key="advocacy" className={styles.changeItem}>
        <h4 className={styles.fieldName}>{fieldLabels.advocacy}</h4>
        <div className={styles.comparison}>
          <div className={styles.beforeSection}>
            <div className={styles.sectionLabel}>Previous</div>
            <div className={styles.value}>
              {originalData.advocacy || <span style={{ fontStyle: 'italic' }}>No previous data</span>}
            </div>
          </div>
          <div className={styles.afterSection}>
            <div className={styles.sectionLabel}>New</div>
            <div className={styles.value}>
              {pendingChanges.advocacy || <span className={styles.emptyValue}>Empty</span>}
            </div>
          </div>
        </div>
      </div>
    ];
  };

  // Render field comparison for competency section
  const renderCompetencyChanges = () => {
    if (originalData.competency === pendingChanges.competency) return [];

    return [
      <div key="competency" className={styles.changeItem}>
        <h4 className={styles.fieldName}>{fieldLabels.competency}</h4>
        <div className={styles.comparison}>
          <div className={styles.beforeSection}>
            <div className={styles.sectionLabel}>Previous</div>
            <div className={styles.value}>
              {originalData.competency || <span style={{ fontStyle: 'italic' }}>No previous data</span>}
            </div>
          </div>
          <div className={styles.afterSection}>
            <div className={styles.sectionLabel}>New</div>
            <div className={styles.value}>
              {pendingChanges.competency || <span className={styles.emptyValue}>Empty</span>}
            </div>
          </div>
        </div>
      </div>
    ];
  };

  // Get changes based on current section
  const getChanges = () => {
    switch (currentSection) {
      case 'organization':
        return renderOrganizationChanges();
      case 'advocacy':
        return renderAdvocacyChanges();
      case 'competency':
        return renderCompetencyChanges();
      default:
        return [];
    }
  };

  const changes = getChanges();

  // Show "No Changes" message if no changes detected
  if (changes.length === 0) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContainer}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>No Changes Detected</h2>
          </div>

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
    );
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Review {getSectionTitle()} Changes</h2>
        </div>

        <div className={styles.modalScrollArea}>
          <div className={styles.modalContent}>
            <div className={styles.changesContainer}>
              {changes}
            </div>

            <div className={styles.warningMessage}>
              <div className={styles.warningContent}>
                <AiOutlineExclamationCircle className={styles.warningIcon} />
                <p>
                  <strong>Important:</strong> {getWarningText()}
                </p>
              </div>
            </div>
          </div>
        </div>

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
                <span className={styles.spinner}></span>
                Applying Changes...
              </>
            ) : (
              getActionButtonText()
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


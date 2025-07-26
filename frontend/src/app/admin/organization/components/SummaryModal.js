"use client";

import Image from "next/image";
import styles from "./styles/SummaryModal.module.css";

export default function SummaryModal({
  originalData,
  pendingChanges,
  saving,
  handleCancelModal,
  handleConfirmChanges
}) {
  const fieldLabels = {
    logo: "Organization Logo",
    org: "Organization Acronym",
    orgName: "Organization Name",
    email: "Email",
    facebook: "Facebook Link",
    description: "Description"
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Confirm Changes</h2>
          <p className={styles.modalSubtitle}>
            Please review the changes below before applying them to the official website.
          </p>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.changesContainer}>
            {Object.keys(pendingChanges).map((key) => {
              if (key === "id" || originalData[key] === pendingChanges[key]) return null;

              return (
                <div key={key} className={styles.changeItem}>
                  <h4 className={styles.fieldName}>{fieldLabels[key] || key}</h4>
                  <div className={styles.comparison}>
                    <div className={styles.previousValue}>
                      <span className={styles.label}>Previous:</span>
                      <div className={styles.value}>
                        {key === "logo" ? (
                          originalData[key] ? (
                            <Image
                              src={originalData[key]}
                              alt="Previous logo"
                              width={60}
                              height={60}
                              className={styles.logoPreview}
                            />
                          ) : (
                            <span className={styles.emptyValue}>No logo</span>
                          )
                        ) : (
                          originalData[key] || <span className={styles.emptyValue}>Empty</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.arrow}>→</div>
                    <div className={styles.newValue}>
                      <span className={styles.label}>New:</span>
                      <div className={styles.value}>
                        {key === "logo" ? (
                          pendingChanges[key] ? (
                            <Image
                              src={pendingChanges[key]}
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
            })}
          </div>

          <div className={styles.warningMessage}>
            <div className={styles.warningIcon}>⚠️</div>
            <p>
              <strong>Important:</strong> Confirming these changes will immediately apply them to
              the official website. This action cannot be undone.
            </p>
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
              "Confirm Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
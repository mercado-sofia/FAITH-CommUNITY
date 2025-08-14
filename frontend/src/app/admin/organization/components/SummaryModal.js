"use client";

import Image from "next/image";
import { AiOutlineExclamationCircle } from 'react-icons/ai';
import { getOrganizationImageUrl } from "@/utils/uploadPaths";
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
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Confirm Changes</h2>
        </div>

        <div className={styles.modalScrollArea}>
          <div className={styles.modalContent}>
            <div className={styles.changesContainer}>
            {Object.keys(pendingChanges).map((key) => {
              if (key === "id" || key === "email" || originalData[key] === pendingChanges[key]) return null;

              return (
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
                             <span className={styles.emptyValue}>No logo</span>
                           )
                         ) : (
                           originalData[key] || <span className={styles.emptyValue}>Empty</span>
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
            })}
            </div>

                         <div className={styles.warningMessage}>
               <div className={styles.warningContent}>
                 <AiOutlineExclamationCircle className={styles.warningIcon} />
                 <p>
                   <strong>Important:</strong> Confirming these changes will immediately apply them to
                   the official website. This action cannot be undone.
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
              "Confirm Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
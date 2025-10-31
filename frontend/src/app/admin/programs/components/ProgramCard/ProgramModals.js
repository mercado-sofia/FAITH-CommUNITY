import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './ProgramModals.module.css';

const ProgramModals = ({
  normalizedData,
  actions
}) => {
  const {
    // Modal states
    showMarkCompletedModal,
    showMarkActiveModal,
    showOptOutModal,
    showVolunteerAcceptanceModal,
    showAcceptCollaborationModal,
    showDeclineCollaborationModal,
    pendingVolunteerAction,
    
    // Loading states
    isOptingOut,
    isAcceptingCollaboration,
    isDecliningCollaboration,
    
    // Confirmation handlers
    confirmMarkCompleted,
    confirmMarkActive,
    confirmOptOut,
    confirmVolunteerAcceptance,
    confirmAcceptCollaboration,
    confirmDeclineCollaboration,
    
    // Cancel handlers
    cancelMarkCompleted,
    cancelMarkActive,
    cancelOptOut,
    cancelVolunteerAcceptance,
    cancelAcceptCollaboration,
    cancelDeclineCollaboration
  } = actions;

  // Local preview URL for selected file
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (actions.postActReportFile) {
      const url = URL.createObjectURL(actions.postActReportFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [actions.postActReportFile]);

  return (
    <>
      {/* Mark as Completed Confirmation Modal */}
      {showMarkCompletedModal && typeof window !== 'undefined' && createPortal((
        <div className={styles.modalOverlay} onClick={cancelMarkCompleted}>
          <div className={`${styles.modalContent} ${styles.markCompletedModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Submit Post Act Report</h3>
            </div>
            <div className={styles.modalBody}>
              <p>To complete this program, upload the Post Act Report. A superadmin will review and approve it. The status will change to Completed after approval.</p>
              <div className={styles.uploadField}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
                  data-post-act-input="true"
                  onChange={(e) => actions.setPostActReportFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                />
                <div className={styles.uploadHint}>Allowed: PDF, JPG, PNG, WEBP, HEIC, DOC, DOCX</div>
                {actions.postActReportFile && (
                  <div className={styles.filePreviewRow}>
                    <a
                      href={previewUrl || '#'}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={styles.fileNameLink}
                    >
                      {actions.postActReportFile.name}
                    </a>
                    <span className={styles.fileMeta}>
                      {(actions.postActReportFile.size > 1024 * 1024
                        ? (actions.postActReportFile.size / (1024 * 1024)).toFixed(1) + ' MB'
                        : (actions.postActReportFile.size / 1024).toFixed(0) + ' KB')}
                    </span>
                    <button
                      type="button"
                      className={styles.removeFileBtn}
                      onClick={() => {
                        actions.setPostActReportFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={cancelMarkCompleted}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkCompleted}
                className={styles.confirmButton}
                disabled={!actions.postActReportFile || actions.isMarkingCompleted}
              >
                {actions.isMarkingCompleted ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Mark as Active Confirmation Modal */}
      {showMarkActiveModal && (
        <div className={styles.modalOverlay} onClick={cancelMarkActive}>
          <div className={`${styles.modalContent} ${styles.markActiveModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Mark as Active</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to mark &quot;{normalizedData.title}&quot; as active?</p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={cancelMarkActive}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkActive}
                className={styles.confirmButton}
              >
                Mark as Active
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opt Out Confirmation Modal */}
      {showOptOutModal && (
        <div className={styles.modalOverlay} onClick={cancelOptOut}>
          <div className={`${styles.modalContent} ${styles.optOutModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Opt Out of Collaboration</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to opt out of collaborating on &quot;{normalizedData.title}&quot;?</p>
              <p className={styles.warningText}>This action cannot be undone. You will no longer have access to this program.</p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={cancelOptOut}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={confirmOptOut}
                className={styles.confirmButton}
                disabled={isOptingOut}
              >
                {isOptingOut ? 'Opting Out...' : 'Opt Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Volunteer Acceptance Confirmation Modal */}
      {showVolunteerAcceptanceModal && (
        <div className={styles.modalOverlay} onClick={cancelVolunteerAcceptance}>
          <div className={`${styles.modalContent} ${styles.volunteerAcceptanceModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {pendingVolunteerAction ? 'Accept Volunteers' : 'Close Volunteers'}
              </h3>
            </div>
            <div className={styles.modalBody}>
              <p>
                Are you sure you want to {pendingVolunteerAction ? 'accept' : 'close'} volunteer applications for &quot;{normalizedData.title}&quot;?
              </p>
              {pendingVolunteerAction ? (
                <p className={styles.infoText}>
                  This will allow public users to apply for volunteer positions in this program.
                </p>
              ) : (
                <p className={styles.warningText}>
                  This will prevent public users from applying for volunteer positions in this program.
                </p>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={cancelVolunteerAcceptance}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={confirmVolunteerAcceptance}
                className={styles.confirmButton}
              >
                {pendingVolunteerAction ? 'Accept Volunteers' : 'Close Volunteers'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Collaboration Confirmation Modal */}
      {showAcceptCollaborationModal && (
        <div className={styles.modalOverlay} onClick={cancelAcceptCollaboration}>
          <div className={`${styles.modalContent} ${styles.acceptCollaborationModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Accept Collaboration</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to accept the collaboration request for &quot;{normalizedData.title}&quot;?</p>
              <p className={styles.infoText}>
                This will make you a collaborator on this program and you&apos;ll be able to view and manage it.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={cancelAcceptCollaboration}
                className={styles.cancelButton}
                disabled={isAcceptingCollaboration}
              >
                Cancel
              </button>
              <button
                onClick={confirmAcceptCollaboration}
                className={styles.confirmButton}
                disabled={isAcceptingCollaboration}
              >
                {isAcceptingCollaboration ? 'Accepting...' : 'Accept Collaboration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Collaboration Confirmation Modal */}
      {showDeclineCollaborationModal && (
        <div className={styles.modalOverlay} onClick={cancelDeclineCollaboration}>
          <div className={`${styles.modalContent} ${styles.declineCollaborationModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Decline Collaboration</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to decline the collaboration request for &quot;{normalizedData.title}&quot;?</p>
              <p className={styles.infoText}>
                This will remove you from this collaboration request. You can still be invited again in the future.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={cancelDeclineCollaboration}
                className={styles.cancelButton}
                disabled={isDecliningCollaboration}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeclineCollaboration}
                className={styles.confirmButton}
                disabled={isDecliningCollaboration}
              >
                {isDecliningCollaboration ? 'Declining...' : 'Decline Collaboration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProgramModals;

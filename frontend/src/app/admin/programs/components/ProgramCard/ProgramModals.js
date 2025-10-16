import React from 'react';
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

  return (
    <>
      {/* Mark as Completed Confirmation Modal */}
      {showMarkCompletedModal && (
        <div className={styles.modalOverlay} onClick={cancelMarkCompleted}>
          <div className={`${styles.modalContent} ${styles.markCompletedModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Mark as Completed</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to mark &quot;{normalizedData.title}&quot; as completed?</p>
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
              >
                Mark as Completed
              </button>
            </div>
          </div>
        </div>
      )}

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

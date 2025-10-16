import React from 'react';
import { LuSquareCheckBig } from 'react-icons/lu';
import { MdOutlineRadioButtonChecked, MdOutlineCancel } from 'react-icons/md';
import styles from './ProgramActions.module.css';

const ProgramActions = ({
  normalizedData,
  isCollaborationCard,
  getProgramStatusByDates,
  actions
}) => {
  const {
    isDeleting,
    isAcceptingCollaboration,
    isDecliningCollaboration,
    handleMarkCompletedClick,
    handleMarkActiveClick,
    handleAcceptCollaborationClick,
    handleDeclineCollaborationClick
  } = actions;

  // Regular program action buttons - Only show for creators and not for collaboration cards
  if (normalizedData.user_role === 'creator' && !isCollaborationCard) {
    const displayStatus = getProgramStatusByDates(normalizedData);
    
    return (
      <div className={styles.actionButtons}>
        {displayStatus !== 'Active' && (
          <button
            onClick={handleMarkActiveClick}
            className={styles.markActiveButton}
            disabled={isDeleting}
            title="Mark program as active"
          >
            <MdOutlineRadioButtonChecked /> Mark Active
          </button>
        )}
        
        {displayStatus !== 'Completed' && (
          <button
            onClick={handleMarkCompletedClick}
            className={styles.markCompletedButton}
            disabled={isDeleting}
            title="Mark program as completed"
          >
            <LuSquareCheckBig /> Mark Complete
          </button>
        )}
      </div>
    );
  }

  // Collaboration action buttons - Only show for collaboration cards with pending status
  if (isCollaborationCard && normalizedData.status === 'pending') {
    return (
      <div className={styles.actionButtons}>
        <button
          onClick={handleAcceptCollaborationClick}
          className={styles.acceptButton}
          disabled={isAcceptingCollaboration || isDecliningCollaboration}
          title="Accept collaboration invitation"
        >
          <LuSquareCheckBig /> {isAcceptingCollaboration ? 'Accepting...' : 'Accept'}
        </button>
        
        <button
          onClick={handleDeclineCollaborationClick}
          className={styles.declineButton}
          disabled={isAcceptingCollaboration || isDecliningCollaboration}
          title="Decline collaboration invitation"
        >
          <MdOutlineCancel /> {isDecliningCollaboration ? 'Declining...' : 'Decline'}
        </button>
      </div>
    );
  }

  // No action buttons to show
  return null;
};

export default ProgramActions;

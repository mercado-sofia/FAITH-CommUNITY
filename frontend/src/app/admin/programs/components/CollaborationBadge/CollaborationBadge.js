'use client';

import { FaUsers, FaCrown, FaEye } from 'react-icons/fa';
import { hasActiveCollaborations, getActiveCollaborators } from '@/utils/collaborationStatusUtils';
import styles from './CollaborationBadge.module.css';

const CollaborationBadge = ({ 
  program, 
  userRole, 
  isCollaborative = false,
  collaboratorCount = 0 
}) => {
  // Show badge if program is collaborative AND has active collaborations
  // This ensures the badge disappears when all collaborators opt out or decline
  if (!isCollaborative || !hasActiveCollaborations(program)) {
    return null;
  }

  const getBadgeContent = () => {
    switch (userRole) {
      case 'creator':
        return {
          icon: <FaCrown />,
          text: 'Creator',
          className: styles.creatorBadge
        };
      case 'collaborator':
        return {
          icon: <FaEye />,
          text: 'Collaborator',
          className: styles.collaboratorBadge
        };
      default:
        return {
          icon: <FaUsers />,
          text: 'Collaborative',
          className: styles.collaborativeBadge
        };
    }
  };

  const badge = getBadgeContent();

  // Count all active collaborations (pending and accepted)
  const activeCollaboratorCount = getActiveCollaborators(program.collaborators).length;

  return (
    <div className={`${styles.badge} ${badge.className}`}>
      {badge.icon}
      <span className={styles.badgeText}>{badge.text}</span>
      {activeCollaboratorCount > 0 && (
        <span className={styles.collaboratorCount}>
          ({activeCollaboratorCount})
        </span>
      )}
    </div>
  );
};

export default CollaborationBadge;

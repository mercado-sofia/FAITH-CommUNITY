'use client';

import { FaUsers, FaCrown, FaEye } from 'react-icons/fa';
import styles from './CollaborationBadge.module.css';

const CollaborationBadge = ({ 
  program, 
  userRole, 
  isCollaborative = false,
  collaboratorCount = 0 
}) => {
  // Check if program has any collaborations that are not declined
  // Show badge for pending and accepted collaborations
  // Only hide badge if all collaborators have declined
  const hasActiveCollaborations = () => {
    if (!program.collaborators || !Array.isArray(program.collaborators)) {
      return false;
    }
    
    // Check if there are any collaborations that are not declined
    // This includes pending and accepted collaborations
    return program.collaborators.some(collab => 
      collab.status !== 'declined'
    );
  };

  // Show badge if there are any non-declined collaborations
  if (!hasActiveCollaborations()) {
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

  // Count all non-declined collaborations (pending and accepted)
  const activeCollaboratorCount = program.collaborators ? 
    program.collaborators.filter(collab => 
      collab.status !== 'declined'
    ).length : 0;

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

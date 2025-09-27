'use client';

import { FaUsers, FaCrown, FaEye } from 'react-icons/fa';
import styles from './CollaborationBadge.module.css';

const CollaborationBadge = ({ 
  program, 
  userRole, 
  isCollaborative = false,
  collaboratorCount = 0 
}) => {
  if (!isCollaborative) {
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

  return (
    <div className={`${styles.badge} ${badge.className}`}>
      {badge.icon}
      <span className={styles.badgeText}>{badge.text}</span>
      {collaboratorCount > 0 && (
        <span className={styles.collaboratorCount}>
          ({collaboratorCount})
        </span>
      )}
    </div>
  );
};

export default CollaborationBadge;

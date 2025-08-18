'use client';

import styles from './styles/StatCard.module.css';

export default function StatCard({ label, count, iconKey, isLoading = false }) {
  const getIcon = (key) => {
    switch (key) {
      case 'organizations':
        return '🏢';
      case 'pending':
        return '⏳';
      case 'volunteers':
        return '👥';
      case 'programs':
        return '📋';
      default:
        return '📊';
    }
  };

  return (
    <div className={styles.statCard}>
      <div className={styles.iconContainer}>
        <span className={styles.icon}>{getIcon(iconKey)}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.count}>
          {isLoading ? (
            <div className={styles.skeleton}></div>
          ) : (
            count
          )}
        </div>
        <div className={styles.label}>{label}</div>
      </div>
    </div>
  );
}

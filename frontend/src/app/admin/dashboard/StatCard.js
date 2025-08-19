'use client';

import styles from './styles/StatCard.module.css';
import { FiUsers, FiFileText, FiCheckCircle, FiCalendar } from 'react-icons/fi';

const icons = {
  pending: <FiFileText className={styles.icon} />,
  total: <FiUsers className={styles.icon} />,
  programs: <FiCheckCircle className={styles.icon} />,
};

export default function StatCard({ label, count, iconKey, isLoading = false }) {
  const isPrograms = iconKey === 'programs';

  return (
    <div
      className={`${styles.statCard} ${isPrograms ? styles.programCardBg : ''}`}
    >
      <div className={styles.cardContent}>
        <div>
          <h2 className={`${styles.count} ${isLoading ? styles.loadingCount : ''}`}>
            {isLoading ? (
              <span className={styles.skeletonCount}>—</span>
            ) : (
              count
            )}
          </h2>
          <p className={`${styles.label} ${isLoading ? styles.loadingLabel : ''}`}>
            {label}
          </p>
        </div>
        <div className={`${styles.iconWrapper} ${isLoading ? styles.loadingIcon : ''}`}>
          {icons[iconKey]}
        </div>
      </div>
    </div>
  );
}
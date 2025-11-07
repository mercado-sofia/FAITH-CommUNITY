'use client';

import styles from './styles/StatCard.module.css';
import { FiUsers, FiFileText, FiCheckCircle, FiCalendar, FiClock, FiStar } from 'react-icons/fi';

const icons = {
  organizations: <FiCalendar className={styles.icon} />,
  pending: <FiFileText className={styles.icon} />,
  upcoming: <FiClock className={styles.icon} />,
  programs: <FiCheckCircle className={styles.icon} />,
  highlights: <FiStar className={styles.icon} />,
};

export default function StatCard({ label, count, iconKey, isLoading = false, activeCount, inactiveCount, organizationsCount, upcomingCount, programsActiveCount, percentageChange }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.cardContent}>
        <div className={`${styles.iconWrapper} ${isLoading ? styles.loadingIcon : ''}`}>
          {icons[iconKey]}
        </div>
        <div className={styles.textContent}>
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
          <div className={styles.extraInfo}>
            {activeCount !== undefined && inactiveCount !== undefined && (
              <div className={styles.statusCounts}>
                <span className={styles.activeCount}>
                  {activeCount} Active
                </span>
                <span className={styles.inactiveCount}>
                  {inactiveCount} Inactive
                </span>
              </div>
            )}
            {organizationsCount !== undefined && (
              <div className={styles.organizationsCount}>
                <span className={styles.organizationsCountText}>
                  {organizationsCount} {typeof organizationsCount === 'number' && organizationsCount === 1 ? 'Organization' : 'Organizations'}
                </span>
              </div>
            )}
            {upcomingCount !== undefined && programsActiveCount !== undefined && (
              <div className={styles.statusCounts}>
                <span className={styles.activeCount}>
                  {programsActiveCount} Active
                </span>
                <span className={styles.upcomingCount}>
                  {upcomingCount} Upcoming
                </span>
              </div>
            )}
            {percentageChange !== undefined && (
              <div className={styles.percentageChange}>
                <span className={styles.percentageChangeText}>
                  {typeof percentageChange === 'number' && percentageChange >= 0 ? '+' : ''}
                  {percentageChange}% than last year
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import styles from './styles/StatCard.module.css';
import { FiUsers, FiFileText, FiCheckCircle, FiCalendar } from 'react-icons/fi';

const icons = {
  pending: <FiFileText className={styles.icon} />,
  total: <FiUsers className={styles.icon} />,
  programs: <FiCheckCircle className={styles.icon} />,
};

export default function StatCard({ label, count, iconKey, isLoading = false, pendingCount, approvedCount, activeCount, completedCount, totalProgramsCount, showUsersLabel = false, upcomingCount, programsActiveCount, percentageChange }) {
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
            {pendingCount !== undefined && approvedCount !== undefined && (
              <div className={styles.statusCounts}>
                <span className={styles.activeCount}>
                  {approvedCount} Approved
                </span>
                <span className={styles.inactiveCount}>
                  {pendingCount} {showUsersLabel ? (typeof pendingCount === 'number' && pendingCount <= 1 ? 'User' : 'Users') : 'Pending'}
                </span>
              </div>
            )}
            {pendingCount !== undefined && approvedCount === undefined && (
              <div className={styles.statusCounts}>
                <span className={styles.inactiveCount}>
                  {pendingCount} {showUsersLabel ? (typeof pendingCount === 'number' && pendingCount <= 1 ? 'User' : 'Users') : 'Pending'}
                </span>
              </div>
            )}
            {activeCount !== undefined && completedCount !== undefined && (
              <div className={styles.statusCounts}>
                <span className={styles.activeCount}>
                  {activeCount} Active
                </span>
                <span className={styles.inactiveCount}>
                  {completedCount} Completed
                </span>
              </div>
            )}
            {activeCount !== undefined && completedCount === undefined && (
              <div className={styles.statusCounts}>
                <span className={styles.activeCount}>
                  {activeCount} Active
                </span>
              </div>
            )}
            {completedCount !== undefined && activeCount === undefined && (
              <div className={styles.statusCounts}>
                <span className={styles.inactiveCount}>
                  {completedCount} Completed
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
                  {typeof percentageChange === 'number' ? (
                    <>
                      {percentageChange >= 0 ? '+' : ''}
                      {percentageChange}% than last year
                    </>
                  ) : (
                    `${percentageChange}% than last year`
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
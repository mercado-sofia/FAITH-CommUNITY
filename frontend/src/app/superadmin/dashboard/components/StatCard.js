'use client';

import styles from './styles/StatCard.module.css';

export default function StatCard({ label, count, isLoading = false }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.cardContent}>
        <div>
          <div className={styles.count}>
            {isLoading ? (
              <div className={styles.skeletonCount}></div>
            ) : (
              count
            )}
          </div>
          <div className={styles.label}>{label}</div>
        </div>
      </div>
    </div>
  );
}

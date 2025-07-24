'use client';

import styles from './dashboard.module.css';
import StatCardSection from './components/StatCardSection';
import RecentApplicationsTable from './components/RecentApplicationsTable';
import RecentActivitiesList from './components/RecentActivitiesList';

export default function AdminDashboard() {
  return (
    <div className={styles.mainArea}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
      </div>

      <StatCardSection />

      <div className={styles.recentRow}>
        <div className={styles.leftColumn}>
          <RecentApplicationsTable />
        </div>
        <div className={styles.rightColumn}>
          <RecentActivitiesList />
        </div>
      </div>
    </div>
  );
}
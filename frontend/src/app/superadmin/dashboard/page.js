'use client';

import styles from './dashboard.module.css';
import StatCardSection from './components/StatCardSection';
import PendingApprovalsTable from './components/PendingApprovalsTable';

export default function SuperAdminDashboard() {
  return (
    <div className={styles.mainArea}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
      </div>

      <StatCardSection />

      <div className={styles.recentRow}>
        <PendingApprovalsTable />
      </div>
    </div>
  );
}

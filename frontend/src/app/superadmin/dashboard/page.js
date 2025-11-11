'use client';

import styles from './dashboard.module.css';
import StatCardSection from './components/StatCardSection';
import ChartsSection from './components/ChartsSection';
import RecentApprovalsTable from './components/RecentApprovalsTable';

export default function SuperAdminDashboard() {
  return (
    <div className={styles.mainArea}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
      </div>

      <StatCardSection />

      <ChartsSection />

      <div className={styles.recentRow}>
        <RecentApprovalsTable />
      </div>
    </div>
  );
}

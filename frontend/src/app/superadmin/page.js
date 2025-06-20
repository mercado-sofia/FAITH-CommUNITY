'use client';

import styles from './styles/dashboard.module.css';

export default function SuperAdminDashboard() {
  return (
    <div className={styles.dashboard}>
      <h1 className={styles.pageTitle}>Welcome, Super Admin!</h1>

      <div className={styles.cardContainer}>
        <div className={styles.card}>
          <h3>Total Organizations</h3>
          <p>11</p>
        </div>
        <div className={styles.card}>
          <h3>Pending Approvals</h3>
          <p>4</p>
        </div>
        <div className={styles.card}>
          <h3>Total Volunteers</h3>
          <p>128</p>
        </div>
        <div className={styles.card}>
          <h3>Programs & Services</h3>
          <p>22</p>
        </div>
      </div>
    </div>
  );
}
'use client';

import StatCard from './StatCard';
import styles from './styles/StatCard.module.css';
import { dashboardStats } from '../data/mockData';
import Link from 'next/link';

export default function StatCardSection() {
  return (
    <div className={styles.cardGrid}>
      <Link href="/admin/volunteers?filter=pending" className={styles.cardWrapper}>
        <StatCard
          label="Pending Applications"
          count={dashboardStats.pendingApplications}
          iconKey="pending"
        />
      </Link>
      <Link href="/admin/volunteers" className={styles.cardWrapper}>
        <StatCard
          label="Total Applications"
          count={dashboardStats.totalApplications}
          iconKey="total"
        />
      </Link>
      <Link href="/admin/programs" className={styles.cardWrapper}>
        <StatCard
          label="Active Programs"
          count={dashboardStats.activePrograms}
          iconKey="programs"
        />
      </Link>
      <div className={styles.cardWrapper}>
        <StatCard
          label="Events"
          count={dashboardStats.events}
          iconKey="events"
        />
      </div>
    </div>
  );
}
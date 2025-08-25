'use client';

import styles from '../dashboard.module.css';
import { FiUsers, FiFileText, FiCheckCircle, FiCalendar } from 'react-icons/fi';

const icons = {
  organizations: <FiCalendar className={styles.icon} />,
  pending: <FiFileText className={styles.icon} />,
  volunteers: <FiUsers className={styles.icon} />,
  programs: <FiCheckCircle className={styles.icon} />,
};

export default function StatCard({ label, count, iconKey, isLoading = false }) {
  return (
    <>
      <div className={styles.cardContent}>
        <h3>{label}</h3>
        <p>
          {isLoading ? "—" : count}
        </p>
      </div>
      <div className={styles.iconWrapper}>
        {icons[iconKey]}
      </div>
    </>
  );
}

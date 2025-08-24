'use client';

import styles from '../dashboard.module.css';

export default function StatCard({ label, count, isLoading = false }) {
  return (
    <>
      <h3>{label}</h3>
      <p>
        {isLoading ? "—" : count}
      </p>
    </>
  );
}

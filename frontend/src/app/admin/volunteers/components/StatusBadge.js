import styles from '../../styles/volunteers.module.css';

export default function StatusBadge({ status }) {
  const statusClass = {
    Approved: styles.approved,
    Pending: styles.pending,
    Rejected: styles.rejected,
  }[status] || styles.default;

  return <span className={`${styles.badge} ${statusClass}`}>{status}</span>;
}
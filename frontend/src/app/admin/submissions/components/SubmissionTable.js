import styles from '../../styles/submissions.module.css';

export default function SubmissionTable({ submissions, onView, onCancel, onEdit }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Section</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((item) => (
            <tr key={item.id}>
              <td>{item.section}</td>
              <td>{new Date(item.submitted_at).toLocaleDateString()}</td>
              <td>
                <span className={`${styles.badge} ${styles[item.status.toLowerCase()]}`}>
                  {item.status}
                </span>
              </td>
              <td className={styles.actionButtons}>
                <button className={styles.viewBtn} onClick={() => onView(item)}>View</button>
                <button className={styles.editBtn} onClick={() => onEdit(item)}>Edit</button>
                {item.status === 'pending' && (
                  <button className={styles.cancelBtn} onClick={() => onCancel(item.id)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import SubmissionModal from './SubmissionModal';
import CancelConfirmation from './CancelConfirmationModal';
import styles from '../submissions.module.css';

export default function SubmissionTable({ submittedBy }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/submissions?submitted_by=${submittedBy}`);
      const data = await res.json();
      setSubmissions(data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [submittedBy]);

  useEffect(() => {
    if (submittedBy) fetchData();
  }, [submittedBy, fetchData]);

  const handleCancel = async (id) => {
    try {
      await fetch(`http://localhost:8080/api/submissions/${id}`, { method: 'DELETE' });
      fetchData();
      setConfirmId(null);
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  return (
    <div className={styles.tableContainer}>
      {loading ? (
        <p>Loading...</p>
      ) : submissions.length === 0 ? (
        <p>No submissions found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Section</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id}>
                <td>{s.section}</td>
                <td className={styles[s.status]}>{s.status}</td>
                <td>{new Date(s.submitted_at).toLocaleString()}</td>
                <td>
                  <button className={styles.viewBtn} onClick={() => setSelected(s)}>View</button>
                  {s.status === 'pending' && (
                    <button className={styles.cancelBtn} onClick={() => setConfirmId(s.id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selected && <SubmissionModal data={selected} onClose={() => setSelected(null)} />}
      {confirmId && <CancelConfirmation onConfirm={() => handleCancel(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  );
}
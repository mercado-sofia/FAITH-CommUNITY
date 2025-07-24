import styles from '../submissions.module.css';

export default function SubmissionModal({ data, onClose }) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalBox}>
        <h2>Submission Details</h2>

        <h4>Section: {data.section}</h4>
        <p><strong>Status:</strong> {data.status}</p>
        <p><strong>Submitted At:</strong> {new Date(data.submitted_at).toLocaleString()}</p>

        <div className={styles.dataContainer}>
          <div>
            <h5>Previous Data</h5>
            <pre>{JSON.stringify(data.previous_data, null, 2)}</pre>
          </div>
          <div>
            <h5>Proposed Data</h5>
            <pre>{JSON.stringify(data.proposed_data, null, 2)}</pre>
          </div>
        </div>

        <button className={styles.closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
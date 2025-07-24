'use client';

import { useState, useEffect } from 'react';
import styles from '../styles/approvals.module.css';

export default function PendingApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const fetchApprovals = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/submissions?status=pending');
      const data = await res.json();

      const formatted = data.map((item) => ({
        ...item,
        previous_data: item.previous_data || {},
        proposed_data: item.proposed_data || {},
        submitted_at: new Date(item.submitted_at)
      }));

      setApprovals(formatted);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`http://localhost:8080/api/approvals/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Approval failed');
      }

      alert('Changes have been approved and applied.');
      fetchApprovals(); // Refresh the list
    } catch (err) {
      console.error('❌ Approve error:', err);
      alert('Failed to approve changes. Check console for details.');
    }
  };

  const handleReject = async () => {
    await fetch(`http://localhost:8080/api/submissions/${selectedId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', rejection_comment: rejectComment })
    });
    setShowRejectModal(false);
    setRejectComment('');
    setSelectedId(null);
    fetchApprovals();
  };

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error loading approvals.</p>;

  return (
    <div className={styles.container}>
      <h1>Pending Submissions</h1>
      {approvals.map((item) => (
        <div key={item.id} className={styles.card}>
          <h3>{item.section} update from Org #{item.organization_id}</h3>
          <p><strong>Submitted:</strong> {item.submitted_at.toLocaleString()}</p>
          <div className={styles.dataBox}>
            <pre><strong>Previous:</strong> {JSON.stringify(item.previous_data, null, 2)}</pre>
            <pre><strong>Proposed:</strong> {JSON.stringify(item.proposed_data, null, 2)}</pre>
          </div>
          <button onClick={() => handleApprove(item.id)} className={styles.approveBtn}>Approve</button>
          <button onClick={() => { setSelectedId(item.id); setShowRejectModal(true); }} className={styles.rejectBtn}>Reject</button>
        </div>
      ))}

      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Reject Submission</h3>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Enter rejection reason..."
            />
            <button onClick={handleReject}>Submit Rejection</button>
            <button onClick={() => setShowRejectModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
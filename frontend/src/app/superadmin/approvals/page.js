'use client';

import { useState, useEffect } from 'react';
import ApprovalsTable from './components/ApprovalsTable';
import styles from '../styles/approvals.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function PendingApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/approvals/pending`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch approvals');
      }

      const formatted = result.data.map((item) => ({
        ...item,
        submitted_at: new Date(item.submitted_at)
      }));

      setApprovals(formatted);
      setError(null);
    } catch (err) {
      console.error('Error fetching approvals:', err);
      setError(err.message || 'Failed to load approvals');
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Approval failed');
      }

      alert('Changes have been approved and applied.');
      fetchApprovals(); // Refresh the list
    } catch (err) {
      console.error('❌ Approve error:', err);
      alert('Failed to approve changes: ' + err.message);
    }
  };

  const handleReject = async (id, rejectComment = '') => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_comment: rejectComment })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Rejection failed');
      }

      alert('Submission has been rejected.');
      fetchApprovals();
    } catch (err) {
      console.error('❌ Reject error:', err);
      alert('Failed to reject submission: ' + err.message);
    }
  };

  // Bulk action handlers
  const handleBulkApprove = async (ids) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/bulk/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk approval failed');
      }

      alert(`Bulk approval completed: ${result.details.successCount} approved, ${result.details.errorCount} failed`);
      fetchApprovals();
    } catch (err) {
      console.error('❌ Bulk approve error:', err);
      alert('Failed to bulk approve submissions: ' + err.message);
    }
  };

  const handleBulkReject = async (ids, rejectComment = '') => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/bulk/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, rejection_comment: rejectComment })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk rejection failed');
      }

      alert(`Bulk rejection completed: ${result.details.successCount} rejected, ${result.details.errorCount} failed`);
      fetchApprovals();
    } catch (err) {
      console.error('❌ Bulk reject error:', err);
      alert('Failed to bulk reject submissions: ' + err.message);
    }
  };

  const handleBulkDelete = async (ids) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/bulk/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Bulk deletion failed');
      }

      alert(`Bulk deletion completed: ${result.details.successCount} deleted, ${result.details.errorCount} failed`);
      fetchApprovals();
    } catch (err) {
      console.error('❌ Bulk delete error:', err);
      alert('Failed to bulk delete submissions: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading pending submissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Pending Submissions</h1>
        <p className={styles.pageSubtitle}>
          Review and approve organization updates from administrators
        </p>
      </div>
      
      {approvals.length === 0 ? (
        <div className={styles.noSubmissions}>
          <p>No pending submissions at this time.</p>
        </div>
      ) : (
        <ApprovalsTable 
          approvals={approvals}
          onApprove={handleApprove}
          onReject={handleReject}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onBulkDelete={handleBulkDelete}
        />
      )}
    </div>
  );
}
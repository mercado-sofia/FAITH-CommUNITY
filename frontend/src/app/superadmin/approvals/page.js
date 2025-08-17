'use client';

import { useState, useEffect } from 'react';
import ApprovalsTable from './components/ApprovalsTable';
import styles from '../styles/approvals.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function PendingApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ type: '', text: '' });

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

      setNotification({ 
        type: 'success', 
        text: 'Changes have been approved and applied.' 
      });
      fetchApprovals(); // Refresh the list
      
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('❌ Approve error:', err);
      setNotification({ 
        type: 'error', 
        text: 'Failed to approve changes: ' + err.message 
      });
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
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

      setNotification({ 
        type: 'success', 
        text: 'Submission has been rejected.' 
      });
      fetchApprovals();
      
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('❌ Reject error:', err);
      setNotification({ 
        type: 'error', 
        text: 'Failed to reject submission: ' + err.message 
      });
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
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

      setNotification({ 
        type: 'success', 
        text: `Bulk approval completed: ${result.details.successCount} approved, ${result.details.errorCount} failed` 
      });
      fetchApprovals();
      
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('❌ Bulk approve error:', err);
      setNotification({ 
        type: 'error', 
        text: 'Failed to bulk approve submissions: ' + err.message 
      });
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
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

      setNotification({ 
        type: 'success', 
        text: `Bulk rejection completed: ${result.details.successCount} rejected, ${result.details.errorCount} failed` 
      });
      fetchApprovals();
      
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('❌ Bulk reject error:', err);
      setNotification({ 
        type: 'error', 
        text: 'Failed to bulk reject submissions: ' + err.message 
      });
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
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

      setNotification({ 
        type: 'success', 
        text: `Bulk deletion completed: ${result.details.successCount} deleted, ${result.details.errorCount} failed` 
      });
      fetchApprovals();
      
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('❌ Bulk delete error:', err);
      setNotification({ 
        type: 'error', 
        text: 'Failed to bulk delete submissions: ' + err.message 
      });
      setTimeout(() => setNotification({ type: '', text: '' }), 5000);
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
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>Pending Submissions</h1>
          <p className={styles.pageSubtitle}>
            Review and approve organization updates from administrators
          </p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{approvals.length}</span>
            <span className={styles.statLabel}>Total Submissions</span>
          </div>
        </div>
      </div>

      {/* Notification Display */}
      {notification.text && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.text}
        </div>
      )}
      
      {approvals.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📋</div>
          <h3 className={styles.emptyStateTitle}>No pending submissions</h3>
          <p className={styles.emptyStateText}>
            All submissions have been reviewed. New submissions will appear here when administrators submit updates.
          </p>
        </div>
      ) : (
        <div className={styles.tableSection}>
          <div className={styles.tableSectionHeader}>
            <h2 className={styles.tableSectionTitle}>Submissions</h2>
            <div className={styles.tableSectionActions}>
              <span className={styles.showingText}>
                Showing {approvals.length} submission{approvals.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <ApprovalsTable 
            approvals={approvals}
            onApprove={handleApprove}
            onReject={handleReject}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            onBulkDelete={handleBulkDelete}
          />
        </div>
      )}
    </div>
  );
}
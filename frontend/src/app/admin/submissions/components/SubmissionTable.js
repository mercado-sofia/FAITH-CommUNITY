import { useEffect, useState, useCallback } from 'react';
import { FiEdit, FiX, FiTrash2 } from 'react-icons/fi';
import SubmissionModal from './SubmissionModal';
import ReEditModal from './ReEditModal';
import CancelConfirmation from './CancelConfirmationModal';
import DeleteConfirmation from './DeleteConfirmationModal';
import BulkActionsBar from './BulkActionsBar';
import styles from './styles/SubmissionTable.module.css';

export default function SubmissionTable({ orgAcronym, submissions = [], loading = false, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [reEditSubmission, setReEditSubmission] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleCancel = async (id) => {
    try {
      await fetch(`http://localhost:8080/api/submissions/${id}`, { method: 'DELETE' });
      if (onRefresh) onRefresh();
      setConfirmId(null);
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  const handleReEdit = (submission) => {
    setReEditSubmission(submission);
  };

  const handleSaveReEdit = async (submissionId, updatedData) => {
    try {
      // Format the data correctly based on the submission section
      const submission = reEditSubmission;
      let formattedData;

      if (submission.section === 'organization') {
        // For organization, send as object
        formattedData = updatedData;
      } else if (submission.section === 'advocacy') {
        // For advocacy, send the text directly as a string (backend expects string type)
        formattedData = updatedData.advocacy || '';
      } else if (submission.section === 'competency') {
        // For competency, send the text directly as a string (backend expects string type)
        formattedData = updatedData.competency || '';
      } else {
        formattedData = updatedData;
      }

      console.log('Sending data:', { proposed_data: formattedData, section: submission.section, type: typeof formattedData });

      const response = await fetch(`http://localhost:8080/api/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proposed_data: formattedData }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Update successful:', result);
        // Refresh the submissions list
        if (onRefresh) onRefresh();
        setReEditSubmission(null);
        alert('Submission updated successfully!');
      } else {
        const errorData = await response.json();
        console.error('Backend error response:', errorData);
        throw new Error(errorData.message || 'Failed to update submission');
      }
    } catch (error) {
      console.error('Error updating submission:', error);
      alert(`Failed to save changes: ${error.message}`);
      throw error;
    }
  };

  // Selection handlers
  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === submissions.length) {
      setSelectedItems(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(submissions.map(s => s.id));
      setSelectedItems(allIds);
      setShowBulkActions(true);
    }
  };

  // Delete handler (hard delete)
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://localhost:8080/api/submissions/${id}/delete`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        if (onRefresh) onRefresh();
        setDeleteId(null);
        // Remove from selected items if it was selected
        const newSelected = new Set(selectedItems);
        newSelected.delete(id);
        setSelectedItems(newSelected);
        setShowBulkActions(newSelected.size > 0);
      } else {
        throw new Error('Failed to delete submission');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete submission');
    }
  };

  // Bulk actions handlers
  const handleBulkCancel = async () => {
    try {
      // Only cancel pending submissions from the selected items
      const pendingIds = Array.from(selectedItems).filter(id => {
        const submission = submissions.find(s => s.id === id);
        return submission && submission.status === 'pending';
      });
      
      if (pendingIds.length === 0) {
        alert('No pending submissions selected to cancel.');
        return;
      }
      
      const promises = pendingIds.map(id => 
        fetch(`http://localhost:8080/api/submissions/${id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      if (onRefresh) onRefresh();
      setSelectedItems(new Set());
      setShowBulkActions(false);
    } catch (err) {
      console.error('Bulk cancel error:', err);
      alert('Failed to cancel some submissions');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const promises = Array.from(selectedItems).map(id => 
        fetch(`http://localhost:8080/api/submissions/${id}/delete`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      fetchData();
      setSelectedItems(new Set());
      setShowBulkActions(false);
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert('Failed to delete some submissions');
    }
  };

  const allSelected = submissions.length > 0 && selectedItems.size === submissions.length;

  return (
    <div className={styles.tableContainer}>
      {showBulkActions && (
        <BulkActionsBar 
          selectedCount={selectedItems.size}
          selectedItems={selectedItems}
          submissions={submissions}
          onCancel={handleBulkCancel}
          onDelete={handleBulkDelete}
          onClearSelection={() => {
            setSelectedItems(new Set());
            setShowBulkActions(false);
          }}
        />
      )}
      {loading ? (
        <p>Loading...</p>
      ) : !Array.isArray(submissions) || submissions.length === 0 ? (
        <p>No submissions found.</p>
      ) : (
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.selectColumn}>
                <input 
                  type="checkbox" 
                  checked={allSelected}
                  onChange={handleSelectAll}
                  disabled={submissions.length === 0}
                  className={styles.selectAllCheckbox}
                />
              </th>
              <th>Section</th>
              <th>Date Submitted</th>
              <th>Status</th>
              <th></th>
              <th>Actions</th>
              <th></th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {submissions.map((s) => (
              <tr key={s.id}>
                <td className={styles.selectColumn}>
                  <input 
                    type="checkbox" 
                    checked={selectedItems.has(s.id)}
                    onChange={() => handleSelectItem(s.id)}
                    className={styles.selectCheckbox}
                  />
                </td>
                <td>
                  <div className={styles.sectionInfo}>
                    <span className={styles.sectionName}>{s.section.charAt(0).toUpperCase() + s.section.slice(1)}</span>
                    {s.status === 'rejected' && s.rejection_reason && (
                      <div className={styles.rejectionHint} title={s.rejection_reason}>
                        <span className={styles.rejectionIcon}>⚠️</span>
                        <span className={styles.rejectionText}>Feedback available</span>
                      </div>
                    )}
                  </div>
                </td>
                <td>{new Date(s.submitted_at).toLocaleDateString()}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[s.status]}`}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                </td>
                <td>
                  <button className={styles.viewBtn} onClick={() => setSelected(s)}>View</button>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <button 
                      className={`${styles.editBtn} ${s.status !== 'pending' ? styles.disabledBtn : ''}`}
                      onClick={s.status === 'pending' ? () => handleReEdit(s) : undefined}
                      disabled={s.status !== 'pending'}
                      title={s.status === 'pending' ? "Edit submission" : "Cannot edit - submission already processed"}
                    >
                      <FiEdit size={14} />
                    </button>
                    <button 
                      className={`${styles.cancelBtn} ${s.status !== 'pending' ? styles.disabledBtn : ''}`}
                      onClick={s.status === 'pending' ? () => setConfirmId(s.id) : undefined}
                      disabled={s.status !== 'pending'}
                      title={s.status === 'pending' ? "Cancel submission" : "Cannot cancel - submission already processed"}
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                </td>
                <td className={styles.deleteColumn}>
                  <button 
                    className={styles.deleteBtn} 
                    onClick={() => setDeleteId(s.id)}
                    title="Delete submission from history"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selected && <SubmissionModal data={selected} onClose={() => setSelected(null)} />}
      {reEditSubmission && (
        <ReEditModal 
          submission={reEditSubmission} 
          onClose={() => setReEditSubmission(null)}
          onSave={handleSaveReEdit}
        />
      )}
      {confirmId && <CancelConfirmation onConfirm={() => handleCancel(confirmId)} onCancel={() => setConfirmId(null)} />}
      {deleteId && <DeleteConfirmation onConfirm={() => handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
import { useEffect, useState, useRef } from 'react';
import { FiEdit, FiX, FiTrash2 } from 'react-icons/fi';
import { formatDateShort } from '@/utils/dateUtils.js';
import SubmissionModal from '../modals/SubmissionModal';
import ReEditModal from '../modals/ReEditModal';
import CancelConfirmationModal from '../modals/CancelConfirmationModal';
import { ConfirmationModal } from '@/components';
import { SuccessModal } from '@/components';
import styles from './SubmissionTable.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function SubmissionTable({ 
  orgAcronym, 
  submissions = [], 
  loading = false, 
  onRefresh, 
  currentPage = 1,
  itemsPerPage = 10,
  onPageChange = () => {},
  selectedItems = new Set(),
  onSelectItems = () => {},
  onShowBulkActions = () => {}
}) {
  const dropdownRefs = useRef({});
  const [selected, setSelected] = useState(null);
  const [reEditSubmission, setReEditSubmission] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [loadingStates, setLoadingStates] = useState({});
  
  const showToast = (message, type = 'success') => {
    setSuccessModal({ isVisible: true, message, type });
  };
  
  const hideToast = () => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  };
  
  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectItems(newSelected);
    onShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === currentSubmissions.length && currentSubmissions.length > 0) {
      onSelectItems(new Set());
      onShowBulkActions(false);
    } else {
      const allIds = new Set(currentSubmissions.map(s => s.id));
      onSelectItems(allIds);
      onShowBulkActions(true);
    }
  };
  
  // Use submissions directly since pagination is handled by parent component
  const currentSubmissions = submissions;

  const handleCancel = async (id) => {
    setLoadingStates(prev => ({ ...prev, [`cancel-${id}`]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to cancel submission: ${response.status}`);
      }
      if (onRefresh) onRefresh();
      setConfirmId(null);
      showToast('Submission cancelled successfully!', 'success');
    } catch (err) {
      showToast(`Failed to cancel submission: ${err.message}`, 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, [`cancel-${id}`]: false }));
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

      const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          proposed_data: formattedData,
          section: submission.section
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update submission: ${response.status}`);
      }

      const result = await response.json();
      // Refresh the submissions list
      if (onRefresh) onRefresh();
      setReEditSubmission(null);
      showToast('Submission updated successfully!', 'success');
    } catch (error) {
      showToast(`Failed to save changes: ${error.message}`, 'error');
      // Don't throw the error to prevent the modal from closing
    }
  };



  // Delete handler (hard delete)
  const handleDelete = async (id) => {
    setLoadingStates(prev => ({ ...prev, [`delete-${id}`]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        if (onRefresh) onRefresh();
        setDeleteId(null);
        // Remove from selected items if it was selected
        const newSelected = new Set(selectedItems);
        newSelected.delete(id);
        onSelectItems(newSelected);
        onShowBulkActions(newSelected.size > 0);
        showToast('Submission deleted successfully!', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete submission: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      showToast('Failed to delete submission', 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, [`delete-${id}`]: false }));
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
        showToast('No pending submissions selected to cancel.', 'warning');
        return;
      }
      
      const promises = pendingIds.map(id => 
        fetch(`${API_BASE_URL}/api/submissions/${id}`, { 
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
      );
      await Promise.all(promises);
      if (onRefresh) onRefresh();
      onSelectItems(new Set());
      onShowBulkActions(false);
      showToast('Submissions cancelled successfully!', 'success');
    } catch (err) {
      showToast('Failed to cancel some submissions', 'error');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const promises = Array.from(selectedItems).map(id => 
        fetch(`${API_BASE_URL}/api/submissions/${id}`, { 
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
      );
      
      const responses = await Promise.all(promises);
      const failedResponses = responses.filter(response => !response.ok);
      
      if (failedResponses.length > 0) {
        throw new Error(`${failedResponses.length} deletions failed`);
      }
      
      // Refresh the submissions list
      if (onRefresh) onRefresh();
      onSelectItems(new Set());
      onShowBulkActions(false);
      showToast('Selected submissions deleted successfully!', 'success');
    } catch (error) {
      showToast(`Failed to delete some submissions: ${error.message}`, 'error');
    }
  };

  const allSelected = currentSubmissions.length > 0 && selectedItems.size === currentSubmissions.length;

  // Reset selections when page changes
  useEffect(() => {
    onSelectItems(new Set());
    onShowBulkActions(false);
  }, [currentPage, onSelectItems, onShowBulkActions]);

  return (
    <div className={styles.tableContainer}>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.selectColumn}>
                <input 
                  type="checkbox" 
                  checked={allSelected}
                  onChange={handleSelectAll}
                  disabled={!Array.isArray(submissions) || submissions.length === 0}
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
            {!Array.isArray(submissions) || submissions.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.noSubmissions}>
                  No submissions found.
                </td>
              </tr>
            ) : (
              currentSubmissions.map((s) => (
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
                <td>{formatDateShort(s.submitted_at)}</td>
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
                      title={
                        s.status === 'pending' 
                          ? "Edit submission" 
                          : s.status === 'approved' 
                            ? "Cannot edit - submission already approved" 
                            : s.status === 'rejected' 
                              ? "Cannot edit - submission was rejected" 
                              : "Cannot edit - submission already processed"
                      }
                    >
                      <FiEdit size={14} />
                    </button>
                    <button 
                      className={`${styles.cancelBtn} ${s.status !== 'pending' ? styles.disabledBtn : ''}`}
                      onClick={s.status === 'pending' ? () => setConfirmId(s.id) : undefined}
                      disabled={s.status !== 'pending' || loadingStates[`cancel-${s.id}`]}
                      title={
                        s.status === 'pending' 
                          ? "Cancel submission" 
                          : s.status === 'approved' 
                            ? "Cannot cancel - submission already approved" 
                            : s.status === 'rejected' 
                              ? "Cannot cancel - submission was rejected" 
                              : "Cannot cancel - submission already processed"
                      }
                    >
                      {loadingStates[`cancel-${s.id}`] ? (
                        <span className={styles.spinner}></span>
                      ) : (
                        <FiX size={14} />
                      )}
                    </button>
                  </div>
                </td>
                <td className={styles.deleteColumn}>
                  <button 
                    className={styles.deleteBtn} 
                    onClick={() => setDeleteId(s.id)}
                    disabled={loadingStates[`delete-${s.id}`]}
                    title="Delete submission from history"
                  >
                    {loadingStates[`delete-${s.id}`] ? (
                      <span className={styles.spinner}></span>
                    ) : (
                      <FiTrash2 size={14} />
                    )}
                  </button>
                </td>
              </tr>
              ))
            )}
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
      {confirmId && <CancelConfirmationModal isOpen={!!confirmId} onConfirm={() => handleCancel(confirmId)} onCancel={() => setConfirmId(null)} />}
      {deleteId && (
        <ConfirmationModal
          isOpen={!!deleteId}
          itemType="submission"
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
          isDeleting={false}
        />
      )}
      
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={hideToast}
        type={successModal.type}
        autoHideDuration={3000}
      />

    </div>
  );
}
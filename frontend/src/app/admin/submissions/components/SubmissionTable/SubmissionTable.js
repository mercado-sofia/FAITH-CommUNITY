import { useEffect, useState, useRef } from 'react';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import { formatDateLong } from '@/utils/shared/dateUtils';
import SubmissionModal from '../modals/SubmissionModal';
import { ConfirmationModal, SuccessModal } from '@/components';
import styles from './SubmissionTable.module.css';
import { API_CONFIG } from '@/utils/admin/constants';

export default function SubmissionTable({ 
  submissions = [], 
  loading = false, 
  onRefresh, 
  currentPage = 1,
  itemsPerPage = 10,
  selectedItems = new Set(),
  onSelectItems = () => {},
  onShowBulkActions = () => {},
  sortOrder = 'latest',
  totalCount = 0
}) {
  const dropdownRefs = useRef({});
  const [selected, setSelected] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const [loadingStates, setLoadingStates] = useState({});
  const [showDropdown, setShowDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({});
  
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
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/submissions/${id}`, { 
        method: 'DELETE',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
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

  // Delete handler (hard delete)
  const handleDelete = async (id) => {
    setLoadingStates(prev => ({ ...prev, [`delete-${id}`]: true }));
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/submissions/${id}`, {
        method: 'DELETE',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
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


  const allSelected = currentSubmissions.length > 0 && selectedItems.size === currentSubmissions.length;

  // Reset selections when page changes
  useEffect(() => {
    onSelectItems(new Set());
    onShowBulkActions(false);
  }, [currentPage, onSelectItems, onShowBulkActions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown !== null) {
        const dropdownWrapper = dropdownRefs.current[showDropdown];
        if (
          dropdownWrapper &&
          !dropdownWrapper.contains(event.target)
        ) {
          setShowDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Handle dropdown toggle with positioning
  const handleDropdownToggle = (submissionId) => {
    if (showDropdown === submissionId) {
      setShowDropdown(null);
      return;
    }

    const buttonElement = dropdownRefs.current[submissionId];
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 120; // Approximate height of dropdown
      
      // Check if there's enough space below
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let top, position;
      
      // If not enough space below but enough above, show above
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        position = 'above';
        top = -dropdownHeight - 4; // 4px gap above the button
      } else {
        position = 'below';
        top = rect.height + 4; // 4px gap below the button
      }
      
      setDropdownPosition({ [submissionId]: { top, position } });
    }

    setShowDropdown(submissionId);
  };

  return (
    <div className={styles.tableContainer}>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.numberColumn}>#</th>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {!Array.isArray(submissions) || submissions.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.noSubmissions}>
                  No submissions found.
                </td>
              </tr>
            ) : (
              currentSubmissions.map((s, index) => {
                const startIndex = (currentPage - 1) * itemsPerPage;
                const rowNumber = sortOrder === 'oldest' 
                  ? totalCount - (startIndex + index)
                  : startIndex + index + 1;
                
                return (
              <tr key={s.id}>
                <td className={styles.numberCell}>
                  {rowNumber}
                </td>
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
                  </div>
                </td>
                <td>{formatDateLong(s.submitted_at)}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[s.status]}`}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                </td>
                <td>
                  <div
                    className={styles.dropdownWrapper}
                    ref={(el) => (dropdownRefs.current[s.id] = el)}
                  >
                    <div className={styles.dropdownButtonWrapper}>
                      <div
                        className={styles.dropdown}
                        onClick={() => handleDropdownToggle(s.id)}
                      >
                        <HiOutlineDotsHorizontal className={styles.icon} />
                      </div>

                      {showDropdown === s.id && (
                        <ul 
                          className={`${styles.options} ${dropdownPosition[s.id]?.position === 'above' ? styles.above : ''}`}
                          style={{
                            top: `${dropdownPosition[s.id]?.top || 0}px`,
                            right: '0px'
                          }}
                        >
                          <li onClick={() => {
                            setShowDropdown(null);
                            setSelected(s);
                          }}>
                            View
                          </li>
                          {s.status === 'pending' && !loadingStates[`cancel-${s.id}`] && (
                            <li 
                              onClick={() => {
                                setShowDropdown(null);
                                setConfirmId(s.id);
                              }}
                            >
                              Cancel
                            </li>
                          )}
                          {!loadingStates[`delete-${s.id}`] && (
                            <li 
                              onClick={() => {
                                setShowDropdown(null);
                                setDeleteId(s.id);
                              }}
                              style={{ color: '#dc3545', borderTop: '1px solid #eee', marginTop: '4px', paddingTop: '4px' }}
                            >
                              Delete
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
              );
              })
            )}
          </tbody>
        </table>
      )}
      {selected && <SubmissionModal data={selected} onClose={() => setSelected(null)} />}
      {confirmId && (
        <ConfirmationModal
          isOpen={!!confirmId}
          itemType="submission"
          actionType="cancel"
          onConfirm={() => handleCancel(confirmId)}
          onCancel={() => setConfirmId(null)}
          isLoading={loadingStates[`cancel-${confirmId}`]}
        />
      )}
      {deleteId && (
        <ConfirmationModal
          isOpen={!!deleteId}
          itemType="submission"
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
          isLoading={loadingStates[`delete-${deleteId}`]}
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
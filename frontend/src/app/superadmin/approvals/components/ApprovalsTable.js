'use client';

import { useState } from 'react';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import { formatDateShort } from '../../../../utils/dateUtils';
import { getStatusBadgeConfig } from '@/utils/collaborationStatusUtils';
import ViewDetailsModal from './ViewDetailsModal';
import styles from './styles/ApprovalsTable.module.css';

export default function ApprovalsTable({ 
  approvals, 
  onApprove, 
  onRejectClick, 
  onDeleteClick,
  selectedItems,
  onSelectAll,
  onSelectItem,
  showDropdown,
  setShowDropdown,
  dropdownPosition,
  setDropdownPosition,
  calculateDropdownPosition
}) {
  // Local modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);

  const getStatusBadge = (status) => {
    const config = getStatusBadgeConfig(status);
    return (
      <span className={`${styles.statusBadge} ${styles[config.className]}`}>
        {config.text}
      </span>
    );
  };

  const handleRejectClick = (item) => {
    onRejectClick(item);
  };

  const handleViewDetails = (item) => {
    setSelectedItemForDetails(item);
    setShowDetailsModal(true);
  };

  const handleDeleteClick = (item) => {
    onDeleteClick(item);
  };

  const handleDetailsClose = () => {
    setShowDetailsModal(false);
    setSelectedItemForDetails(null);
  };

  // Using centralized date utility - format remains exactly the same
  const formatDate = (date) => {
    return formatDateShort(date);
  };

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.selectColumn}>
                <input
                  type="checkbox"
                  checked={selectedItems.size === approvals.length && approvals.length > 0}
                  onChange={onSelectAll}
                  className={styles.checkbox}
                />
              </th>
              <th className={styles.organizationColumn}>Organization</th>
              <th className={styles.sectionColumn}>Section</th>
              <th className={styles.dateColumn}>Date</th>
              <th className={styles.statusColumn}>Status</th>
              <th className={styles.actionsColumn}></th>
            </tr>
          </thead>
          <tbody>
            {approvals.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.emptyStateCell}>
                  <div className={styles.emptyState}>
                    <h3 className={styles.emptyStateTitle}>No submissions found</h3>
                    <p className={styles.emptyStateText}>
                      No submissions found matching your current filters. New submissions will appear here when administrators submit updates.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              approvals.map((item) => (
                <tr key={item.uniqueKey || item.id} className={styles.tableRow}>
                  <td className={styles.selectCell}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.uniqueKey || item.id)}
                      onChange={() => onSelectItem(item.uniqueKey || item.id)}
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.organizationCell}>
                    <span className={styles.orgAcronym}>
                      {item.organization_acronym || item.org || 'N/A'}
                    </span>
                  </td>
                  <td className={styles.sectionCell}>
                    {item.section?.charAt(0).toUpperCase() + item.section?.slice(1) || 'N/A'}
                  </td>
                  <td className={styles.dateCell}>
                    {formatDate(item.submitted_at)}
                  </td>
                  <td className={styles.statusCell}>
                    {getStatusBadge(item.status)}
                  </td>
                  <td className={styles.actionsCell}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className={styles.actionDropdownWrapper}>
                        <div className={styles.actionDropdownButtonWrapper}>
                          <div
                            className={styles.actionDropdown}
                            onClick={(e) => {
                              const uniqueId = item.uniqueKey || item.id;
                              const dropdownId = `action-${uniqueId}`;
                              if (showDropdown === dropdownId) {
                                setShowDropdown(null);
                              } else {
                                const position = calculateDropdownPosition(e.currentTarget);
                                setDropdownPosition(prev => ({
                                  ...prev,
                                  [dropdownId]: position
                                }));
                                setShowDropdown(dropdownId);
                              }
                            }}
                          >
                            <HiOutlineDotsHorizontal className={styles.actionDropdownIcon} />
                          </div>
                          {showDropdown === `action-${item.uniqueKey || item.id}` && (
                            <ul 
                              className={`${styles.actionDropdownOptions} ${dropdownPosition[`action-${item.uniqueKey || item.id}`]?.position === 'above' ? styles.above : ''}`}
                              style={{
                                top: `${dropdownPosition[`action-${item.uniqueKey || item.id}`]?.top || 0}px`,
                                right: `${dropdownPosition[`action-${item.uniqueKey || item.id}`]?.right || 0}px`
                              }}
                            >
                              <li 
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleViewDetails(item);
                                  setShowDropdown(null);
                                  setDropdownPosition({});
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                View Details
                              </li>
                              {(item.status === 'pending' || item.status === 'pending_superadmin_approval') && (
                                <>
                                  <li 
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onApprove(item);
                                      setShowDropdown(null);
                                      setDropdownPosition({});
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    Approve
                                  </li>
                                  <li 
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRejectClick(item);
                                      setShowDropdown(null);
                                      setDropdownPosition({});
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    Reject
                                  </li>
                                </>
                              )}
                              <li 
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteClick(item);
                                  setShowDropdown(null);
                                  setDropdownPosition({});
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                Delete
                              </li>
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Details Modal */}
      <ViewDetailsModal 
        isOpen={showDetailsModal}
        onClose={handleDetailsClose}
        submissionData={selectedItemForDetails}
      />
    </>
  );
}
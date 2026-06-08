'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HiOutlineDotsHorizontal } from 'react-icons/hi';
import { formatDateShort } from '@/utils/shared/dateUtils';
import { getStatusBadgeConfig } from '@/utils/shared/collaborationStatusUtils';
import { getOrganizationImageUrl } from '@/utils/shared/uploadPaths';
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
  calculateDropdownPosition,
  startIndex = 0,
  sortBy = 'latest',
  totalCount = 0,
  readOnly = false,
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

  const handleViewDetails = (item) => {
    setSelectedItemForDetails(item);
    setShowDetailsModal(true);
  };

  const handleDetailsClose = () => {
    setShowDetailsModal(false);
    setSelectedItemForDetails(null);
  };

  // Check if any approval is a program or highlight submission to show Title column
  const hasTitleColumn = approvals.some(item => {
    const section = item.section?.toLowerCase();
    return section === 'programs' || section === 'highlights';
  });

  // Helper function to extract title from proposed_data (for both programs and highlights)
  const getItemTitle = (item) => {
    const section = item.section?.toLowerCase();
    if ((section === 'programs' || section === 'highlights') && item.proposed_data) {
      try {
        const proposedData = typeof item.proposed_data === 'string' 
          ? JSON.parse(item.proposed_data) 
          : item.proposed_data;
        return proposedData?.title || 'N/A';
      } catch (error) {
        return 'N/A';
      }
    }
    return null;
  };

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.numberColumn}>#</th>
              <th className={styles.selectColumn}>
                <input
                  type="checkbox"
                  checked={approvals.length > 0 && approvals.every(item => selectedItems.has(item.uniqueKey || item.id))}
                  onChange={onSelectAll}
                  className={styles.checkbox}
                />
              </th>
              <th className={styles.organizationColumn}>Organization</th>
              {hasTitleColumn && (
                <th className={styles.titleColumn}>Title</th>
              )}
              <th className={styles.sectionColumn}>Section</th>
              <th className={styles.dateColumn}>Date</th>
              <th className={styles.statusColumn}>Status</th>
              <th className={styles.actionsColumn}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {approvals.length === 0 ? (
              <tr>
                <td colSpan={hasTitleColumn ? "8" : "7"} className={styles.emptyStateCell}>
                  <div className={styles.emptyState}>
                    <h3 className={styles.emptyStateTitle}>No submissions found</h3>
                    <p className={styles.emptyStateText}>
                      No submissions found matching your current filters. New submissions will appear here when administrators submit updates.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              approvals.map((item, index) => {
                const itemTitle = getItemTitle(item);
                const rowNumber = sortBy === 'oldest' 
                  ? totalCount - (startIndex + index)
                  : startIndex + index + 1;
                return (
                <tr key={item.uniqueKey || item.id} className={styles.tableRow}>
                  <td className={styles.numberCell}>
                    {rowNumber}
                  </td>
                  <td className={styles.selectCell}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.uniqueKey || item.id)}
                      onChange={() => onSelectItem(item.uniqueKey || item.id)}
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.organizationCell}>
                    <div className={styles.orgInfo}>
                      <div className={styles.orgLogoContainer}>
                        {item.organization_logo ? (() => {
                          const logoUrl = getOrganizationImageUrl(item.organization_logo, 'logo');
                          if (logoUrl && logoUrl !== 'ORGANIZATION_LOGO_UNAVAILABLE') {
                            return (
                              <Image
                                src={logoUrl}
                                alt={`${item.organization_acronym || item.org || 'Organization'} logo`}
                                width={40}
                                height={40}
                                className={styles.orgLogo}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            );
                          }
                          return null;
                        })() : null}
                        <div 
                          className={styles.orgLogoPlaceholder}
                          style={{ 
                            display: (() => {
                              if (!item.organization_logo) return 'flex';
                              const logoUrl = getOrganizationImageUrl(item.organization_logo, 'logo');
                              return (logoUrl && logoUrl !== 'ORGANIZATION_LOGO_UNAVAILABLE') ? 'none' : 'flex';
                            })()
                          }}
                        >
                          {(item.organization_acronym || item.org || '?').charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <span className={styles.orgAcronym}>
                        {item.organization_acronym || item.org || 'N/A'}
                      </span>
                    </div>
                  </td>
                  {hasTitleColumn && (
                    <td className={styles.titleCell}>
                      {itemTitle || '-'}
                    </td>
                  )}
                  <td className={styles.sectionCell}>
                    {item.section?.charAt(0).toUpperCase() + item.section?.slice(1) || 'N/A'}
                  </td>
                  <td className={styles.dateCell}>
                    {formatDateShort(item.submitted_at)}
                  </td>
                  <td className={styles.statusCell}>
                    {getStatusBadge(item.status)}
                  </td>
                  <td className={styles.actionsCell}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className={styles.actionDropdownWrapper} data-action-dropdown-wrapper>
                        <div className={styles.actionDropdownButtonWrapper}>
                          <div
                            className={styles.actionDropdown}
                            data-action-dropdown-button
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent default behavior
                              e.stopPropagation(); // Prevent mousedown from triggering click-outside handler
                            }}
                            onClick={(e) => {
                              e.preventDefault(); // Prevent default behavior
                              e.stopPropagation(); // Prevent event bubbling
                              
                              const uniqueId = item.uniqueKey || item.id;
                              const dropdownId = `action-${uniqueId}`;
                              
                              // Check current state and toggle
                              const isCurrentlyOpen = showDropdown === dropdownId;
                              
                              if (isCurrentlyOpen) {
                                // Close dropdown on second click
                                setShowDropdown(null);
                                setDropdownPosition(prev => {
                                  const newPos = { ...prev };
                                  delete newPos[dropdownId];
                                  return newPos;
                                });
                              } else {
                                // Open dropdown on first click
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
                              data-action-dropdown-options
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
                              {!readOnly && (item.status === 'pending' || item.status === 'pending_superadmin_approval') && (
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
                                      onRejectClick(item);
                                      setShowDropdown(null);
                                      setDropdownPosition({});
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    Reject
                                  </li>
                                </>
                              )}
                              {!readOnly && (
                              <li 
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onDeleteClick(item);
                                  setShowDropdown(null);
                                  setDropdownPosition({});
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                Delete
                              </li>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* View Details Modal */}
      <ViewDetailsModal 
        isOpen={showDetailsModal}
        onClose={handleDetailsClose}
        submissionData={selectedItemForDetails}
        onApprove={onApprove}
        onReject={onRejectClick}
      />
    </>
  );
}
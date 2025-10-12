'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaSpinner, FaEye, FaCheck, FaTimes, FaSearch, FaFilter } from 'react-icons/fa';
import { formatDateShort } from '@/utils/dateUtils';
import styles from './HighlightsApproval.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function HighlightsApproval() {
  const [highlights, setHighlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [highlightToReject, setHighlightToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch highlights for approval
  const fetchHighlights = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('superAdminToken');
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/admin/highlights/approval/all?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch highlights');
      }

      const data = await response.json();
      setHighlights(data.highlights || []);
    } catch (error) {
      console.error('Error fetching highlights:', error);
      setError('Failed to fetch highlights');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  // Handle status update (approve/reject)
  const handleStatusUpdate = useCallback(async (highlightId, newStatus, rejectionReason = '') => {
    try {
      setIsApproving(true);
      const token = localStorage.getItem('superAdminToken');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/highlights/approval/${highlightId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          rejection_reason: rejectionReason
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${newStatus} highlight`);
      }

      // Refresh highlights list
      await fetchHighlights();
      
      // Close modal if open
      setSelectedHighlight(null);
      
      // Show success message (you can add a toast notification here)
      console.log(`Highlight ${newStatus} successfully`);
    } catch (error) {
      console.error(`Error ${newStatus}ing highlight:`, error);
      // Show error message (you can add a toast notification here)
    } finally {
      setIsApproving(false);
    }
  }, [fetchHighlights]);

  // Handle reject button click - show confirmation modal
  const handleRejectClick = useCallback((highlight) => {
    setHighlightToReject(highlight);
    setShowRejectModal(true);
  }, []);

  // Handle rejection confirmation
  const handleRejectConfirm = useCallback(async () => {
    if (!highlightToReject) return;
    
    await handleStatusUpdate(highlightToReject.id, 'rejected', rejectionReason);
    setShowRejectModal(false);
    setHighlightToReject(null);
    setRejectionReason('');
  }, [highlightToReject, rejectionReason, handleStatusUpdate]);

  // Handle rejection cancellation
  const handleRejectCancel = useCallback(() => {
    setShowRejectModal(false);
    setHighlightToReject(null);
    setRejectionReason('');
  }, []);

  // Filter and sort highlights
  const filteredAndSortedHighlights = useCallback(() => {
    let filtered = highlights;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(highlight => 
        highlight.title?.toLowerCase().includes(query) ||
        highlight.description?.toLowerCase().includes(query) ||
        highlight.organization_name?.toLowerCase().includes(query) ||
        highlight.organization_acronym?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'organization':
          return (a.organization_name || '').localeCompare(b.organization_name || '');
        default:
          return 0;
      }
    });

    return sorted;
  }, [highlights, searchQuery, sortBy]);

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'approved':
        return styles.statusApproved;
      case 'rejected':
        return styles.statusRejected;
      default:
        return styles.statusPending;
    }
  };

  // Get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <FaSpinner className={styles.spinner} />
        <p>Loading highlights for approval...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
        <button onClick={fetchHighlights} className={styles.retryButton}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.mainArea}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Highlights Approval</h1>
      </div>

      {/* Filters */}
      <div className={styles.filtersContainer}>
        {/* Search */}
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search highlights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Status Filter */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Sort */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="organization">Organization A-Z</option>
          </select>
        </div>
      </div>

      {/* Highlights Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Organization</th>
              <th>Created By</th>
              <th>Date Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedHighlights().length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.noData}>
                  No highlights found
                </td>
              </tr>
            ) : (
              filteredAndSortedHighlights().map((highlight) => (
                <tr key={highlight.id}>
                  <td className={styles.titleCell}>
                    <div className={styles.titleContent}>
                      <span className={styles.titleText}>{highlight.title}</span>
                      <span className={styles.descriptionText}>
                        {highlight.description?.substring(0, 100)}...
                      </span>
                    </div>
                  </td>
                  <td className={styles.organizationCell}>
                    <div className={styles.organizationInfo}>
                      <span className={styles.orgName}>{highlight.organization_name}</span>
                      <span className={styles.orgAcronym}>({highlight.organization_acronym})</span>
                    </div>
                  </td>
                  <td className={styles.creatorCell}>
                    <div className={styles.creatorInfo}>
                      <span className={styles.creatorName}>
                        {highlight.admin_email || 'Unknown Admin'}
                      </span>
                      <span className={styles.creatorEmail}>{highlight.admin_email}</span>
                    </div>
                  </td>
                  <td className={styles.dateCell}>
                    {formatDateShort(highlight.created_at)}
                  </td>
                  <td className={styles.statusCell}>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(highlight.status)}`}>
                      {getStatusLabel(highlight.status)}
                    </span>
                  </td>
                  <td className={styles.actionsCell}>
                    <div className={styles.actions}>
                      <button
                        onClick={() => setSelectedHighlight(highlight)}
                        className={styles.viewButton}
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      {highlight.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(highlight.id, 'approved')}
                            className={styles.approveButton}
                            disabled={isApproving}
                            title="Approve"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => handleRejectClick(highlight)}
                            className={styles.rejectButton}
                            disabled={isApproving}
                            title="Reject"
                          >
                            <FaTimes />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Highlight Detail Modal */}
      {selectedHighlight && (
        <div className={styles.modalOverlay} onClick={() => setSelectedHighlight(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedHighlight.title}</h2>
              <button
                onClick={() => setSelectedHighlight(null)}
                className={styles.closeButton}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.modalSection}>
                <h3 className={styles.sectionTitle}>Organization</h3>
                <p className={styles.sectionContent}>
                  {selectedHighlight.organization_name} ({selectedHighlight.organization_acronym})
                </p>
              </div>
              
              <div className={styles.modalSection}>
                <h3 className={styles.sectionTitle}>Created By</h3>
                <p className={styles.sectionContent}>
                  {selectedHighlight.admin_email || 'Unknown Admin'}
                </p>
              </div>
              
              <div className={styles.modalSection}>
                <h3 className={styles.sectionTitle}>Description</h3>
                <p className={styles.sectionContent}>{selectedHighlight.description}</p>
              </div>
              
              {selectedHighlight.media && selectedHighlight.media.length > 0 && (
                <div className={styles.modalSection}>
                  <h3 className={styles.sectionTitle}>Media Files</h3>
                  <div className={styles.mediaGrid}>
                    {selectedHighlight.media.map((file, index) => (
                      <div key={index} className={styles.mediaItem}>
                        {file.mimetype?.startsWith('image/') ? (
                          <img
                            src={file.url}
                            alt={file.filename}
                            className={styles.mediaImage}
                          />
                        ) : file.mimetype?.startsWith('video/') ? (
                          <video
                            src={file.url}
                            controls
                            className={styles.mediaVideo}
                          >
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <div className={styles.mediaFile}>
                            <span>{file.filename}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {selectedHighlight.status === 'pending' && (
              <div className={styles.modalFooter}>
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedHighlight.id, 'approved');
                    setSelectedHighlight(null);
                  }}
                  className={styles.modalApproveButton}
                  disabled={isApproving}
                >
                  <FaCheck />
                  Approve
                </button>
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedHighlight.id, 'rejected');
                    setSelectedHighlight(null);
                  }}
                  className={styles.modalRejectButton}
                  disabled={isApproving}
                >
                  <FaTimes />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejection Confirmation Modal */}
      {showRejectModal && (
        <div className={styles.rejectModalOverlay}>
          <div className={styles.rejectModal}>
            <div className={styles.rejectModalHeader}>
              <h2 className={styles.rejectModalTitle}>Reject Highlight</h2>
              <button 
                className={styles.rejectModalCloseBtn}
                onClick={handleRejectCancel}
                disabled={isApproving}
              >
                <FaTimes />
              </button>
            </div>

            <div className={styles.rejectModalContent}>
              <div className={styles.rejectWarningSection}>
                <div className={styles.rejectWarningIcon}>
                  <FaTimes />
                </div>
                <div className={styles.rejectWarningText}>
                  <p className={styles.rejectMessage}>Are you sure you want to reject this highlight?</p>
                  <p className={styles.rejectDetails}>
                    This action will mark the highlight as rejected and it will not be displayed on the public portal.
                  </p>
                </div>
              </div>

              <div className={styles.rejectCommentSection}>
                <label htmlFor="rejectionReason" className={styles.rejectCommentLabel}>
                  Reason for rejection (required):
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this highlight..."
                  className={styles.rejectCommentInput}
                  rows={3}
                  disabled={isApproving}
                />
              </div>

              <div className={styles.rejectDestructiveWarning}>
                <strong>⚠️ This is a destructive action that cannot be undone!</strong>
              </div>
            </div>

            <div className={styles.rejectModalActions}>
              <button
                className={styles.rejectCancelBtn}
                onClick={handleRejectCancel}
                disabled={isApproving}
              >
                Cancel
              </button>
              <button
                className={`${styles.rejectConfirmBtn} ${styles.rejectBtn}`}
                onClick={handleRejectConfirm}
                disabled={isApproving || !rejectionReason.trim()}
              >
                {isApproving ? (
                  <>
                    <FaSpinner className={styles.rejectSpinner} />
                    Processing...
                  </>
                ) : (
                  'Reject Highlight'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

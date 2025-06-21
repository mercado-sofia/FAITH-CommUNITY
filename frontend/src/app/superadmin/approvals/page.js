'use client';

import { useState, useEffect } from 'react';
import styles from '../styles/approvals.module.css';
import { FaChevronDown } from 'react-icons/fa';
import { useGetPendingApprovalsQuery, useActOnUpdateMutation } from '@/rtk/admin/approvalApi';

export default function PendingApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectId, setSelectedRejectId] = useState(null);
  const [comment, setComment] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [filter, setFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedApproveId, setSelectedApproveId] = useState(null);

  const { data, error, isLoading, refetch } = useGetPendingApprovalsQuery();
  const [actOnUpdate] = useActOnUpdateMutation();

  useEffect(() => {
    if (data) {
      const formattedData = data.map(item => {
        let previous, proposed;
        
        try {
          previous = typeof item.previous === 'string' ? JSON.parse(item.previous) : item.previous;
          proposed = typeof item.proposed === 'string' ? JSON.parse(item.proposed) : item.proposed;
        } catch (error) {
          console.error('Error parsing data:', error);
          previous = {};
          proposed = {};
        }
        
        return {
          id: item.id,
          orgName: item.organization_name,
          section: item.section,
          submittedAt: new Date(item.submitted_at), // store as Date object
          status: item.status,
          rejectionComment: item.rejection_comment,
          details: {
            name: { 
              previous: previous.name ?? 'N/A', 
              proposed: proposed.name ?? 'N/A' 
            },
            acronym: { 
              previous: previous.acronym ?? 'N/A', 
              proposed: proposed.acronym ?? 'N/A' 
            },
            description: { 
              previous: previous.description ?? 'N/A', 
              proposed: proposed.description ?? 'N/A' 
            },
            facebook: { 
              previous: previous.facebook ?? 'N/A', 
              proposed: proposed.facebook ?? 'N/A' 
            },
            email: { 
              previous: previous.email ?? 'N/A', 
              proposed: proposed.email ?? 'N/A' 
            },
            logo: { 
              previous: previous.logo || null, 
              proposed: proposed.logo || null 
            },
            advocacies: { 
              previous: Array.isArray(previous.advocacies) ? previous.advocacies : [], 
              proposed: Array.isArray(proposed.advocacies) ? proposed.advocacies : [] 
            },
            competencies: { 
              previous: Array.isArray(previous.competencies) ? previous.competencies : [], 
              proposed: Array.isArray(proposed.competencies) ? proposed.competencies : [] 
            },
            heads: { 
              previous: Array.isArray(previous.heads) ? previous.heads : [], 
              proposed: Array.isArray(proposed.heads) ? proposed.heads : []
            }
          }
        };
      });
      setApprovals(formattedData);
    }
  }, [data]);

  const handleApproveClick = (id) => {
    setSelectedApproveId(id);
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    try {
      await actOnUpdate({ 
        id: selectedApproveId, 
        action: 'approve'
      }).unwrap();
      
      setApprovals(prev =>
        prev.map(item =>
          item.id === selectedApproveId ? { ...item, status: 'Approved' } : item
        )
      );

      alert('Changes have been approved and organization information has been updated.');
      
      refetch();
    } catch (error) {
      console.error('Error approving update:', error);
      alert('Failed to approve changes. Please try again.');
    }
    setShowApproveModal(false);
    setSelectedApproveId(null);
  };

  const handleRejectClick = (id) => {
    setSelectedRejectId(id);
    setComment('');
    setRejectError('');
    setShowRejectModal(true);
  };

  const submitRejection = async (withComment) => {
    if (withComment && !comment.trim()) {
      setRejectError('Please enter a reason for rejection.');
      return;
    }

    try {
      await actOnUpdate({
        id: selectedRejectId,
        action: 'reject',
        rejection_comment: withComment ? comment : ''
      }).unwrap();

      setApprovals(prev =>
        prev.map(item =>
          item.id === selectedRejectId
            ? {
                ...item,
                status: 'Rejected',
                rejectionComment: withComment ? comment : ''
              }
            : item
        )
      );

      alert('Changes have been rejected.');
      
      refetch();
    } catch (error) {
      console.error('Error rejecting update:', error);
      alert('Failed to reject changes. Please try again.');
    }
    setShowRejectModal(false);
    setSelectedRejectId(null);
    setComment('');
    setRejectError('');
  };

  const selectFilter = (value) => {
    setFilter(value);
    setShowFilterDropdown(false);
  };

  const selectSort = (value) => {
    setSortOrder(value);
    setShowSortDropdown(false);
  };

  const handleSearchChange = (e) => setSearchQuery(e.target.value.toLowerCase());

  const filteredApprovals = approvals
    .filter((item) =>
      filter === 'All' ? true : item.status === filter
    )
    .filter((item) =>
      item.orgName.toLowerCase().includes(searchQuery) ||
      item.section.toLowerCase().includes(searchQuery)
    )
    .sort((a, b) => {
      return sortOrder === 'Newest' ? b.submittedAt - a.submittedAt : a.submittedAt - b.submittedAt;
    });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading approvals: {error.message}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Pending Content Approvals</h1>
      <h2 className={styles.pageSubtitle}>Review and manage pending content updates submitted by organizations.</h2>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Search by org or section..."
          value={searchQuery}
          onChange={handleSearchChange}
          className={styles.searchBar}
        />

        <div className={styles.dropdownWrapper}>
          <button className={`${styles.dropdownTrigger} ${filter !== 'All' ? styles.activeDropdown : ''}`} onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
            <span>{filter}</span>
            <FaChevronDown className={styles.dropdownIcon} />
          </button>
          {showFilterDropdown && (
            <div className={styles.dropdownMenu}>
              {['All', 'Pending', 'Approved', 'Rejected'].map((option) => (
                <div key={option} onClick={() => selectFilter(option)}>{option}</div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.dropdownWrapper}>
          <button className={`${styles.dropdownTrigger} ${sortOrder !== 'Newest' ? styles.activeDropdown : ''}`} onClick={() => setShowSortDropdown(!showSortDropdown)}>
            <span>{sortOrder}</span>
            <FaChevronDown className={styles.dropdownIcon} />
          </button>
          {showSortDropdown && (
            <div className={styles.dropdownMenu}>
              {['Newest', 'Oldest'].map((option) => (
                <div key={option} onClick={() => selectSort(option)}>{option}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.cardList}>
        {filteredApprovals.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.header}>
              <div className={styles.headerInfo}>
                <h3>{item.orgName}</h3>
                <span className={styles.section}>{item.section}</span>
                <span className={`${styles.status} ${styles[item.status.toLowerCase()]}`}>
                  Status: {item.status}
                </span>
              </div>
              <div className={styles.actionButtons}>
                <button className={styles.approveBtn} onClick={() => handleApproveClick(item.id)}>
                  Accept & Approve
                </button>
                <button className={styles.rejectBtn} onClick={() => handleRejectClick(item.id)}>
                  Reject
                </button>
              </div>
            </div>
            <p className={styles.submitted}>Submitted: {item.submittedAt.toLocaleDateString()}</p>
            <div className={styles.contentPreview}>
              {item.details && Object.entries(item.details).map(([field, value]) => (
                <div key={field} className={styles.fieldBlock}>
                  <p><strong>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong></p>
                  
                  <div className={styles.compareBlock}>
                    <div className={styles.previousVersion}>
                      <p><span className={styles.label}>Previous:</span></p>
                      {field === 'logo' && value.previous ? (
                        <img
                          src={`http://localhost:8080/uploads/${value.previous}`}
                          alt="Previous"
                          className={styles.thumbnail}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/logo/faith_community_logo.png';
                          }}
                        />
                      ) : field === 'heads' ? (
                        <div className={styles.headsList}>
                          {value.previous.length > 0 ? value.previous.map((head, idx) => (
                            <div key={idx} className={styles.headItem}>
                              {head.image && (
                                <img
                                  src={`http://localhost:8080/uploads/${head.image}`}
                                  alt={head.name}
                                  className={styles.headThumbnail}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/logo/faith_community_logo.png';
                                  }}
                                />
                              )}
                              <div className={styles.headInfo}>
                                <p><strong>Name:</strong> {head.name}</p>
                                <p><strong>Role:</strong> {head.role}</p>
                                <p><strong>Email:</strong> {head.email}</p>
                                <p><strong>Facebook:</strong> {head.facebook}</p>
                              </div>
                            </div>
                          )) : <p className={styles.value}>No previous heads</p>}
                        </div>
                      ) : (
                        <p className={styles.value}>{value.previous}</p>
                      )}
                    </div>

                    <div className={styles.proposedVersion}>
                      <p><span className={styles.label}>Proposed:</span></p>
                      {field === 'logo' && value.proposed ? (
                        <img
                          src={`http://localhost:8080/uploads/${value.proposed}`}
                          alt="Proposed"
                          className={styles.thumbnail}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/logo/faith_community_logo.png';
                          }}
                        />
                      ) : field === 'heads' ? (
                        <div className={styles.headsList}>
                          {value.proposed.length > 0 ? value.proposed.map((head, idx) => (
                            <div key={idx} className={styles.headItem}>
                              {head.image && (
                                <img
                                  src={`http://localhost:8080/uploads/${head.image}`}
                                  alt={head.name}
                                  className={styles.headThumbnail}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/logo/faith_community_logo.png';
                                  }}
                                />
                              )}
                              <div className={styles.headInfo}>
                                <p><strong>Name:</strong> {head.name}</p>
                                <p><strong>Role:</strong> {head.role}</p>
                                <p><strong>Email:</strong> {head.email}</p>
                                <p><strong>Facebook:</strong> {head.facebook}</p>
                              </div>
                            </div>
                          )) : <p className={styles.value}>No proposed heads</p>}
                        </div>
                      ) : (
                        <p className={styles.value}>{value.proposed}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button
              className={styles.closeModalBtn}
              onClick={() => setShowRejectModal(false)}
            >
              &times;
            </button>
            <h2 className={styles.rejectHeading}>Reject Submission</h2>
            <textarea
              placeholder="Add a reason for rejection (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
            {rejectError && (
              <p className={styles.rejectError}>{rejectError}</p>
            )}
            <div className={styles.buttonGroupCenter}>
              <button
                className={styles.confirmBtn}
                onClick={() => submitRejection(true)}
                disabled={!comment.trim()}
              >
                Reject with Comment
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => {
                  submitRejection(false);
                  setRejectError('');
                }}
              >
                Reject without Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {showApproveModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.approveHeading}>Confirm Approval</h2>
            <p>Are you sure you want to approve these changes?</p>
            <div className={styles.approvalNote}>
              <p>By approving these changes:</p>
              <ul>
                <li>The organizatioss information will be immediately updated</li>
                <li>The changes will be reflected on their public page</li>
                <li>The admin will be notified of the approval</li>
              </ul>
            </div>
            <div className={styles.buttonGroup}>
              <button className={styles.confirmBtn} onClick={confirmApprove}>
                Yes, Approve Changes
              </button>
              <button className={styles.cancelBtn} onClick={() => setShowApproveModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
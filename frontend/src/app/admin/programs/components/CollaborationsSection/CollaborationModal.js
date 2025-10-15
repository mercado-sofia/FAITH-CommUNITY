'use client';

import { useState } from 'react';
import { FaTimes, FaCheck, FaUser, FaBuilding, FaCalendarAlt, FaClock, FaInfoCircle } from 'react-icons/fa';
import { ConfirmationModal } from '@/components';
import styles from './CollaborationModal.module.css';

export function CollaborationModal({ collaboration, onClose, onAccept, onDecline }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // Safety check for collaboration data
  if (!collaboration) {
    return null;
  }

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineClick = () => {
    setShowDeclineModal(true);
  };

  const handleDeclineConfirm = async () => {
    setIsProcessing(true);
    try {
      await onDecline();
      setShowDeclineModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineCancel = () => {
    setShowDeclineModal(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'accepted':
        return '#10b981';
      case 'declined':
        return '#ef4444';
      case 'pending_collaboration':
        return '#3b82f6';
      case 'pending_superadmin_approval':
        return '#8b5cf6';
      case 'approved':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock />;
      case 'accepted':
        return <FaCheck />;
      case 'declined':
        return <FaTimes />;
      case 'pending_collaboration':
        return <FaClock />;
      case 'pending_superadmin_approval':
        return <FaClock />;
      case 'approved':
        return <FaCheck />;
      default:
        return <FaClock />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRequestTypeText = (requestType) => {
    return requestType === 'received' ? 'Collaboration Request Received' : 'Collaboration Request Sent';
  };

  const getRequestTypeColor = (requestType) => {
    return requestType === 'received' ? '#3b82f6' : '#8b5cf6';
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{collaboration.program_title}</h2>
            <div className={styles.requestType} style={{ color: getRequestTypeColor(collaboration.request_type) }}>
              {getRequestTypeText(collaboration.request_type)}
            </div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.statusBadge} style={{ backgroundColor: getStatusColor(collaboration.status) }}>
              {getStatusIcon(collaboration.status)}
              <span>{(collaboration.status || 'pending').charAt(0).toUpperCase() + (collaboration.status || 'pending').slice(1)}</span>
            </div>
            <button onClick={onClose} className={styles.closeButton}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Program Image */}
          {collaboration.program_image && !imageError && (
            <div className={styles.programImageSection}>
              <img 
                src={collaboration.program_image} 
                alt={collaboration.program_title}
                className={styles.programImage}
                onError={() => {
                  setImageError(true);
                }}
              />
            </div>
          )}

          {/* Program Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Program Information</h3>
            <div className={styles.programInfo}>
              {collaboration.program_description && (
                <div className={styles.description}>
                  <h4>Description</h4>
                  <p>{collaboration.program_description}</p>
                </div>
              )}
              
              <div className={styles.programDetails}>
                {collaboration.program_category && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Category:</span>
                    <span className={styles.detailValue}>{collaboration.program_category}</span>
                  </div>
                )}
                
                {collaboration.event_start_date && (
                  <div className={styles.detailItem}>
                    <FaCalendarAlt className={styles.detailIcon} />
                    <span className={styles.detailLabel}>Event Date:</span>
                    <span className={styles.detailValue}>
                      {new Date(collaboration.event_start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      {collaboration.event_end_date && collaboration.event_end_date !== collaboration.event_start_date && 
                        ` - ${new Date(collaboration.event_end_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}`
                      }
                    </span>
                  </div>
                )}
                
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Program Status:</span>
                  <span className={styles.detailValue}>{collaboration.program_status}</span>
                </div>
                
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Created:</span>
                  <span className={styles.detailValue}>{formatDate(collaboration.program_created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Information */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Organization Details</h3>
            <div className={styles.organizationInfo}>
              <div className={styles.orgCard}>
                <div className={styles.orgHeader}>
                  <FaBuilding className={styles.orgIcon} />
                  <span className={styles.orgLabel}>
                    {collaboration.request_type === 'received' ? 'Requesting Organization' : 'Target Organization'}
                  </span>
                </div>
                <div className={styles.orgDetails}>
                  <div className={styles.orgName}>
                    {collaboration.request_type === 'received' 
                      ? collaboration.inviter_org_name 
                      : collaboration.invitee_org_name
                    }
                  </div>
                  <div className={styles.orgAcronym}>
                    ({collaboration.request_type === 'received' 
                      ? collaboration.inviter_org_acronym 
                      : collaboration.invitee_org_acronym
                    })
                  </div>
                </div>
              </div>

              <div className={styles.adminCard}>
                <div className={styles.adminHeader}>
                  <FaUser className={styles.adminIcon} />
                  <span className={styles.adminLabel}>
                    {collaboration.request_type === 'received' ? 'Requesting Admin' : 'Target Admin'}
                  </span>
                </div>
                <div className={styles.adminDetails}>
                  <div className={styles.adminName}>
                    {collaboration.request_type === 'received' 
                      ? collaboration.inviter_email
                      : collaboration.invitee_email
                    }
                  </div>
                  <div className={styles.adminEmail}>
                    {collaboration.request_type === 'received' 
                      ? collaboration.inviter_email 
                      : collaboration.invitee_email
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Timeline</h3>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineIcon}>
                  <FaClock />
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>Request Sent</div>
                  <div className={styles.timelineDate}>{formatDate(collaboration.invited_at)}</div>
                </div>
              </div>
              
              {collaboration.responded_at && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: getStatusColor(collaboration.status) }}>
                    {getStatusIcon(collaboration.status)}
                  </div>
                  <div className={styles.timelineContent}>
                  <div className={styles.timelineTitle}>
                    Request {(collaboration.status || 'pending') === 'accepted' ? 'Accepted' : 'Declined'}
                  </div>
                    <div className={styles.timelineDate}>{formatDate(collaboration.responded_at)}</div>
                  </div>
                </div>
              )}

              {/* Superadmin Approval Status */}
              {collaboration.program_status === 'pending_superadmin_approval' && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#8b5cf6' }}>
                    <FaClock />
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineTitle}>Pending Superadmin Approval</div>
                    <div className={styles.timelineDate}>Awaiting superadmin review</div>
                  </div>
                </div>
              )}

              {collaboration.program_status === 'approved' && collaboration.is_approved && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#10b981' }}>
                    <FaCheck />
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineTitle}>Superadmin Approved</div>
                    <div className={styles.timelineDate}>Program approved and published</div>
                  </div>
                </div>
              )}

              {collaboration.program_status === 'rejected' && (
                <div className={styles.timelineItem}>
                  <div className={styles.timelineIcon} style={{ backgroundColor: '#ef4444' }}>
                    <FaTimes />
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineTitle}>Superadmin Rejected</div>
                    <div className={styles.timelineDate}>Program rejected by superadmin</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Information */}
          {(collaboration.status === 'pending' || collaboration.status === '' || !collaboration.status) && collaboration.request_type === 'received' && (
            <div className={styles.section}>
              <div className={styles.actionInfo}>
                <FaInfoCircle className={styles.infoIcon} />
                <div className={styles.infoContent}>
                  <h4>Action Required</h4>
                  <p>
                    You have received a collaboration request for this program. 
                    If you accept, the program will be moved to "Pending Superadmin Approval" status and sent to the superadmin for final review.
                    If you decline, the program will be marked as declined and not sent to the superadmin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Information */}
          {collaboration.program_status === 'pending_superadmin_approval' && (
            <div className={styles.section}>
              <div className={styles.actionInfo}>
                <FaInfoCircle className={styles.infoIcon} />
                <div className={styles.infoContent}>
                  <h4>Pending Superadmin Review</h4>
                  <p>
                    This collaborative program has been accepted by all collaborators and is now pending superadmin approval. 
                    The superadmin will review the program and make a final decision on whether to approve or reject it.
                  </p>
                </div>
              </div>
            </div>
          )}

          {collaboration.program_status === 'approved' && collaboration.is_approved && (
            <div className={styles.section}>
              <div className={styles.actionInfo}>
                <FaInfoCircle className={styles.infoIcon} />
                <div className={styles.infoContent}>
                  <h4>Program Approved</h4>
                  <p>
                    This collaborative program has been approved by the superadmin and is now published. 
                    All collaborating organizations can now view and manage this program.
                  </p>
                </div>
              </div>
            </div>
          )}

          {collaboration.program_status === 'rejected' && (
            <div className={styles.section}>
              <div className={styles.actionInfo}>
                <FaInfoCircle className={styles.infoIcon} />
                <div className={styles.infoContent}>
                  <h4>Program Rejected</h4>
                  <p>
                    This collaborative program has been rejected by the superadmin. 
                    The program will not be published and collaboration on this program has ended.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelButton}>
            Close
          </button>
          
          {(collaboration.status === 'pending' || collaboration.status === '' || !collaboration.status) && collaboration.request_type === 'received' && (
            <>
              <button
                onClick={handleDeclineClick}
                className={styles.declineButton}
                disabled={isProcessing}
              >
                <FaTimes />
                {isProcessing ? 'Processing...' : 'Decline'}
              </button>
              <button
                onClick={handleAccept}
                className={styles.acceptButton}
                disabled={isProcessing}
              >
                <FaCheck />
                {isProcessing ? 'Processing...' : 'Accept'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Decline Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeclineModal}
        itemName={collaboration.program_title}
        itemType="collaboration invite"
        actionType="decline"
        onConfirm={handleDeclineConfirm}
        onCancel={handleDeclineCancel}
        isDeleting={isProcessing}
        customMessage="Are you sure you want to decline this collaboration invite?"
      />
    </div>
  );
}

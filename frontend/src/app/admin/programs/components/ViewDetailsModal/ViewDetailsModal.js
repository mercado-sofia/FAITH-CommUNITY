'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FaTimes, FaCalendar, FaEye, FaUsers, FaExclamationTriangle, FaCheck, FaUser, FaBuilding, FaClock, FaInfoCircle } from 'react-icons/fa';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import { formatProgramDates, formatDateShort } from '@/utils/dateUtils.js';
import { getStatusDisplayText } from '@/utils/collaborationStatusUtils';
import { ConfirmationModal } from '@/components';
import styles from './ViewDetailsModal.module.css';

const ViewDetailsModal = ({ 
  program, 
  onClose, 
  // Collaboration mode props
  mode = 'view', // 'view' or 'collaboration'
  collaboration = null,
  onAccept = null,
  onDecline = null
}) => {
  // State for collaboration mode
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // Safety check for collaboration data in collaboration mode
  if (mode === 'collaboration' && !collaboration) {
    return null;
  }

  // Use collaboration data if in collaboration mode, otherwise use program data
  const data = mode === 'collaboration' ? collaboration : program;

  const getCategoryLabel = (category) => {
    const categoryMap = {
      outreach: 'Outreach',
      education: 'Education',
      health: 'Health',
      environment: 'Environment',
      community: 'Community Development',
      youth: 'Youth Programs',
      women: 'Women Empowerment',
      elderly: 'Elderly Care',
      disaster: 'Disaster Relief',
      other: 'Other'
    };
    return categoryMap[category] || category || 'Uncategorized';
  };

  // Collaboration mode helper functions
  const handleAccept = async () => {
    if (!onAccept) return;
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
    if (!onDecline) return;
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
        return '#fef3c7';
      case 'accepted':
        return '#d1fae5';
      case 'declined':
        return '#fee2e2';
      case 'approved':
        return '#d1fae5';
      default:
        return '#fef3c7';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'pending':
        return '#92400e';
      case 'accepted':
        return '#065f46';
      case 'declined':
        return '#991b1b';
      case 'approved':
        return '#065f46';
      default:
        return '#92400e';
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
      case 'approved':
        return <FaCheck />;
      default:
        return <FaClock />;
    }
  };

  const getRequestTypeText = (requestType) => {
    return requestType === 'received' ? 'Collaboration Request Received' : 'Collaboration Request Sent';
  };

  const getRequestTypeColor = (requestType) => {
    return requestType === 'received' ? '#3b82f6' : '#8b5cf6';
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleSection}>
            <h2 className={styles.modalTitle}>
              {mode === 'collaboration' ? data.program_title : data.title}
            </h2>
            {mode === 'collaboration' && (
              <div className={styles.requestType} style={{ color: getRequestTypeColor(data.request_type) }}>
                {getRequestTypeText(data.request_type)}
              </div>
            )}
          </div>
          <div className={styles.headerActions}>
            {mode === 'collaboration' && (
              <div className={styles.statusBadge} style={{ 
                backgroundColor: getStatusColor(data.status),
                color: getStatusTextColor(data.status)
              }}>
                {getStatusIcon(data.status)}
                <span>{(data.status || 'pending').charAt(0).toUpperCase() + (data.status || 'pending').slice(1)}</span>
              </div>
            )}
            <button onClick={onClose} className={styles.closeButton}>
              <FaTimes />
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.contentLayout}>
            {/* Top Section - Image and Program Info Side by Side */}
            <div className={styles.topSection}>
              {/* Left - Program Image */}
              {(mode === 'collaboration' ? data.program_image : data.image) ? (
                <div className={styles.imageSection}>
                  {mode === 'collaboration' ? (
                    // Collaboration mode - direct image URL
                    <Image
                      src={data.program_image}
                      alt={data.program_title}
                      className={styles.programImage}
                      width={600}
                      height={300}
                      onError={() => {
                        setImageError(true);
                      }}
                    />
                  ) : (
                    // View mode - use utility function
                    <>
                      {getProgramImageUrl(data.image) === 'IMAGE_UNAVAILABLE' ? (
                        <div className={styles.imagePlaceholder}>
                          <FaExclamationTriangle />
                          <span>Image unavailable</span>
                        </div>
                      ) : (
                        <Image
                          src={getProgramImageUrl(data.image)}
                          alt={data.title}
                          className={styles.programImage}
                          width={600}
                          height={300}
                          onError={() => {
                            setImageError(true);
                          }}
                        />
                      )}
                    </>
                  )}
                  {mode === 'collaboration' && imageError && (
                    <div className={styles.imagePlaceholder}>
                      <FaExclamationTriangle />
                      <span>Image unavailable</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.imageSection}>
                  <div className={styles.imagePlaceholder}>
                    <FaEye />
                    <span>No image available</span>
                  </div>
                </div>
              )}

              {/* Right - Program Title, Status, Program Details */}
              <div className={styles.programInfoSection}>
                {/* Category at the top */}
                <div className={styles.categoryBadge}>
                  {getCategoryLabel(mode === 'collaboration' ? data.program_category : data.category)}
                </div>
                <h3 className={styles.programTitle}>
                  {mode === 'collaboration' ? data.program_title : data.title}
                </h3>
                
                {/* Status Badge - only show in view mode */}
                {mode === 'view' && data.status && (
                  <div className={`${styles.statusBadge} ${styles[data.status]}`}>
                    {(() => {
                      // Handle special status display for collaborative programs
                      // Check if program has any non-declined collaborations
                      const hasActiveCollaborations = data.collaborators && 
                        data.collaborators.some(collab => 
                          collab.status !== 'declined'
                        );
                      
                      if (hasActiveCollaborations) {
                        return getStatusDisplayText(data.status);
                      }
                      return data.status.charAt(0).toUpperCase() + data.status.slice(1);
                    })()}
                  </div>
                )}

                {/* Program Details */}
                <div className={styles.detailsSection}>
                  <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                      <FaCalendar className={styles.detailIcon} />
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Event Date(s)</span>
                        <span className={styles.detailValue}>
                          {mode === 'collaboration' ? (
                            data.event_start_date ? formatDateShort(data.event_start_date) : 'N/A'
                          ) : (
                            formatProgramDates(data)
                          )}
                        </span>
                      </div>
                    </div>

                    {(mode === 'collaboration' ? data.program_created_at : data.created_at) && (
                      <div className={styles.detailItem}>
                        <FaCalendar className={styles.detailIcon} />
                        <div className={styles.detailContent}>
                          <span className={styles.detailLabel}>Created</span>
                          <span className={styles.detailValue}>
                            {mode === 'collaboration' 
                              ? formatDateShort(data.program_created_at)
                              : formatDateShort(data.created_at)
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    {mode === 'collaboration' && data.program_status && (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Program Status:</span>
                        <span className={styles.detailValue}>{data.program_status}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description - Full Width Below */}
            <div className={styles.descriptionSection}>
              <h4 className={styles.sectionTitle}>Description</h4>
              <p className={styles.description}>
                {mode === 'collaboration' ? (data.program_description || 'No description provided') : (data.description || 'No description provided')}
              </p>
            </div>

            {/* Collaboration Section - only show in view mode */}
            {mode === 'view' && (() => {
              // Check if program has any non-declined collaborations
              const hasActiveCollaborations = data.collaborators && 
                Array.isArray(data.collaborators) && 
                data.collaborators.some(collab => 
                  collab.status !== 'declined'
                );
              
              const hasCollaborators = hasActiveCollaborations &&
                                     data.collaborators.some(collab => 
                                       collab && 
                                       typeof collab === 'object' && 
                                       collab.email && 
                                       collab.email.trim() !== ''
                                     );

              if (!hasCollaborators) {
                return null;
              }

              // Filter out invalid collaborators
              const validCollaborators = data.collaborators.filter(collab => 
                collab && 
                typeof collab === 'object' && 
                collab.email && 
                collab.email.trim() !== ''
              );

              if (validCollaborators.length === 0) {
                return null;
              }

              return (
                <div className={styles.collaborationSection}>
                  <h4 className={styles.sectionTitle}>
                    <FaUsers className={styles.sectionIcon} />
                    Collaborators
                  </h4>
                  <div className={styles.collaboratorsList}>
                    {validCollaborators.map((collaborator, index) => (
                      <div key={collaborator.id || `collab-${index}`} className={styles.collaboratorItem}>
                        <div className={styles.collaboratorInfo}>
                          <span className={styles.collaboratorEmail}>{collaborator.email}</span>
                          {collaborator.organization_acronym && 
                           collaborator.organization_acronym.trim() !== '' && (
                            <span className={styles.collaboratorOrg}>
                              ({collaborator.organization_acronym})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Organization Information - only show in collaboration mode */}
            {mode === 'collaboration' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Collaborator</h3>
                <div className={styles.organizationInfo}>
                  <div className={styles.orgCard}>
                    <div className={styles.orgDetails}>
                      <div className={styles.orgName}>
                        {data.request_type === 'received' 
                          ? data.inviter_org_name 
                          : data.invitee_org_name
                        } ({data.request_type === 'received' 
                          ? data.inviter_org_acronym 
                          : data.invitee_org_acronym
                        })
                      </div>
                      <div className={styles.adminEmail}>
                        {data.request_type === 'received' 
                          ? data.inviter_email 
                          : data.invitee_email
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline - only show in collaboration mode */}
            {mode === 'collaboration' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Timeline</h3>
                <div className={styles.timeline}>
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineIcon}>
                      <FaClock />
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineTitle}>Request Sent</div>
                      <div className={styles.timelineDate}>{formatDateShort(data.invited_at)}</div>
                    </div>
                  </div>
                  
                  {data.responded_at && (
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineIcon} style={{ backgroundColor: getStatusColor(data.status) }}>
                        {getStatusIcon(data.status)}
                      </div>
                      <div className={styles.timelineContent}>
                      <div className={styles.timelineTitle}>
                        Request {(data.status || 'pending') === 'accepted' ? 'Accepted' : 'Declined'}
                      </div>
                        <div className={styles.timelineDate}>{formatDateShort(data.responded_at)}</div>
                      </div>
                    </div>
                  )}

                  {/* Superadmin Approval Status */}
                  {!data.is_approved && data.collaboration_status === 'accepted' && (
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineIcon} style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                        <FaClock />
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>Pending Superadmin Approval</div>
                        <div className={styles.timelineDate}>Awaiting superadmin review</div>
                      </div>
                    </div>
                  )}

                  {data.is_approved && (
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineIcon} style={{ backgroundColor: '#10b981', color: 'white' }}>
                        <FaCheck />
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>Superadmin Approved</div>
                        <div className={styles.timelineDate}>Program approved and published</div>
                      </div>
                    </div>
                  )}

                  {!data.is_approved && data.collaboration_status === 'declined' && (
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineIcon} style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
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
            )}

            {/* Action Information - only show in collaboration mode */}
            {mode === 'collaboration' && (data.status === 'pending' || data.status === '' || !data.status) && data.request_type === 'received' && (
              <div className={styles.section}>
                <div className={styles.actionInfo}>
                  <FaInfoCircle className={styles.infoIcon} />
                  <div className={styles.infoContent}>
                    <h4>Action Required</h4>
                    <p>
                      You have received a collaboration request for this program. 
                      If you accept, the program will be created once all collaborators accept the collaboration request.
                      If you decline, the program will not be created if no collaborators accept.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Information - only show in collaboration mode */}
            {mode === 'collaboration' && !data.is_approved && data.collaboration_status === 'accepted' && (
              <div className={styles.section}>
                <div className={styles.actionInfo}>
                  <FaInfoCircle className={styles.infoIcon} />
                  <div className={styles.infoContent}>
                    <h4>Pending Superadmin Review</h4>
                    <p>
                      This collaborative program has been accepted by all collaborators and has been created successfully. 
                      The program is now live and visible to the public.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {mode === 'collaboration' && data.is_approved && (
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

            {mode === 'collaboration' && !data.is_approved && data.collaboration_status === 'declined' && (
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

          {/* Additional Images - Full Width Below - only show in view mode */}
          {mode === 'view' && data.additional_images && data.additional_images.length > 0 && (
            <div className={styles.additionalImagesSection}>
              <h4 className={styles.sectionTitle}>Additional Images</h4>
              <div className={styles.additionalImagesGrid}>
                {data.additional_images.map((imagePath, index) => (
                  <div key={index} className={styles.additionalImageContainer}>
                    <Image
                      src={getProgramImageUrl(imagePath, 'additional')}
                      alt={`Additional ${index + 1}`}
                      className={styles.additionalImage}
                      width={200}
                      height={150}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.closeModalButton}>
            Close
          </button>
          
          {/* Collaboration mode action buttons */}
          {mode === 'collaboration' && (data.status === 'pending' || data.status === '' || !data.status) && data.request_type === 'received' && (
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

      {/* Decline Confirmation Modal - only show in collaboration mode */}
      {mode === 'collaboration' && (
        <ConfirmationModal
          isOpen={showDeclineModal}
          itemName={data.program_title}
          itemType="collaboration invite"
          actionType="decline"
          onConfirm={handleDeclineConfirm}
          onCancel={handleDeclineCancel}
          isDeleting={isProcessing}
          customMessage="Are you sure you want to decline this collaboration invite?"
        />
      )}
    </div>
  );
};

export default ViewDetailsModal;
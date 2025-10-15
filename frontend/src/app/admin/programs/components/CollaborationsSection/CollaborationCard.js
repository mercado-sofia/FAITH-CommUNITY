'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FaEdit, FaTag, FaCalendar, FaEllipsisH, FaExclamationTriangle, FaSignOutAlt, FaUsers, FaCheck, FaTimes, FaClock, FaCrown } from 'react-icons/fa';
import { TbListDetails } from 'react-icons/tb';
import { FiTrash2 } from 'react-icons/fi';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import { formatDateShort, formatProgramDates } from '@/utils/dateUtils';
import { getStatusColor, getStatusDisplayText, getEffectiveStatus } from '@/utils/collaborationStatusUtils';
import { optOutCollaboration } from '../../services/collaborationService';
import { SuccessModal } from '@/components';
import styles from './CollaborationCard.module.css';

export function CollaborationCard({ collaboration, onViewDetails, onEdit, onDelete, onViewVolunteers, onOptOut }) {
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOptingOut, setIsOptingOut] = useState(false);
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const dropdownRef = useRef(null);

  // Safety check for collaboration data
  if (!collaboration) {
    return null;
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };


  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };


  const handleOptOutClick = () => {
    setShowDropdown(false);
    setShowOptOutModal(true);
  };

  const confirmOptOut = async () => {
    setIsOptingOut(true);
    try {
      // Use the collaboration_id from the collaboration data
      if (collaboration.collaboration_id) {
        await optOutCollaboration(collaboration.collaboration_id);
        
        // Show success modal
        setSuccessModal({
          isVisible: true,
          message: `You have successfully opted out of "${collaboration.program_title}". The program will no longer appear in your programs list.`,
          type: 'success'
        });
        
        // Close the opt-out confirmation modal
        setShowOptOutModal(false);
        
        // Refresh the programs list after a short delay
        if (onOptOut) {
          setTimeout(() => {
            onOptOut();
          }, 2000); // Wait 2 seconds to let user see the success message
        }
      }
    } catch (error) {
      // Show error modal
      setSuccessModal({
        isVisible: true,
        message: `Failed to opt out of "${collaboration.program_title}". Please try again.`,
        type: 'error'
      });
      
      setShowOptOutModal(false);
    } finally {
      setIsOptingOut(false);
    }
  };

  const cancelOptOut = () => {
    setShowOptOutModal(false);
  };

  // Calculate the effective status for display
  const effectiveStatus = getEffectiveStatus(collaboration.status, collaboration.program_status);

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
      case 'rejected':
        return <FaTimes />;
      default:
        return <FaClock />;
    }
  };

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

  const getRoleBadge = () => {
    const isCreator = collaboration.request_type === 'sent';
    return {
      icon: isCreator ? <FaCrown /> : <FaUsers />,
      text: isCreator ? 'Creator' : 'Collaborator',
      className: isCreator ? styles.creatorBadge : styles.collaboratorBadge
    };
  };

  const roleBadge = getRoleBadge();

  return (
    <div className={styles.card}>
      {/* Program Image */}
      {collaboration.program_image ? (
        <div className={styles.imageContainer}>
          {getProgramImageUrl(collaboration.program_image) === 'IMAGE_UNAVAILABLE' ? (
            <div className={styles.imagePlaceholder}>
              <FaExclamationTriangle className={styles.placeholderIcon} />
              <span>Image unavailable</span>
            </div>
          ) : (
            <Image
              src={getProgramImageUrl(collaboration.program_image)}
              alt={collaboration.program_title}
              className={styles.programImage}
              width={400}
              height={220}
              style={{ objectFit: 'cover' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          )}
          <div className={styles.imagePlaceholder} style={{ display: 'none' }}>
            <FaExclamationTriangle className={styles.placeholderIcon} />
            <span>Image unavailable</span>
          </div>
          
          {/* Three dots menu */}
          <div className={styles.imageMenuContainer} ref={dropdownRef}>
            <button
              className={styles.imageMenuButton}
              onClick={toggleDropdown}
              title="More options"
            >
              <FaEllipsisH />
            </button>
            
              {showDropdown && (
                <div className={styles.imageDropdown}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setShowDropdown(false);
                      onViewDetails();
                    }}
                  >
                    <TbListDetails /> View Details
                  </button>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setShowDropdown(false);
                      onViewVolunteers();
                    }}
                  >
                    <FaUsers /> View Volunteers
                  </button>
                  {/* Show different actions based on user role */}
                  {collaboration.request_type === 'sent' ? (
                    <>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setShowDropdown(false);
                          onEdit();
                        }}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setShowDropdown(false);
                          handleDelete();
                        }}
                        disabled={isDeleting}
                      >
                        <FiTrash2 /> {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.dropdownItem}
                      onClick={handleOptOutClick}
                      disabled={isOptingOut}
                    >
                      <FaSignOutAlt /> {isOptingOut ? 'Opting Out...' : 'Opt Out'}
                    </button>
                  )}
                </div>
              )}
          </div>
        </div>
      ) : (
        <div className={styles.imageContainer}>
          <div className={styles.imagePlaceholder}>
            <FaTag className={styles.placeholderIcon} />
            <span>No Image</span>
          </div>
          
          {/* Three dots menu for no image case */}
          <div className={styles.imageMenuContainer} ref={dropdownRef}>
            <button
              className={styles.imageMenuButton}
              onClick={toggleDropdown}
              title="More options"
            >
              <FaEllipsisH />
            </button>
            
              {showDropdown && (
                <div className={styles.imageDropdown}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setShowDropdown(false);
                      onViewDetails();
                    }}
                  >
                    <TbListDetails /> View Details
                  </button>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setShowDropdown(false);
                      onViewVolunteers();
                    }}
                  >
                    <FaUsers /> View Volunteers
                  </button>
                  {/* Show different actions based on user role */}
                  {collaboration.request_type === 'sent' ? (
                    <>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setShowDropdown(false);
                          onEdit();
                        }}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setShowDropdown(false);
                          handleDelete();
                        }}
                        disabled={isDeleting}
                      >
                        <FiTrash2 /> {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.dropdownItem}
                      onClick={handleOptOutClick}
                      disabled={isOptingOut}
                    >
                      <FaSignOutAlt /> {isOptingOut ? 'Opting Out...' : 'Opt Out'}
                    </button>
                  )}
                </div>
              )}
          </div>
        </div>
      )}

      {/* Program Content */}
      <div className={styles.programContent}>
        <div className={styles.programHeader}>
          <div className={styles.titleRow}>
            <h3 className={styles.programTitle}>{collaboration.program_title}</h3>
            <div className={`${styles.roleBadge} ${roleBadge.className}`}>
              {roleBadge.icon}
              <span className={styles.badgeText}>{roleBadge.text}</span>
            </div>
          </div>
        </div>

        <p className={styles.programDescription}>
          {collaboration.program_description || 'No description provided'}
        </p>

        {/* Program Status Badge */}
        <div className={`${styles.statusBadge} ${styles[effectiveStatus]}`}>
          {getStatusIcon(effectiveStatus)}
          <span>{getStatusDisplayText(effectiveStatus)}</span>
        </div>

        {/* Program Meta Information */}
        <div className={styles.programMeta}>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <FaTag className={styles.metaIcon} />
              <span className={styles.metaText}>
                {getCategoryLabel(collaboration.program_category)}
              </span>
            </div>

            <div className={styles.metaItem}>
              <FaCalendar className={styles.metaIcon} />
              <span className={styles.metaText}>
                {formatProgramDates(collaboration)}
              </span>
            </div>
          </div>

          {collaboration.invited_at && (
            <div className={styles.metaItem}>
              <FaCalendar className={styles.metaIcon} />
              <span className={styles.metaText}>
                Created: {formatDateShort(collaboration.invited_at)}
              </span>
            </div>
          )}
        </div>

      </div>


      {/* Opt Out Confirmation Modal */}
      {showOptOutModal && (
        <div className={styles.modalOverlay} onClick={cancelOptOut}>
          <div className={`${styles.modalContent} ${styles.optOutModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Opt Out of Collaboration</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to opt out of collaborating on &quot;{collaboration.program_title}&quot;?</p>
              <p className={styles.warningText}>This action cannot be undone. You will no longer have access to this program.</p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={cancelOptOut}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={confirmOptOut}
                className={styles.confirmButton}
                disabled={isOptingOut}
              >
                {isOptingOut ? 'Opting Out...' : 'Opt Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Modal */}
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={() => setSuccessModal({ isVisible: false, message: '', type: 'success' })}
        type={successModal.type}
        autoHideDuration={successModal.type === 'success' ? 3000 : 0}
      />
    </div>
  );
}

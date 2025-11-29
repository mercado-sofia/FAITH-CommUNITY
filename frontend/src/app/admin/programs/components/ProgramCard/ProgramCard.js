'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FaEdit, FaTag, FaEllipsisH, FaExclamationTriangle, FaSignOutAlt, FaUsers } from 'react-icons/fa';
import { FiCalendar } from 'react-icons/fi';
import { TbListDetails } from 'react-icons/tb';
import { FiTrash2, FiArchive } from 'react-icons/fi';
import { getProgramImageUrl } from '@/utils/shared/uploadPaths';
import { formatProgramDates, formatProgramDatesForCard, formatDateShort } from '@/utils/shared/dateUtils';
import { getProgramStatusByDates } from '@/utils/shared/programStatusUtils';
import DOMPurify from 'dompurify';
import CollaborationBadge from '../CollaborationBadge/CollaborationBadge';
import ProgramActions from './ProgramActions';
import ProgramModals from './ProgramModals';
import { useProgramActions } from '@/hooks/admin/useProgramActions';
import styles from './ProgramCard.module.css';

const ProgramCard = ({ program, onEdit, onDelete, onViewDetails, onMarkCompleted, onMarkActive, onOptOut, onShowSuccessModal, onToggleVolunteerAcceptance, onAcceptCollaboration, onDeclineCollaboration, onArchive, onUnarchive, isCollaborationCard = false }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Normalize data structure for both program and collaboration objects
  const normalizedData = isCollaborationCard ? {
    id: program.program_id,
    title: program.program_title,
    description: program.program_description,
    category: program.program_category,
    image: program.program_image,
    event_start_date: program.event_start_date,
    event_end_date: program.event_end_date,
    created_at: program.invited_at,
    user_role: program.request_type === 'sent' ? 'creator' : 'collaborator',
    collaboration_id: program.collaboration_id,
    status: program.status,
    program_status: program.program_status,
    is_collaborative: true,
    accepts_volunteers: program.accepts_volunteers !== undefined ? program.accepts_volunteers : true,
    // Map all_collaborators to collaborators array for the badge
    collaborators: program.all_collaborators ? program.all_collaborators.map(collab => ({
      id: collab.invitee_id,
      status: collab.status,
      email: collab.invitee_email,
      organization_name: collab.invitee_org_name,
      organization_acronym: collab.invitee_org_acronym
    })) : []
  } : program;

  // Use the program actions hook
  const actions = useProgramActions({
    normalizedData,
    onEdit,
    onDelete,
    onMarkCompleted,
    onMarkActive,
    onOptOut,
    onShowSuccessModal,
    onToggleVolunteerAcceptance,
    onAcceptCollaboration,
    onDeclineCollaboration,
    onArchive,
    onUnarchive,
    isCollaborationCard
  });



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

  // Using centralized date utilities - formatProgramDates is now imported

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

  // For collaboration cards, we need to handle status differently
  const getDisplayStatus = () => {
    if (isCollaborationCard) {
      // For collaboration cards, use the collaboration status directly
      return normalizedData.status || 'pending';
    } else {
      // For regular program cards, use getProgramStatusByDates to respect manual_status_override
      // This ensures consistency across all portals (Public, Admin, Superadmin)
      return getProgramStatusByDates(normalizedData);
    }
  };

  return (
    <div className={styles.programCard}>
      {/* Program Image */}
      {normalizedData.image ? (
        <div className={styles.imageContainer}>
          {getProgramImageUrl(normalizedData.image) === 'IMAGE_UNAVAILABLE' ? (
            <div className={styles.imagePlaceholder}>
              <FaExclamationTriangle className={styles.placeholderIcon} />
              <span>Image unavailable</span>
            </div>
          ) : (
            <Image
              src={getProgramImageUrl(normalizedData.image)}
              alt={normalizedData.title}
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
                  {/* Show different actions based on user role */}
                  {normalizedData.user_role === 'creator' ? (
                    <>
                      {/* Only show volunteer acceptance functions for upcoming programs */}
                      {getDisplayStatus() === 'Upcoming' && (
                        normalizedData.accepts_volunteers ? (
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              setShowDropdown(false);
                              actions.handleVolunteerAcceptanceClick(false);
                            }}
                          >
                            <FaUsers /> Close Volunteers
                          </button>
                        ) : (
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              setShowDropdown(false);
                              actions.handleVolunteerAcceptanceClick(true);
                            }}
                          >
                            <FaUsers /> Accept Volunteers
                          </button>
                        )
                      )}
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setShowDropdown(false);
                          onEdit();
                        }}
                      >
                        <FaEdit /> Edit
                      </button>
                      {/* Show Archive or Unarchive based on program status */}
                      {getDisplayStatus() === 'archived' ? (
                        <button
                          className={styles.dropdownItem}
                          onClick={() => {
                            setShowDropdown(false);
                            actions.handleUnarchiveClick();
                          }}
                          disabled={actions.isArchiving}
                        >
                          <FiArchive /> {actions.isArchiving ? 'Unarchiving...' : 'Unarchive'}
                        </button>
                      ) : (
                        <button
                          className={styles.dropdownItem}
                          onClick={() => {
                            setShowDropdown(false);
                            actions.handleArchiveClick();
                          }}
                          disabled={actions.isArchiving}
                        >
                          <FiArchive /> {actions.isArchiving ? 'Archiving...' : 'Archive'}
                        </button>
                      )}
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setShowDropdown(false);
                          actions.handleDelete();
                        }}
                        disabled={actions.isDeleting}
                      >
                        <FiTrash2 /> {actions.isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.dropdownItem}
                      onClick={() => {
                        setShowDropdown(false);
                        actions.handleOptOutClick();
                      }}
                      disabled={actions.isOptingOut}
                    >
                      <FaSignOutAlt /> {actions.isOptingOut ? 'Opting Out...' : 'Opt Out'}
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
                  {/* Show different actions based on user role */}
                  {normalizedData.user_role === 'creator' ? (
                    <>
                      {/* Only show volunteer acceptance functions for upcoming programs */}
                      {getDisplayStatus() === 'Upcoming' && (
                        normalizedData.accepts_volunteers ? (
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              setShowDropdown(false);
                              actions.handleVolunteerAcceptanceClick(false);
                            }}
                          >
                            <FaUsers /> Close Volunteers
                          </button>
                        ) : (
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              setShowDropdown(false);
                              actions.handleVolunteerAcceptanceClick(true);
                            }}
                          >
                            <FaUsers /> Accept Volunteers
                          </button>
                        )
                      )}
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setShowDropdown(false);
                          onEdit();
                        }}
                      >
                        <FaEdit /> Edit
                      </button>
                      {/* Show Archive or Unarchive based on program status */}
                      {getDisplayStatus() === 'archived' ? (
                        <button
                          className={styles.dropdownItem}
                          onClick={() => {
                            setShowDropdown(false);
                            actions.handleUnarchiveClick();
                          }}
                          disabled={actions.isArchiving}
                        >
                          <FiArchive /> {actions.isArchiving ? 'Unarchiving...' : 'Unarchive'}
                        </button>
                      ) : (
                        <button
                          className={styles.dropdownItem}
                          onClick={() => {
                            setShowDropdown(false);
                            actions.handleArchiveClick();
                          }}
                          disabled={actions.isArchiving}
                        >
                          <FiArchive /> {actions.isArchiving ? 'Archiving...' : 'Archive'}
                        </button>
                      )}
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setShowDropdown(false);
                          actions.handleDelete();
                        }}
                        disabled={actions.isDeleting}
                      >
                        <FiTrash2 /> {actions.isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.dropdownItem}
                      onClick={() => {
                        setShowDropdown(false);
                        actions.handleOptOutClick();
                      }}
                      disabled={actions.isOptingOut}
                    >
                      <FaSignOutAlt /> {actions.isOptingOut ? 'Opting Out...' : 'Opt Out'}
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
            <h3 className={styles.programTitle}>{normalizedData.title}</h3>
            <CollaborationBadge 
              program={normalizedData}
              userRole={normalizedData.user_role}
              isCollaborative={normalizedData.is_collaborative}
              collaboratorCount={normalizedData.collaborators?.length || 0}
            />
          </div>
        </div>

        <p className={styles.programDescription}>
          {(() => {
            if (!normalizedData.description) return 'No description provided';
            // Strip HTML tags for card preview
            if (typeof document !== 'undefined') {
              const textContent = document.createElement('div');
              textContent.innerHTML = DOMPurify.sanitize(normalizedData.description);
              return (textContent.textContent || textContent.innerText || '').trim();
            }
            return normalizedData.description;
          })()}
        </p>

        {/* Program Status Badge */}
        {(() => {
          const displayStatus = getDisplayStatus();
          return (
            <div className={`${styles.statusBadge} ${styles[displayStatus]}`}>
              {(() => {
                // For collaboration cards, show collaboration status
                if (isCollaborationCard) {
                  const collaborationStatus = normalizedData.status || 'pending';
                  switch (collaborationStatus) {
                    case 'accepted':
                      return 'Collaborators Accepted';
                    case 'declined':
                      return 'Collaboration Declined';
                    case 'approved':
                      return 'Approved';
                    case 'rejected':
                      return 'Rejected';
                    case 'pending':
                      return 'Pending Response';
                    default:
                      return collaborationStatus.charAt(0).toUpperCase() + collaborationStatus.slice(1);
                  }
                }
                // For regular program cards, show program_projects.status
                const baseText = displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);
                return baseText;
              })()}
            </div>
          );
        })()}

        {/* Program Meta Information */}
        <div className={styles.programMeta}>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <FaTag className={styles.metaIcon} />
              <span className={styles.metaText}>
                {getCategoryLabel(normalizedData.category)}
              </span>
            </div>

            <div className={styles.metaItem}>
              <FiCalendar className={styles.metaIcon} />
              <span className={styles.metaText}>
                {formatProgramDatesForCard(normalizedData)}
              </span>
            </div>
          </div>

          {normalizedData.created_at && (
            <div className={styles.metaItem}>
              <FiCalendar className={styles.metaIcon} />
              <span className={styles.metaText}>
                Created: {formatDateShort(normalizedData.created_at)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <ProgramActions
          normalizedData={normalizedData}
          isCollaborationCard={isCollaborationCard}
          actions={actions}
        />
      </div>

      {/* All Confirmation Modals */}
      <ProgramModals
        normalizedData={normalizedData}
        actions={actions}
      />

    </div>
  );
};

export default ProgramCard;
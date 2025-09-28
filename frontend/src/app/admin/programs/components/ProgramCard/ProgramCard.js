'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FaEdit, FaTag, FaCalendar, FaEllipsisH, FaExclamationTriangle, FaSignOutAlt } from 'react-icons/fa';
import { TbListDetails } from 'react-icons/tb';
import { LuSquareCheckBig } from 'react-icons/lu';
import { MdOutlineRadioButtonChecked } from 'react-icons/md';
import { FiTrash2 } from 'react-icons/fi';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import { formatProgramDates, formatDateShort } from '@/utils/dateUtils.js';
import CollaborationBadge from '../Collaboration/CollaborationBadge';
import { optOutCollaboration } from '../../services/collaborationService';
import SuccessModal from '@/components/ui/SuccessModal';
import styles from './ProgramCard.module.css';

const ProgramCard = ({ program, onEdit, onDelete, onViewDetails, onMarkCompleted, onMarkActive, onOptOut }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOptingOut, setIsOptingOut] = useState(false);
  const [showMarkCompletedModal, setShowMarkCompletedModal] = useState(false);
  const [showMarkActiveModal, setShowMarkActiveModal] = useState(false);
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  const dropdownRef = useRef(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmMarkCompleted = async () => {
    try {
      await onMarkCompleted();
      setShowMarkCompletedModal(false);
    } catch (error) {
      console.error('Error marking program as completed:', error);
    }
  };

  const cancelMarkCompleted = () => {
    setShowMarkCompletedModal(false);
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

  const handleMarkCompletedClick = () => {
    setShowDropdown(false);
    setShowMarkCompletedModal(true);
  };

  const handleMarkActiveClick = () => {
    setShowDropdown(false);
    setShowMarkActiveModal(true);
  };

  const confirmMarkActive = async () => {
    try {
      await onMarkActive();
      setShowMarkActiveModal(false);
    } catch (error) {
      console.error('Error marking program as active:', error);
    }
  };

  const cancelMarkActive = () => {
    setShowMarkActiveModal(false);
  };

  const handleOptOutClick = () => {
    setShowDropdown(false);
    setShowOptOutModal(true);
  };

  const confirmOptOut = async () => {
    setIsOptingOut(true);
    try {
      // Use the collaboration_id from the program data
      if (program.collaboration_id) {
        await optOutCollaboration(program.collaboration_id);
        
        // Show success modal
        setSuccessModal({
          isVisible: true,
          message: `You have successfully opted out of "${program.title}". The program will no longer appear in your programs list.`,
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
      console.error('Error opting out of collaboration:', error);
      
      // Show error modal
      setSuccessModal({
        isVisible: true,
        message: `Failed to opt out of "${program.title}". Please try again.`,
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

  return (
    <div className={styles.programCard}>
      {/* Program Image */}
      {program.image ? (
        <div className={styles.imageContainer}>
          {getProgramImageUrl(program.image) === 'IMAGE_UNAVAILABLE' ? (
            <div className={styles.imagePlaceholder}>
              <FaExclamationTriangle className={styles.placeholderIcon} />
              <span>Image unavailable</span>
            </div>
          ) : (
            <Image
              src={getProgramImageUrl(program.image)}
              alt={program.title}
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
                  {program.user_role === 'creator' ? (
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
                  {/* Show different actions based on user role */}
                  {program.user_role === 'creator' ? (
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
            <h3 className={styles.programTitle}>{program.title}</h3>
            <CollaborationBadge 
              program={program}
              userRole={program.user_role}
              isCollaborative={program.is_collaborative}
              collaboratorCount={program.collaborators?.length || 0}
            />
          </div>
        </div>

        <p className={styles.programDescription}>
          {program.description || 'No description provided'}
        </p>

        {/* Program Status Badge */}
        {program.status && (
          <div className={`${styles.statusBadge} ${styles[program.status]}`}>
            {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
          </div>
        )}

        {/* Program Meta Information */}
        <div className={styles.programMeta}>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <FaTag className={styles.metaIcon} />
              <span className={styles.metaText}>
                {getCategoryLabel(program.category)}
              </span>
            </div>

            <div className={styles.metaItem}>
              <FaCalendar className={styles.metaIcon} />
              <span className={styles.metaText}>
                {formatProgramDates(program)}
              </span>
            </div>
          </div>

          {program.created_at && (
            <div className={styles.metaItem}>
              <FaCalendar className={styles.metaIcon} />
              <span className={styles.metaText}>
                Created: {formatDateShort(program.created_at)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons - Only show for creators */}
        {program.user_role === 'creator' && (
          <div className={styles.actionButtons}>
             {program.status !== 'Active' && (
               <button
                 onClick={handleMarkActiveClick}
                 className={styles.markActiveButton}
                 disabled={isDeleting}
                 title="Mark program as active"
               >
                 <MdOutlineRadioButtonChecked /> Mark Active
               </button>
             )}
             
             {program.status !== 'Completed' && (
               <button
                 onClick={handleMarkCompletedClick}
                 className={styles.markCompletedButton}
                 disabled={isDeleting}
                 title="Mark program as completed"
               >
                 <LuSquareCheckBig /> Mark Complete
               </button>
             )}
          </div>
        )}
      </div>

      {/* Mark as Completed Confirmation Modal */}
      {showMarkCompletedModal && (
        <div className={styles.modalOverlay} onClick={cancelMarkCompleted}>
          <div className={`${styles.modalContent} ${styles.markCompletedModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Mark as Completed</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to mark &quot;{program.title}&quot; as completed?</p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={cancelMarkCompleted}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkCompleted}
                className={styles.confirmButton}
              >
                Mark as Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Active Confirmation Modal */}
      {showMarkActiveModal && (
        <div className={styles.modalOverlay} onClick={cancelMarkActive}>
          <div className={`${styles.modalContent} ${styles.markActiveModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Mark as Active</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to mark &quot;{program.title}&quot; as active?</p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={cancelMarkActive}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkActive}
                className={styles.confirmButton}
              >
                Mark as Active
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opt Out Confirmation Modal */}
      {showOptOutModal && (
        <div className={styles.modalOverlay} onClick={cancelOptOut}>
          <div className={`${styles.modalContent} ${styles.optOutModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Opt Out of Collaboration</h3>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to opt out of collaborating on &quot;{program.title}&quot;?</p>
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
};

export default ProgramCard;

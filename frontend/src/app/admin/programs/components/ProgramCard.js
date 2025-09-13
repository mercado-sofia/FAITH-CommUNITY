'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FaEdit, FaTag, FaCalendar, FaEllipsisH } from 'react-icons/fa';
import { TbListDetails } from 'react-icons/tb';
import { LuSquareCheckBig } from 'react-icons/lu';
import { MdOutlineRadioButtonChecked } from 'react-icons/md';
import { FiTrash2 } from 'react-icons/fi';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import styles from './styles/ProgramCard.module.css';

const ProgramCard = ({ program, onEdit, onDelete, onViewDetails, onMarkCompleted, onMarkActive }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMarkCompletedModal, setShowMarkCompletedModal] = useState(false);
  const [showMarkActiveModal, setShowMarkActiveModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkCompleted = () => {
    setShowMarkCompletedModal(true);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatProgramDates = (program) => {
    if (program.multiple_dates && Array.isArray(program.multiple_dates) && program.multiple_dates.length > 0) {
      if (program.multiple_dates.length === 1) {
        return formatDate(program.multiple_dates[0]);
      } else if (program.multiple_dates.length === 2) {
        return `${formatDate(program.multiple_dates[0])} & ${formatDate(program.multiple_dates[1])}`;
      } else {
        return `${formatDate(program.multiple_dates[0])} +${program.multiple_dates.length - 1} more`;
      }
    } else if (program.event_start_date && program.event_end_date) {
      const startDate = new Date(program.event_start_date);
      const endDate = new Date(program.event_end_date);
      
      if (startDate.getTime() === endDate.getTime()) {
        return formatDate(program.event_start_date);
      } else {
        return `${formatDate(program.event_start_date)} - ${formatDate(program.event_end_date)}`;
      }
    }
    return 'Not specified';
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

  return (
    <div className={styles.programCard}>
      {/* Program Image */}
      {program.image ? (
        <div className={styles.imageContainer}>
          <Image
            src={getProgramImageUrl(program.image) || '/default-profile.png'}
            alt={program.title}
            className={styles.programImage}
            width={400}
            height={220}
            style={{ objectFit: 'cover' }}
            onError={(e) => {
              console.error('Image failed to load:', e.target.src);
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className={styles.imagePlaceholder} style={{ display: 'none' }}>
            <FaTag className={styles.placeholderIcon} />
            <span>Image Failed to Load</span>
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
                </div>
              )}
          </div>
        </div>
      )}

      {/* Program Content */}
      <div className={styles.programContent}>
        <div className={styles.programHeader}>
          <h3 className={styles.programTitle}>{program.title}</h3>
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
                Created: {formatDate(program.created_at)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
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
    </div>
  );
};

export default ProgramCard;

'use client';

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react';
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { FiEye } from 'react-icons/fi';
import { CgOptions } from "react-icons/cg";
import { FaUser } from "react-icons/fa";
import Image from "next/image";
import styles from './styles/RecentTables.module.css';

// Avatar component for volunteers
const VolunteerAvatar = ({ volunteer, size = 32 }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!volunteer.profile_photo_url || imageError) {
    return (
      <div 
        className={styles.avatarFallback}
        style={{ width: size, height: size }}
      >
        <FaUser size={size * 0.4} />
      </div>
    );
  }

  return (
    <div className={styles.avatarContainer} style={{ width: size, height: size }}>
      <Image
        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${volunteer.profile_photo_url}`}
        alt={`${volunteer.name}'s profile`}
        width={size}
        height={size}
        className={styles.avatarImage}
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default function RecentApplicationsTable({ volunteers = [], onStatusUpdate, onSoftDelete, isLoading = false }) {
  const [filter, setFilter] = useState('All');
  const [showOptions, setShowOptions] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [showDropdown, setShowDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const dropdownRefs = useRef({});

  // Check if action handlers are provided (for dashboard vs volunteers page)
  const hasActionHandlers = onStatusUpdate && onSoftDelete;

  const handleFilterChange = (status) => {
    setFilter(status);
    setShowOptions(false);
  };

  const handleAction = (volunteer, action) => {
    if (!hasActionHandlers) return; // Don't allow actions if no handlers provided
    
    setSelectedVolunteer(volunteer);
    setModalType(action);
    setShowDropdown(null);
  };

  const handleConfirmAction = () => {
    if (selectedVolunteer && modalType && onStatusUpdate) {
      const newStatus = modalType === "approve" ? "Approved" : "Declined";
      onStatusUpdate(selectedVolunteer.id, newStatus);
    }
    closeModal();
  };

  const closeModal = () => {
    setSelectedVolunteer(null);
    setModalType(null);
  };

  const handleDropdownToggle = (volunteerId) => {
    if (showDropdown === volunteerId) return setShowDropdown(null);
    setShowDropdown(volunteerId);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
      }
      
      if (showDropdown !== null) {
        const dropdownWrapper = dropdownRefs.current[showDropdown];
        if (dropdownWrapper && !dropdownWrapper.contains(event.target)) {
          setShowDropdown(null);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const filteredList =
    filter === 'All'
      ? volunteers
      : volunteers.filter((volunteer) => volunteer.status === filter);

  const sortedList = [...filteredList].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const displayList = sortedList.slice(0, 5);

  // Show loading state
  if (isLoading) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Applications</h2>
            <div className={styles.buttonGroup}>
              <div className={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  className={styles.iconButton}
                  disabled
                >
                  <CgOptions className={styles.icon} />
                  Filter
                </button>
              </div>
              <Link href="/admin/volunteers" className={styles.iconButton}>
                <FiEye className={styles.icon} />
                View All
              </Link>
            </div>
          </div>
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '135px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Name</th>
                <th>Program</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((index) => (
                <tr key={index}>
                  <td>
                    <div className={styles.skeletonText} style={{ width: '80%' }}></div>
                  </td>
                  <td>
                    <div className={styles.skeletonText} style={{ width: '90%' }}></div>
                  </td>
                  <td>
                    <div className={styles.skeletonText} style={{ width: '70%' }}></div>
                  </td>
                  <td>
                    <div className={styles.skeletonBadge}></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Show empty state if no volunteers
  if (!volunteers || volunteers.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Applications</h2>
            <div className={styles.buttonGroup}>
              <div className={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  className={styles.iconButton}
                  disabled
                >
                  <CgOptions className={styles.icon} />
                  Filter
                </button>
              </div>
              <Link href="/admin/volunteers" className={styles.iconButton}>
                <FiEye className={styles.icon} />
                View All
              </Link>
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem', fontSize: '13px', color: '#666', fontFamily: 'var(--font-inter)' }}>
            <p>No applications found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Applications</h2>
            <div className={styles.buttonGroup}>
              <div className={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  className={styles.iconButton}
                  onClick={() => setShowOptions((prev) => !prev)}
                >
                  <CgOptions className={styles.icon} />
                  Filter
                </button>
                {showOptions && (
                  <ul className={styles.dropdownMenu}>
                    {['All', 'Pending', 'Approved', 'Declined'].map((status) => (
                      <li
                        key={status}
                        className={`${styles.dropdownItem} ${
                          filter === status ? styles.active : ''
                        }`}
                        onClick={() => handleFilterChange(status)}
                      >
                        {status}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Link href="/admin/volunteers" className={styles.iconButton}>
                <FiEye className={styles.icon} />
                View All
              </Link>
            </div>
          </div>

          <table className={styles.table}>
            <colgroup>
              <col style={{ width: '240px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '135px' }} />
              <col style={{ width: '100px' }} />
              {hasActionHandlers && <col style={{ width: '50px' }} />}
            </colgroup>
            <thead>
              <tr>
                <th>Volunteer</th>
                <th>Program</th>
                <th>Date</th>
                <th>Status</th>
                {hasActionHandlers && <th></th>}
              </tr>
            </thead>
            <tbody>
              {displayList.map((volunteer) => (
                <tr key={volunteer.id}>
                  <td className={styles.volunteerCell}>
                    <div className={styles.volunteerInfo}>
                      <VolunteerAvatar volunteer={volunteer} size={32} />
                      <span className={styles.volunteerName}>{volunteer.name}</span>
                    </div>
                  </td>
                  <td className={styles.truncate}>{volunteer.program}</td>
                  <td>{volunteer.date}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        volunteer.status === 'Pending'
                          ? styles.pending
                          : volunteer.status === 'Approved'
                          ? styles.approved
                          : styles.declined
                      }`}
                    >
                      {volunteer.status}
                    </span>
                  </td>
                  {hasActionHandlers && (
                    <td>
                      <div
                        className={styles.dropdownWrapper}
                        ref={(el) => (dropdownRefs.current[volunteer.id] = el)}
                      >
                        <div className={styles.actionDropdown}>
                          <div
                            className={styles.actionButton}
                            onClick={() => handleDropdownToggle(volunteer.id)}
                          >
                            <HiOutlineDotsHorizontal className={styles.actionIcon} />
                          </div>

                          {showDropdown === volunteer.id && (
                            <ul className={styles.actionMenu}>
                              {volunteer.status !== "Approved" && (
                                <li onClick={() => handleAction(volunteer, "approve")}>
                                  Approve
                                </li>
                              )}
                              {volunteer.status !== "Declined" && (
                                <li onClick={() => handleAction(volunteer, "reject")}>
                                  Decline
                                </li>
                              )}
                              <li 
                                onClick={() => onSoftDelete && onSoftDelete(volunteer.id, volunteer.name)}
                                style={{ color: '#dc3545', borderTop: '1px solid #eee', marginTop: '4px', paddingTop: '4px' }}
                              >
                                Delete
                              </li>
                            </ul>
                          )}
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {displayList.length === 0 && (
                <tr>
                  <td colSpan={hasActionHandlers ? 5 : 4} style={{ textAlign: 'center', padding: '1rem' }}>
                    No {filter.toLowerCase()} applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasActionHandlers && (modalType === "approve" || modalType === "reject") && selectedVolunteer && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h2>{modalType === "approve" ? "Approve" : "Reject"} Application</h2>
            <p>
              Are you sure you want to {modalType} <strong>{selectedVolunteer.name}</strong>&apos;s application?
            </p>
            <div className={styles.confirmActions}>
              <button onClick={closeModal}>Cancel</button>
              <button 
                onClick={handleConfirmAction}
                className={modalType === 'approve' ? '' : styles.declineButton}
              >
                Yes, {modalType === 'approve' ? 'Approve' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
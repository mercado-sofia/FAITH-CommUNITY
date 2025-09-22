// VolunteerTable.js
"use client"

import { useState, useRef, useEffect } from "react"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { IoCloseOutline } from "react-icons/io5";
import { FiTrash2, FiX } from "react-icons/fi";
import { FaUser } from "react-icons/fa";
import Image from "next/image";
import PaginationControls from "../../components/PaginationControls"
import ViewDetailsModal from "./ViewDetailsModal"
import styles from "./styles/VolunteerTable.module.css"

// Security utilities
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').substring(0, 200); // Basic XSS protection + length limit
};

const validateVolunteerData = (volunteer) => {
  if (!volunteer || typeof volunteer !== 'object') return false;
  if (!volunteer.id || !volunteer.name) return false;
  return true;
};

// Avatar component for volunteers
const VolunteerAvatar = ({ volunteer, size = 40 }) => {
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

export default function VolunteerTable({ volunteers, onStatusUpdate, onSoftDelete, onBulkDelete, itemsPerPage = 10 }) {
  const [selectedVolunteer, setSelectedVolunteer] = useState(null)
  const [showDropdown, setShowDropdown] = useState(null)
  const [modalType, setModalType] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [dropdownPosition, setDropdownPosition] = useState({})
  const [selectedVolunteers, setSelectedVolunteers] = useState([])
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState(null)


  // itemsPerPage is now passed as a prop with default value of 10
  const dropdownRefs = useRef({})

  // Reset to page 1 when volunteers data changes or when current page exceeds total pages
  useEffect(() => {
    const totalPages = Math.ceil(volunteers.length / itemsPerPage)
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [volunteers.length, currentPage, itemsPerPage])

  // Reset to page 1 when itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  // Reset selections when navigating to a different page
  useEffect(() => {
    setSelectedVolunteers([])
  }, [currentPage])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown !== null) {
        const dropdownWrapper = dropdownRefs.current[showDropdown]
        if (
          dropdownWrapper &&
          !dropdownWrapper.contains(event.target)
        ) {
          setShowDropdown(null)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showDropdown])

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedVolunteers([])
    } else {
      setSelectedVolunteers(currentVolunteers.map((v) => v.id))
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedVolunteers((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    )
  }

  const handleAction = (volunteer, action) => {
    // Validate volunteer data before processing
    if (!validateVolunteerData(volunteer)) {
      console.error('Invalid volunteer data:', volunteer);
      return;
    }
    
    setSelectedVolunteer(volunteer)
    setModalType(action)
    setShowDropdown(null)
  }

  const handleConfirmAction = () => {
    if (selectedVolunteer && modalType) {
      const newStatus = modalType === "approve" ? "Approved" : "Declined"
      onStatusUpdate(selectedVolunteer.id, newStatus)
    }
    closeModal()
  }

  const closeModal = () => {
    setSelectedVolunteer(null)
    setModalType(null)
  }

  const handleBulkAction = (action) => {
    if (selectedVolunteers.length === 0) return
    setBulkAction(action)
    setShowBulkModal(true)
  }

  const handleBulkDelete = () => {
    if (selectedVolunteers.length === 0) return
    if (onBulkDelete) {
      onBulkDelete(selectedVolunteers)
    }
  }

  const handleConfirmBulkAction = () => {
    if (selectedVolunteers.length === 0 || !bulkAction) return
    
    const newStatus = bulkAction === 'approve' ? 'Approved' : 'Declined'
    
    // Only process volunteers with actionable statuses (exclude Cancelled and Completed)
    const actionableVolunteerIds = actionableSelectedVolunteers.map(volunteer => volunteer.id)
    actionableVolunteerIds.forEach(volunteerId => {
      onStatusUpdate(volunteerId, newStatus)
    })
    
    setSelectedVolunteers([])
    setShowBulkModal(false)
    setBulkAction(null)
  }

  const closeBulkModal = () => {
    setShowBulkModal(false)
    setBulkAction(null)
  }





  const cancelSelection = () => {
    setSelectedVolunteers([])
  }

  const handleDropdownToggle = (volunteerId) => {
    if (showDropdown === volunteerId) return setShowDropdown(null)

    const buttonElement = dropdownRefs.current[volunteerId]
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const dropdownHeight = 120 // Approximate height of dropdown
      
      // Check if there's enough space below
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      
      let top, position
      
      // If not enough space below but enough above, show above
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        position = 'above'
        top = -dropdownHeight - 4 // 4px gap above the button
      } else {
        position = 'below'
        top = rect.height + 4 // 4px gap below the button
      }
      
      setDropdownPosition({ [volunteerId]: { top, position } })
    }

    setShowDropdown(volunteerId)
  }

  const totalPages = Math.ceil(volunteers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, volunteers.length)
  const currentVolunteers = volunteers.slice(startIndex, endIndex)
  const isAllSelected = currentVolunteers.length > 0 && selectedVolunteers.length === currentVolunteers.length

  // Get selected volunteers' data and statuses
  const selectedVolunteersData = volunteers.filter(volunteer => 
    selectedVolunteers.includes(volunteer.id)
  )
  const selectedStatuses = selectedVolunteersData.map(volunteer => volunteer.status)

  // Define statuses that can be approved or declined (exclude Cancelled and Completed)
  const actionableStatuses = ['Pending', 'Approved', 'Declined']
  
  // Filter selected volunteers to only include those with actionable statuses
  const actionableSelectedVolunteers = selectedVolunteersData.filter(volunteer => 
    actionableStatuses.includes(volunteer.status)
  )
  const actionableSelectedStatuses = actionableSelectedVolunteers.map(volunteer => volunteer.status)

  // Smart button state logic - Only disable when action would be meaningless
  const isApproveDisabled = actionableSelectedStatuses.length === 0 || actionableSelectedStatuses.every(status => status === 'Approved')
  const isDeclineDisabled = actionableSelectedStatuses.length === 0 || actionableSelectedStatuses.every(status => status === 'Declined')

  // Count only volunteers that will actually be affected by the action
  const volunteersToApprove = actionableSelectedStatuses.filter(status => status !== 'Approved').length
  const volunteersToDecline = actionableSelectedStatuses.filter(status => status !== 'Declined').length

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedVolunteers.length > 0 && (
        <div className={styles.bulkActionsBar}>
          <div className={styles.bulkActionsLeft}>
            <span className={styles.selectedCount}>
              {selectedVolunteers.length} volunteer{selectedVolunteers.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className={styles.bulkActionsRight}>
            <button 
              className={`${styles.bulkButton} ${styles.approveButton} ${isApproveDisabled ? styles.disabled : ''}`}
              onClick={() => !isApproveDisabled && handleBulkAction('approve')}
              disabled={isApproveDisabled}
              title={isApproveDisabled ? 'Cannot approve: All selected volunteers are already approved' : 'Approve selected volunteers'}
            >
              Approve Selected
            </button>
            <button 
              className={`${styles.bulkButton} ${styles.declineButton} ${isDeclineDisabled ? styles.disabled : ''}`}
              onClick={() => !isDeclineDisabled && handleBulkAction('decline')}
              disabled={isDeclineDisabled}
              title={isDeclineDisabled ? 'Cannot decline: All selected volunteers are already declined' : 'Decline selected volunteers'}
            >
              Decline Selected
            </button>
            <button 
              className={`${styles.bulkButton} ${styles.deleteButton}`}
              onClick={handleBulkDelete}
              title="Delete selected volunteers"
            >
              <FiTrash2 size={16} />
            </button>
            <button 
              className={styles.cancelButton}
              onClick={cancelSelection}
              title="Cancel selection"
            >
              <IoCloseOutline />
            </button>
          </div>
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th>
                <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} />
              </th>
              <th>Volunteer</th>
              <th>Program</th>
              <th>Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {currentVolunteers.length === 0 ? (
              <tr>
                <td colSpan="6" className={styles.noApplicants}>
                  No applicants found
                </td>
              </tr>
            ) : currentVolunteers.map((volunteer) => {
              // Validate volunteer data before rendering
              if (!validateVolunteerData(volunteer)) {
                console.error('Invalid volunteer data:', volunteer);
                return null;
              }

              // Sanitize data for display
              const sanitizedName = sanitizeInput(volunteer.name);
              const sanitizedEmail = sanitizeInput(volunteer.email);
              const sanitizedProgram = sanitizeInput(volunteer.program);
              const sanitizedDate = sanitizeInput(volunteer.date);

              return (
                <tr key={volunteer.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedVolunteers.includes(volunteer.id)}
                      onChange={() => toggleSelectOne(volunteer.id)}
                    />
                  </td>
                  <td className={styles.volunteerInfoCell}>
                    <div className={styles.volunteerInfo}>
                      <VolunteerAvatar volunteer={volunteer} size={40} />
                      <div className={styles.volunteerDetails}>
                        <div className={styles.volunteerName} title={sanitizedName}>
                          {sanitizedName}
                        </div>
                        <div className={styles.volunteerEmail} title={sanitizedEmail}>
                          {sanitizedEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.truncatedText} style={{ color: "#2e3136", fontWeight: "500" }}>
                    {sanitizedProgram}
                  </td>
                  <td style={{ color: "#8a919c", fontWeight: "400" }}>{sanitizedDate}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[volunteer.status.toLowerCase()]}`}>
                      {volunteer.status}
                    </span>
                  </td>
                  <td>
                    <div
                      className={styles.dropdownWrapper}
                      ref={(el) => (dropdownRefs.current[volunteer.id] = el)}
                    >
                      <div className={styles.dropdownButtonWrapper}>
                        <div
                          className={styles.dropdown}
                          onClick={() => handleDropdownToggle(volunteer.id)}
                        >
                          <HiOutlineDotsHorizontal className={styles.icon} />
                        </div>

                        {showDropdown === volunteer.id && (
                          <ul 
                            className={`${styles.options} ${dropdownPosition[volunteer.id]?.position === 'above' ? styles.above : ''}`}
                            style={{
                              top: `${dropdownPosition[volunteer.id]?.top || 0}px`,
                              right: '0px'
                            }}
                          >
                            <li onClick={() => handleAction(volunteer, "view")}>View Details</li>
                            {volunteer.status !== "Approved" && volunteer.status !== "Cancelled" && volunteer.status !== "Completed" && (
                              <li onClick={() => handleAction(volunteer, "approve")}>
                                Approve
                              </li>
                            )}
                            {volunteer.status !== "Declined" && volunteer.status !== "Cancelled" && volunteer.status !== "Completed" && (
                              <li onClick={() => handleAction(volunteer, "decline")}>
                                Decline
                              </li>
                            )}
                            <li 
                              onClick={() => onSoftDelete && onSoftDelete(volunteer.id, sanitizedName)}
                              style={{ color: '#dc3545', borderTop: '1px solid #eee', marginTop: '4px', paddingTop: '4px' }}
                            >
                              Delete
                            </li>
                          </ul>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        startIndex={startIndex}
        endIndex={endIndex}
        totalCount={volunteers.length}
      />

      {modalType === "view" && selectedVolunteer && (
        <ViewDetailsModal
          app={selectedVolunteer}
          onClose={closeModal}
          onUpdate={onStatusUpdate}
        />
      )}

      {(modalType === "approve" || modalType === "decline") && selectedVolunteer && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <button 
              className={styles.modalCloseBtn}
              onClick={closeModal}
            >
              <FiX />
            </button>
            
            <div className={styles.modalContent}>
              <h2>
                <span 
                  className={modalType === "approve" ? styles.approveHeading : styles.declineHeading}
                  style={{ color: modalType === "approve" ? "#10b981" : "#d50808" }}
                >
                  {modalType === "approve" ? "Approve" : "Decline"}
                </span> Application
              </h2>
              <p>
                Are you sure you want to {modalType} <strong>{sanitizeInput(selectedVolunteer.name)}</strong>&apos;s application?
              </p>
            </div>

            <div className={styles.modalActions}>
              <button 
                className={styles.modalCancelBtn}
                onClick={() => setModalType(null)}
              >
                Cancel
              </button>
              <button 
                className={modalType === 'approve' ? styles.modalApproveBtn : styles.modalDeclineBtn}
                onClick={handleConfirmAction}
              >
                {modalType === 'approve' ? 'Approve' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {showBulkModal && bulkAction && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <button 
              className={styles.modalCloseBtn}
              onClick={closeBulkModal}
            >
              <FiX />
            </button>
            
            <div className={styles.modalContent}>
              <h2>
                <span 
                  className={bulkAction === 'approve' ? styles.approveHeading : styles.declineHeading}
                  style={{ color: bulkAction === 'approve' ? '#10b981' : '#d50808' }}
                >
                  {bulkAction === 'approve' ? 'Approve' : 'Decline'}
                </span> Selected Volunteers
              </h2>
              <p>
                Are you sure you want to {bulkAction} <strong>
                  {bulkAction === 'approve' ? volunteersToApprove : volunteersToDecline}
                </strong> selected volunteer{(bulkAction === 'approve' ? volunteersToApprove : volunteersToDecline) !== 1 ? 's' : ''}?
                {selectedVolunteers.length > actionableSelectedVolunteers.length && (
                  <span style={{ display: 'block', marginTop: '8px', fontSize: '0.9em', color: '#666' }}>
                    Note: {selectedVolunteers.length - actionableSelectedVolunteers.length} volunteer{selectedVolunteers.length - actionableSelectedVolunteers.length !== 1 ? 's' : ''} with Cancelled or Completed status will be skipped.
                  </span>
                )}
              </p>
            </div>

            <div className={styles.modalActions}>
              <button 
                className={styles.modalCancelBtn}
                onClick={() => setShowBulkModal(false)}
              >
                Cancel
              </button>
              <button 
                className={bulkAction === 'approve' ? styles.modalApproveBtn : styles.modalDeclineBtn}
                onClick={handleConfirmBulkAction}
              >
                {bulkAction === 'approve' ? 'Approve' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}


    </>
  )
}
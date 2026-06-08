// VolunteerTable.js
"use client"

import { useState, useRef, useEffect } from "react"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { IoCloseOutline } from "react-icons/io5";
import { FiTrash2 } from "react-icons/fi";
import { FaUser } from "react-icons/fa";
import Image from "next/image";
import PaginationControls from "../../../components/PaginationControls/PaginationControls"
import ViewDetailsModal from "../ViewDetailsModal/ViewDetailsModal"
import { ApprovalConfirmationModal } from "@/components"
import { getProfilePhotoUrl } from "@/utils/shared/uploadPaths"
import { formatDateShort } from "@/utils/shared/dateUtils"
import { sanitizeInput } from "@/utils/admin/formValidation"
import styles from "./VolunteerTable.module.css"

const validateVolunteerData = (volunteer) => {
  if (!volunteer || typeof volunteer !== 'object') return false;
  if (!volunteer.id || !volunteer.name) return false;
  return true;
};

// Avatar component for volunteers
const VolunteerAvatar = ({ volunteer, size = 40 }) => {
  const [imageError, setImageError] = useState(false);
  
  // Get the proper profile photo URL using the utility function
  const profilePhotoUrl = getProfilePhotoUrl(volunteer.profile_photo_url);
  
  // Check if we have a valid profile photo URL (not the fallback)
  const hasValidProfilePhoto = profilePhotoUrl && 
    profilePhotoUrl !== '/defaults/default-profile.png' && 
    profilePhotoUrl !== 'IMAGE_UNAVAILABLE' &&
    !imageError;
  
  if (!hasValidProfilePhoto) {
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
        src={profilePhotoUrl}
        alt={`${volunteer.name || 'Volunteer'}'s profile`}
        width={size}
        height={size}
        className={styles.avatarImage}
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default function VolunteerTable({ volunteers, onStatusUpdate, onBulkStatusUpdate, onSoftDelete, onBulkDelete, itemsPerPage = 10, isUpdatingStatus = false, isBulkUpdatingStatus = false, sortOrder = 'latest', totalCount = 0, readOnly = false }) {
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
    if (readOnly && action !== 'view') {
      return;
    }

    // Validate volunteer data before processing
    if (!validateVolunteerData(volunteer)) {
      return;
    }
    
    setSelectedVolunteer(volunteer)
    setModalType(action)
    setShowDropdown(null)
  }

  const handleConfirmAction = async (rejectionComment) => {
    if (selectedVolunteer && modalType && !isUpdatingStatus) {
      const newStatus = modalType === "approve" ? "Approved" : "Declined"
      await onStatusUpdate(selectedVolunteer.id, newStatus, rejectionComment)
      // Only close modal after operation completes (success or error)
      closeModal()
    }
  }

  const closeModal = () => {
    // Prevent closing modal during loading
    if (isUpdatingStatus) return
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

  const handleConfirmBulkAction = async (rejectionComment) => {
    if (selectedVolunteers.length === 0 || !bulkAction || isBulkUpdatingStatus) return
    
    const newStatus = bulkAction === 'approve' ? 'Approved' : 'Declined'
    
    // Only process volunteers with actionable statuses (exclude Cancelled and Completed)
    const actionableVolunteerIds = actionableSelectedVolunteers.map(volunteer => volunteer.id)
    
    // Use bulk status update handler if available, otherwise fall back to individual updates
    if (onBulkStatusUpdate && actionableVolunteerIds.length > 0) {
      await onBulkStatusUpdate(actionableVolunteerIds, newStatus, rejectionComment)
    } else if (onStatusUpdate) {
      // Fallback to individual updates if bulk handler not available
      await Promise.all(actionableVolunteerIds.map(volunteerId => onStatusUpdate(volunteerId, newStatus, rejectionComment)))
    }
    
    // Only close modal and clear selections after operation completes
    setSelectedVolunteers([])
    setShowBulkModal(false)
    setBulkAction(null)
  }

  const closeBulkModal = () => {
    // Prevent closing modal during loading
    if (isBulkUpdatingStatus) return
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
              disabled={readOnly || isApproveDisabled}
              title={isApproveDisabled ? 'Cannot approve: All selected volunteers are already approved' : 'Approve selected volunteers'}
            >
              Approve Selected
            </button>
            <button 
              className={`${styles.bulkButton} ${styles.declineButton} ${isDeclineDisabled ? styles.disabled : ''}`}
              onClick={() => !isDeclineDisabled && handleBulkAction('decline')}
              disabled={readOnly || isDeclineDisabled}
              title={isDeclineDisabled ? 'Cannot decline: All selected volunteers are already declined' : 'Decline selected volunteers'}
            >
              Decline Selected
            </button>
            <button 
              className={`${styles.bulkButton} ${styles.deleteButton}`}
              onClick={handleBulkDelete}
              disabled={readOnly}
              title={readOnly ? 'Demo mode: changes not saved' : 'Delete selected volunteers'}
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
              <th className={styles.numberColumn}>#</th>
              <th>
                <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} />
              </th>
              <th>Volunteer</th>
              <th>Program</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {currentVolunteers.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.noApplicants}>
                  No applicants found
                </td>
              </tr>
            ) : currentVolunteers.map((volunteer, index) => {
              // Validate volunteer data before rendering
              if (!validateVolunteerData(volunteer)) {
                return null;
              }

              // Sanitize data for display
              const sanitizedName = sanitizeInput(volunteer.name);
              const sanitizedEmail = sanitizeInput(volunteer.email);
              const sanitizedProgram = sanitizeInput(volunteer.program);
              const formattedDate = formatDateShort(volunteer.date);

              const rowNumber = sortOrder === 'oldest' 
                ? totalCount - (startIndex + index)
                : startIndex + index + 1;
              
              return (
                <tr key={volunteer.id}>
                  <td className={styles.numberCell}>
                    {rowNumber}
                  </td>
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
                  <td style={{ color: "#8a919c", fontWeight: "400" }}>{formattedDate}</td>
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
                            {!readOnly && volunteer.status !== "Approved" && volunteer.status !== "Cancelled" && volunteer.status !== "Completed" && (
                              <li onClick={() => handleAction(volunteer, "approve")}>
                                Approve
                              </li>
                            )}
                            {!readOnly && volunteer.status !== "Declined" && volunteer.status !== "Cancelled" && volunteer.status !== "Completed" && (
                              <li onClick={() => handleAction(volunteer, "decline")}>
                                Decline
                              </li>
                            )}
                            {!readOnly && (
                            <li 
                              onClick={() => onSoftDelete && onSoftDelete(volunteer.id, sanitizedName)}
                              style={{ color: '#dc3545', borderTop: '1px solid #eee', marginTop: '4px', paddingTop: '4px' }}
                            >
                              Delete
                            </li>
                            )}
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
        />
      )}

      <ApprovalConfirmationModal
        isOpen={(modalType === "approve" || modalType === "decline") && selectedVolunteer !== null}
        actionType={modalType === "approve" ? "approve" : "decline"}
        selectedCount={1}
        itemName={selectedVolunteer ? sanitizeInput(selectedVolunteer.name) : ''}
        actionableCount={1}
        hasMixedStatus={false}
        showComment={modalType === "decline"}
        onConfirm={handleConfirmAction}
        onClose={closeModal}
        isProcessing={isUpdatingStatus}
        customMessage="application"
      />

      {/* Bulk Action Confirmation Modal */}
      <ApprovalConfirmationModal
        isOpen={showBulkModal && bulkAction !== null}
        actionType={bulkAction === 'approve' ? 'approve' : 'decline'}
        selectedCount={selectedVolunteers.length}
        actionableCount={bulkAction === 'approve' ? volunteersToApprove : volunteersToDecline}
        hasMixedStatus={selectedVolunteers.length > actionableSelectedVolunteers.length}
        showComment={bulkAction === 'decline'}
        onConfirm={handleConfirmBulkAction}
        onClose={closeBulkModal}
        isProcessing={isBulkUpdatingStatus}
      />


    </>
  )
}
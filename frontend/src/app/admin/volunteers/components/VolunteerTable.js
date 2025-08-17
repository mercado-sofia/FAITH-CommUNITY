// VolunteerTable.js
"use client"

import { useState, useRef, useEffect } from "react"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { IoCloseOutline } from "react-icons/io5";
import { FiTrash2 } from "react-icons/fi";
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

export default function VolunteerTable({ volunteers, onStatusUpdate, onSoftDelete, onBulkDelete, itemsPerPage = 10 }) {
  const [selectedVolunteer, setSelectedVolunteer] = useState(null)
  const [showDropdown, setShowDropdown] = useState(null)
  const [modalType, setModalType] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [dropdownPosition, setDropdownPosition] = useState({})
  const [selectedVolunteers, setSelectedVolunteers] = useState([])
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkAction, setBulkAction] = useState(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)

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
    setShowBulkDeleteModal(true)
  }

  const handleConfirmBulkAction = () => {
    if (selectedVolunteers.length === 0 || !bulkAction) return
    
    const newStatus = bulkAction === 'approve' ? 'Approved' : 'Declined'
    selectedVolunteers.forEach(volunteerId => {
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

  const handleConfirmBulkDelete = () => {
    if (selectedVolunteers.length === 0) return
    
    // Call the bulk delete handler with the selected volunteer IDs
    if (onBulkDelete) {
      onBulkDelete(selectedVolunteers)
    }
    
    setSelectedVolunteers([])
    setShowBulkDeleteModal(false)
  }

  const closeBulkDeleteModal = () => {
    setShowBulkDeleteModal(false)
  }

  const cancelSelection = () => {
    setSelectedVolunteers([])
  }

  const handleDropdownToggle = (volunteerId) => {
    if (showDropdown === volunteerId) return setShowDropdown(null)

    const buttonElement = dropdownRefs.current[volunteerId]
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect()
      const top = rect.bottom + 4
      const left = rect.right - 192
      setDropdownPosition({ [volunteerId]: { top, left } })
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

  // Smart button state logic - Only disable when action would be meaningless
  const isApproveDisabled = selectedStatuses.length > 0 && selectedStatuses.every(status => status === 'Approved')
  const isDeclineDisabled = selectedStatuses.length > 0 && selectedStatuses.every(status => status === 'Declined')

  // Count only volunteers that will actually be affected by the action
  const volunteersToApprove = selectedStatuses.filter(status => status !== 'Approved').length
  const volunteersToDecline = selectedStatuses.filter(status => status !== 'Declined').length

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
              <th>Name</th>
              <th>Email</th>
              <th>Program</th>
              <th>Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {currentVolunteers.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.noApplicants}>
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
                  <td className={styles.truncatedText} style={{ color: "#2e3136", fontWeight: "500" }}>
                    {sanitizedName}
                  </td>
                  <td className={styles.truncatedText} style={{ color: "#8a919c", fontWeight: "400" }}>
                    {sanitizedEmail}
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
                          <ul className={styles.options}>
                            <li onClick={() => handleAction(volunteer, "view")}>View Details</li>
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

      {(modalType === "approve" || modalType === "reject") && selectedVolunteer && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h2>{modalType === "approve" ? "Approve" : "Reject"} Application</h2>
            <p>
              Are you sure you want to {modalType} <strong>{sanitizeInput(selectedVolunteer.name)}</strong>&apos;s application?
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

      {/* Bulk Action Confirmation Modal */}
      {showBulkModal && bulkAction && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h2>{bulkAction === 'approve' ? 'Approve' : 'Decline'} Selected Volunteers</h2>
            <p>
              Are you sure you want to {bulkAction} <strong>
                {bulkAction === 'approve' ? volunteersToApprove : volunteersToDecline}
              </strong> selected volunteer{(bulkAction === 'approve' ? volunteersToApprove : volunteersToDecline) !== 1 ? 's' : ''}?
            </p>
            <div className={styles.confirmActions}>
              <button onClick={closeBulkModal}>Cancel</button>
              <button 
                onClick={handleConfirmBulkAction}
                className={bulkAction === 'approve' ? '' : styles.declineButton}
              >
                Yes, {bulkAction === 'approve' ? 'Approve' : 'Decline'} All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h2>Delete Selected Volunteers</h2>
            <p>
              Are you sure you want to delete <strong>{selectedVolunteers.length}</strong> selected volunteer{selectedVolunteers.length !== 1 ? 's' : ''}?
            </p>
            <p className={styles.warning}>
              Warning: This action will hide the selected volunteers from the list but preserve their data.
            </p>
            <div className={styles.confirmActions}>
              <button onClick={closeBulkDeleteModal}>Cancel</button>
              <button 
                onClick={handleConfirmBulkDelete}
                className={styles.deleteButton}
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
// VolunteerTable.js
"use client"

import { useState, useRef, useEffect } from "react"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { IoCloseOutline } from "react-icons/io5";
import PaginationControls from "./PaginationControls"
import ViewDetailsModal from "./ViewDetailsModal"
import styles from "./styles/VolunteerTable.module.css"

export default function VolunteerTable({ volunteers, onStatusUpdate, onSoftDelete, itemsPerPage = 10 }) {
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
            ) : currentVolunteers.map((volunteer) => (
              <tr key={volunteer.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedVolunteers.includes(volunteer.id)}
                    onChange={() => toggleSelectOne(volunteer.id)}
                  />
                </td>
                <td className={styles.truncatedText} style={{ color: "#2e3136", fontWeight: "500" }}>
                  {volunteer.name}
                </td>
                <td className={styles.truncatedText} style={{ color: "#8a919c", fontWeight: "400" }}>
                  {volunteer.email}
                </td>
                <td className={styles.truncatedText} style={{ color: "#2e3136", fontWeight: "500" }}>
                  {volunteer.program}
                </td>
                <td style={{ color: "#8a919c", fontWeight: "400" }}>{volunteer.date}</td>
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
              </tr>
            ))}
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
    </>
  )
}
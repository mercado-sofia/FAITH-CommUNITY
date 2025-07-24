"use client"

import { useState, useRef, useEffect } from "react"
import PaginationControls from "./PaginationControls"
import styles from "./styles/VolunteerTable.module.css"

export default function VolunteerTable({ volunteers, onStatusUpdate }) {
  const [selectedVolunteer, setSelectedVolunteer] = useState(null)
  const [showDropdown, setShowDropdown] = useState(null)
  const [modalType, setModalType] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [dropdownPosition, setDropdownPosition] = useState({})
  const itemsPerPage = 10

  const dropdownRefs = useRef({})

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown !== null) {
        const dropdownElement = document.querySelector(`.${styles.actionDropdown}`)
        const buttonElement = dropdownRefs.current[showDropdown]

        if (
          dropdownElement &&
          !dropdownElement.contains(event.target) &&
          buttonElement &&
          !buttonElement.contains(event.target)
        ) {
          setShowDropdown(null)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showDropdown])

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case "approved":
        return `${styles.statusBadge} ${styles.statusApproved}`
      case "pending":
        return `${styles.statusBadge} ${styles.statusPending}`
      case "in review":
        return `${styles.statusBadge} ${styles.statusInReview}`
      case "declined":
        return `${styles.statusBadge} ${styles.statusDeclined}`
      default:
        return styles.statusBadge
    }
  }

  const handleAction = (volunteer, action) => {
    setSelectedVolunteer(volunteer)
    setModalType(action)
    setShowDropdown(null)
  }

  const handleConfirmAction = () => {
    if (selectedVolunteer && modalType && (modalType === "approve" || modalType === "reject")) {
      const newStatus = modalType === "approve" ? "Approved" : "Declined"
      onStatusUpdate(selectedVolunteer.id, newStatus)
    }
    closeModal()
  }

  const closeModal = () => {
    setSelectedVolunteer(null)
    setModalType(null)
  }

  const handleDropdownToggle = (volunteerId) => {
    if (showDropdown === volunteerId) {
      setShowDropdown(null)
      return
    }

    // Calculate dropdown position relative to viewport
    const buttonElement = dropdownRefs.current[volunteerId]
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const dropdownHeight = 120 // Approximate dropdown height
      const dropdownWidth = 192 // 12rem = 192px

      let top = rect.bottom + 4
      let left = rect.right - dropdownWidth

      // If dropdown would go below viewport, position it above the button
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 4
      }

      // If dropdown would go outside left edge, align it to the left of button
      if (left < 8) {
        left = rect.left
      }

      // If dropdown would go outside right edge, align it to the right edge with padding
      if (left + dropdownWidth > viewportWidth - 8) {
        left = viewportWidth - dropdownWidth - 8
      }

      setDropdownPosition({
        [volunteerId]: { top, left },
      })
    }

    setShowDropdown(volunteerId)
  }

  // Pagination
  const totalPages = Math.ceil(volunteers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentVolunteers = volunteers.slice(startIndex, endIndex)

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.tableHeaderCell}>Name</th>
              <th className={styles.tableHeaderCell}>Email</th>
              <th className={styles.tableHeaderCell}>Program</th>
              <th className={styles.tableHeaderCell}>Status</th>
              <th className={styles.tableHeaderCell}>Action</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {currentVolunteers.map((volunteer) => (
              <tr key={volunteer.id} className={styles.tableRow}>
                <td className={styles.tableCell}>{volunteer.name}</td>
                <td className={styles.tableCellSecondary}>{volunteer.email}</td>
                <td className={styles.tableCellSecondary}>{volunteer.program}</td>
                <td className={styles.tableCell}>
                  <span className={getStatusClass(volunteer.status)}>{volunteer.status}</span>
                </td>
                <td className={styles.tableCell}>
                  {volunteer.status === "In Review" ? (
                    <button className={styles.manageButton}>Manage</button>
                  ) : (
                    <div className={styles.actionContainer} ref={(el) => (dropdownRefs.current[volunteer.id] = el)}>
                      <button onClick={() => handleDropdownToggle(volunteer.id)} className={styles.actionButton}>
                        <svg className={styles.moreIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                          />
                        </svg>
                      </button>

                      {showDropdown === volunteer.id && (
                        <div
                          className={styles.actionDropdown}
                          style={{
                            top: `${dropdownPosition[volunteer.id]?.top || 0}px`,
                            left: `${dropdownPosition[volunteer.id]?.left || 0}px`,
                          }}
                        >
                          <button onClick={() => handleAction(volunteer, "view")} className={styles.actionDropdownItem}>
                            <svg className={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            View Details
                          </button>
                          {volunteer.status !== "Approved" && (
                            <button
                              onClick={() => handleAction(volunteer, "approve")}
                              className={`${styles.actionDropdownItem} ${styles.actionDropdownItemGreen}`}
                            >
                              <svg className={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Approve
                            </button>
                          )}
                          {volunteer.status !== "Declined" && (
                            <button
                              onClick={() => handleAction(volunteer, "reject")}
                              className={`${styles.actionDropdownItem} ${styles.actionDropdownItemRed}`}
                            >
                              <svg className={styles.actionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              Decline
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        startIndex={startIndex}
        endIndex={endIndex}
        totalCount={volunteers.length}
      />

      {/* View Details Modal */}
      {modalType === "view" && selectedVolunteer && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Volunteer Details</h2>
              <button onClick={closeModal} className={styles.closeButton}>
                <svg className={styles.closeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.detailsGrid}>
                <div>
                  <label className={styles.detailLabel}>Name</label>
                  <p className={styles.detailValue}>{selectedVolunteer.name}</p>
                </div>
                <div>
                  <label className={styles.detailLabel}>Age</label>
                  <p className={styles.detailValue}>{selectedVolunteer.age}</p>
                </div>
                <div>
                  <label className={styles.detailLabel}>Gender</label>
                  <p className={styles.detailValue}>{selectedVolunteer.gender}</p>
                </div>
                <div>
                  <label className={styles.detailLabel}>Email</label>
                  <p className={styles.detailValue}>{selectedVolunteer.email}</p>
                </div>
                <div>
                  <label className={styles.detailLabel}>Contact</label>
                  <p className={styles.detailValue}>{selectedVolunteer.contact}</p>
                </div>
                <div>
                  <label className={styles.detailLabel}>Occupation</label>
                  <p className={styles.detailValue}>{selectedVolunteer.occupation}</p>
                </div>
                <div className={styles.detailsGridFull}>
                  <label className={styles.detailLabel}>Address</label>
                  <p className={styles.detailValue}>{selectedVolunteer.address}</p>
                </div>
                <div>
                  <label className={styles.detailLabel}>Program</label>
                  <p className={styles.detailValue}>{selectedVolunteer.program}</p>
                </div>
                <div>
                  <label className={styles.detailLabel}>Status</label>
                  <span className={getStatusClass(selectedVolunteer.status)}>{selectedVolunteer.status}</span>
                </div>
                <div className={styles.detailsGridFull}>
                  <label className={styles.detailLabel}>Reason for Volunteering</label>
                  <p className={styles.detailValue}>{selectedVolunteer.reason}</p>
                </div>
                {selectedVolunteer.validIdFilename && (
                  <div className={styles.detailsGridFull}>
                    <label className={styles.detailLabel}>Valid ID</label>
                    <a href="#" className={styles.detailLink}>
                      {selectedVolunteer.validIdFilename}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {(modalType === "approve" || modalType === "reject") && selectedVolunteer && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h2 className={styles.confirmTitle}>{modalType === "approve" ? "Approve" : "Reject"} Application</h2>
            <p className={styles.confirmText}>
              Are you sure you want to {modalType} <strong>{selectedVolunteer.name}</strong>
              {"'"}s application?
            </p>
            <div className={styles.confirmActions}>
              <button onClick={closeModal} className={`${styles.confirmButton} ${styles.cancelButton}`}>
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`${styles.confirmButton} ${modalType === "approve" ? styles.approveButton : styles.rejectButton}`}
              >
                Yes, {modalType}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
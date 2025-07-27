// VolunteerTable.js
"use client"

import { useState, useRef, useEffect } from "react"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import PaginationControls from "./PaginationControls"
import ViewDetailsModal from "./ViewDetailsModal"
import styles from "./styles/VolunteerTable.module.css"

export default function VolunteerTable({ volunteers, onStatusUpdate }) {
  const [selectedVolunteer, setSelectedVolunteer] = useState(null)
  const [showDropdown, setShowDropdown] = useState(null)
  const [modalType, setModalType] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [dropdownPosition, setDropdownPosition] = useState({})
  const [selectedVolunteers, setSelectedVolunteers] = useState([])

  const itemsPerPage = 10
  const dropdownRefs = useRef({})

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
  const endIndex = startIndex + itemsPerPage
  const currentVolunteers = volunteers.slice(startIndex, endIndex)
  const isAllSelected = currentVolunteers.length > 0 && selectedVolunteers.length === currentVolunteers.length

  return (
    <>
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
            {currentVolunteers.map((volunteer) => (
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
              Are you sure you want to {modalType}{" "}
              <strong>{selectedVolunteer.name}</strong>&apos;s application?
            </p>
            <div className={styles.confirmActions}>
              <button onClick={closeModal}>Cancel</button>
              <button onClick={handleConfirmAction}>
                Yes, {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
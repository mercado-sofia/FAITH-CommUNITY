"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useSelector, useDispatch } from "react-redux"
import {
  useGetAllAdminsQuery,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
} from "../../../rtk/superadmin/adminApi"
import {
  useSendInvitationMutation,
  useGetAllInvitationsQuery,
  useCancelInvitationMutation,
} from "../../../rtk/superadmin/invitationsApi"
import { initializeAuth, selectCurrentAdmin, selectIsAuthenticated } from "../../../rtk/superadmin/adminSlice"
import SearchAndFilterControls from "./components/SearchAndFilterControls"
import InvitationsTable from "./components/InvitationsTable"
import InviteModal from "./components/InviteModal"
import PaginationControls from "./components/PaginationControls"
import DeleteConfirmationModal from "../components/DeleteConfirmationModal"
import SuccessModal from "../components/SuccessModal"
import styles from "./invites.module.css"

const AdminCard = ({ admin, onUpdate, onRemove, isRemoving, isUpdating }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    org: admin.org,
    orgName: admin.orgName,
    email: admin.email,
    password: "",
    confirmPassword: "",
    role: "admin", // Always admin
    status: admin.status,
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleInputChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm({
      org: admin.org,
      orgName: admin.orgName,
      email: admin.email,
      password: "",
      confirmPassword: "",
      role: "admin",
      status: admin.status,
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()

    // Validate password confirmation if new password is provided
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      alert("Passwords do not match!")
      return
    }

    try {
      // Ensure role is always admin
      const updateData = { ...editForm, role: "admin" }
      // Remove confirmPassword from the data sent to server
      const { confirmPassword, ...dataToSend } = updateData
      await onUpdate({ id: admin.id, ...dataToSend })
      setIsEditing(false)
    } catch (error) {
      console.error("Update failed:", error)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm({
      org: admin.org,
      orgName: admin.orgName,
      email: admin.email,
      password: "",
      confirmPassword: "",
      role: "admin",
      status: admin.status,
    })
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  if (isEditing) {
    return (
      <div className={`${styles.adminCard} ${styles.editingCard}`}>
        <form onSubmit={handleSave} className={styles.editForm}>
          <div className={styles.editField}>
            <label>Organization Acronym:</label>
            <input
              type="text"
              name="org"
              value={editForm.org}
              onChange={handleInputChange}
              required
              disabled={isUpdating}
              className={styles.editInput}
              placeholder="e.g., FAIPS, FTL, FAHSS"
            />
          </div>

          <div className={styles.editField}>
            <label>Organization Name:</label>
            <input
              type="text"
              name="orgName"
              value={editForm.orgName}
              onChange={handleInputChange}
              required
              disabled={isUpdating}
              className={styles.editInput}
              placeholder="Full organization name"
            />
          </div>

          <div className={styles.editField}>
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={editForm.email}
              onChange={handleInputChange}
              required
              disabled={isUpdating}
              className={styles.editInput}
            />
          </div>

          <div className={styles.editField}>
            <label>New Password:</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showNewPassword ? "text" : "password"}
                name="password"
                value={editForm.password}
                onChange={handleInputChange}
                placeholder="Leave blank to keep current password"
                disabled={isUpdating}
                className={styles.editInput}
              />
              {editForm.password && (
                <button
                  type="button"
                  className={styles.eyeIcon}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isUpdating}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                      fill="currentColor"
                    />
                    {!showNewPassword && (
                      <path
                        d="M2 2l20 20M9.9 4.24A9.12 9.12 0 0112 4c5 0 9.27 3.11 11 7.5a11.79 11.79 0 01-4 5.19m-5.6.36A9.12 9.12 0 0112 20c-5 0-9.27-3.11-11-7.5 1.64-4.24 5.81-7.5 10.99-7.5z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className={styles.editField}>
            <label>Confirm New Password:</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={editForm.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
                disabled={isUpdating}
                className={styles.editInput}
              />
              {editForm.confirmPassword && (
                <button
                  type="button"
                  className={styles.eyeIcon}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isUpdating}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                      fill="currentColor"
                    />
                    {!showConfirmPassword && (
                      <path
                        d="M2 2l20 20M9.9 4.24A9.12 9.12 0 0112 4c5 0 9.27 3.11 11 7.5a11.79 11.79 0 01-4 5.19m-5.6.36A9.12 9.12 0 0112 20c-5 0-9.27-3.11-11-7.5 1.64-4.24 5.81-7.5 10.99-7.5z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className={styles.editField}>
            <label>Role:</label>
            <input
              type="text"
              value="Admin"
              disabled
              className={`${styles.editInput} ${styles.disabledField}`}
              style={{ backgroundColor: "#f8f9fa", color: "#6c757d" }}
            />
            <small style={{ color: "#6c757d", fontSize: "0.8rem" }}>Role is fixed as Admin for this interface</small>
          </div>

          <div className={styles.editField}>
            <label>Status:</label>
            <select
              name="status"
              value={editForm.status}
              onChange={handleInputChange}
              disabled={isUpdating}
              className={styles.editSelect}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className={styles.editActions}>
            <button type="submit" className={styles.btnSave} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save"}
            </button>
            <button type="button" className={styles.btnCancel} onClick={handleCancel} disabled={isUpdating}>
              Cancel
            </button>
          </div>

          <div className={styles.editNote}>
            <small>Created: {new Date(admin.created_at).toLocaleString()}</small>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.adminCard}>
      <div className={styles.cardHeader}>
        <div className={styles.orgInfo}>
          <h2>{admin.orgName}</h2>
          <span className={styles.orgAcronym}>({admin.org})</span>
        </div>
        <div className={styles.cardTags}>
          <span className={`${styles.roleTag} ${styles.admin}`}>Admin</span>
          <span className={`${styles.statusTag} ${styles[admin.status.toLowerCase()]}`}>{admin.status}</span>
        </div>
      </div>

      <div className={styles.cardContent}>
        <p>
          <strong>Email:</strong> {admin.email}
        </p>
        <p>
          <strong>Organization:</strong> {admin.orgName} ({admin.org})
        </p>
        <p>
          <strong>Created:</strong> {new Date(admin.created_at).toLocaleString()}
        </p>
      </div>

      <div className={styles.cardActions}>
        <button onClick={handleEdit} className={styles.btnEdit} disabled={isRemoving || isUpdating}>
          Edit
        </button>
        {admin.status === "ACTIVE" && (
          <button onClick={() => onRemove(admin.id)} className={styles.btnRemove} disabled={isRemoving || isUpdating}>
            {isRemoving ? "Removing..." : "Remove"}
          </button>
        )}
      </div>
    </div>
  )
}


const ManageProfiles = () => {
  // URL management
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showEntries, setShowEntries] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '' })
  
  // Bulk actions
  const [selectedItems, setSelectedItems] = useState(new Set())
  
  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showBulkCancelModal, setShowBulkCancelModal] = useState(false)
  const [isBulkCancelling, setIsBulkCancelling] = useState(false)

  const dispatch = useDispatch()
  const currentAdmin = useSelector(selectCurrentAdmin)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  // Initialize auth state from localStorage
  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  // API hooks
  const { data: admins = [], error: fetchError, isLoading: isFetching, refetch } = useGetAllAdminsQuery()
  const { data: invitations = [], error: invitationsError, isLoading: isFetchingInvitations, refetch: refetchInvitations } = useGetAllInvitationsQuery()

  const [sendInvitation, { isLoading: isSendingInvitation }] = useSendInvitationMutation()
  const [cancelInvitation, { isLoading: isCancellingInvitation }] = useCancelInvitationMutation()
  const [updateAdmin, { isLoading: isUpdating }] = useUpdateAdminMutation()
  const [deleteAdmin, { isLoading: isRemoving }] = useDeleteAdminMutation()

  // Function to update URL parameters
  const updateURLParams = useCallback((newParams) => {
    const params = new URLSearchParams(searchParams)
    
    Object.entries(newParams).forEach(([key, value]) => {
      const defaults = {
        search: '',
        sort: 'newest',
        show: 10,
        page: 1
      }
      
      if (value && value !== defaults[key] && value !== '') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    const newURL = `${pathname}?${params.toString()}`
    router.replace(newURL, { scroll: false })
  }, [searchParams, pathname, router])

  // Handle URL parameters for all filters
  useEffect(() => {
    const urlParams = {
      search: searchParams.get('search'),
      sort: searchParams.get('sort'),
      show: searchParams.get('show'),
      page: searchParams.get('page')
    }

    if (urlParams.search) {
      setSearchTerm(urlParams.search)
    }
    if (urlParams.sort) {
      setSortBy(urlParams.sort)
    }
    if (urlParams.show) {
      setShowEntries(parseInt(urlParams.show))
    }
    if (urlParams.page) {
      setCurrentPage(parseInt(urlParams.page))
    }
  }, [searchParams])

  // Filter and search functionality
  const filteredInvitations = useMemo(() => {
    let filtered = [...invitations]

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(invitation => 
        invitation.email.toLowerCase().includes(searchLower)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })

    return filtered
  }, [invitations, searchTerm, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredInvitations.length / showEntries)
  const startIndex = (currentPage - 1) * showEntries
  const endIndex = startIndex + showEntries
  const paginatedInvitations = filteredInvitations.slice(startIndex, endIndex)

  // Statistics
  const totalCount = invitations.length

  // Success modal handler
  const showSuccessModal = (message) => {
    setSuccessModal({ isVisible: true, message })
  }

  const closeSuccessModal = () => {
    setSuccessModal({ isVisible: false, message: '' })
  }

  // Invitation CRUD operations
  const handleSendInvitation = async (email) => {
    try {
      await sendInvitation(email).unwrap()
      showSuccessModal('Invitation sent successfully!')
      refetchInvitations()
    } catch (error) {
      console.error('Send invitation failed:', error)
      const errorMessage = error?.data?.error || error?.message || 'Failed to send invitation'
      throw new Error(errorMessage)
    }
  }

  const handleCancelInvitation = async (id) => {
    try {
      await cancelInvitation(id).unwrap()
      showSuccessModal('Invitation cancelled successfully!')
      refetchInvitations()
    } catch (error) {
      console.error('Cancel invitation failed:', error)
      showSuccessModal('Failed to cancel invitation')
    }
  }

  const handleBulkCancelRequest = (selectedInvitationIds) => {
    setSelectedItems(new Set(selectedInvitationIds))
    setShowBulkCancelModal(true)
  }

  const handleBulkCancelConfirm = async () => {
    if (selectedItems.size === 0) return
    
    setIsBulkCancelling(true)
    try {
      const selectedIds = Array.from(selectedItems)
      await Promise.all(selectedIds.map(id => cancelInvitation(id).unwrap()))
      showSuccessModal(`${selectedIds.length} invitation(s) cancelled successfully!`)
      setShowBulkCancelModal(false)
      setSelectedItems(new Set())
      refetchInvitations()
    } catch (error) {
      console.error('Bulk cancel failed:', error)
      showSuccessModal('Failed to cancel selected invitations')
    } finally {
      setIsBulkCancelling(false)
    }
  }

  const handleBulkCancelCancel = () => {
    setShowBulkCancelModal(false)
  }

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(new Set(paginatedInvitations.map(invitation => invitation.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
      } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sortBy, showEntries])

  // Event handlers
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value)
    updateURLParams({ search: value })
  }, [updateURLParams])

  const handleSortChange = useCallback((value) => {
    setSortBy(value)
    updateURLParams({ sort: value })
  }, [updateURLParams])

  const handleShowEntriesChange = useCallback((value) => {
    const numValue = Number(value)
    setShowEntries(numValue)
    setCurrentPage(1)
    updateURLParams({ show: numValue, page: 1 })
  }, [updateURLParams])

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page)
    updateURLParams({ page })
  }, [updateURLParams])

  // Loading and error states
  if (isFetchingInvitations) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.loading}>Loading invitations...</div>
      </div>
    )
  }

  if (invitationsError) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.error}>
          <h2>Error loading invitations</h2>
          <p>{invitationsError?.data?.error || invitationsError?.message || 'Failed to fetch data'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.mainArea}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Admin Invitations</h1>
      </div>

      {/* Search and Filter Controls */}
      <SearchAndFilterControls
        searchQuery={searchTerm}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        showCount={showEntries}
        onShowCountChange={handleShowEntriesChange}
        totalCount={totalCount}
        filteredCount={filteredInvitations.length}
        onAddNew={() => setShowInviteModal(true)}
        isCreating={isSendingInvitation}
      />

      {/* Invitations Table */}
      <InvitationsTable
        invitations={paginatedInvitations}
        onCancel={handleCancelInvitation}
        onBulkCancel={handleBulkCancelRequest}
        selectedItems={selectedItems}
        onSelectAll={handleSelectAll}
        onSelectItem={handleSelectItem}
        isCancelling={isCancellingInvitation}
        itemsPerPage={showEntries}
      />

      {/* Pagination */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        startIndex={startIndex}
        endIndex={endIndex}
        totalCount={filteredInvitations.length}
      />

      {/* Success Modal */}
      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={closeSuccessModal}
      />

      {/* Modals */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleSendInvitation}
        isInviting={isSendingInvitation}
      />

      {/* Bulk Cancel Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showBulkCancelModal}
        itemName={`${selectedItems.size} invitation${selectedItems.size > 1 ? 's' : ''}`}
        itemType="invitation"
        onConfirm={handleBulkCancelConfirm}
        onCancel={handleBulkCancelCancel}
        isDeleting={isBulkCancelling}
      />
    </div>
  )
}

export default ManageProfiles


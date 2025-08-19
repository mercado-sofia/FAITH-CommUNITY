"use client"

import { useState, useMemo, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import {
  useGetAllAdminsQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
} from "../../../rtk/superadmin/manageProfilesApi"
import { initializeAuth, selectCurrentAdmin, selectIsAuthenticated } from "../../../rtk/superadmin/adminSlice"
import styles from "./manageProfiles.module.css"

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

const ConfirmationModal = ({ isOpen, onClose, onConfirm, orgAcronym, orgName, email, isCreating }) => {
  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Confirm Admin Account Creation</h2>
        <div className={styles.modalBody}>
          <p>Please confirm the details for the new admin account:</p>
          <div className={styles.confirmDetails}>
            <p>
              <strong>Organization:</strong> {orgName} ({orgAcronym})
            </p>
            <p>
              <strong>Email:</strong> {email}
            </p>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button onClick={onConfirm} className={styles.btnConfirm} disabled={isCreating}>
            {isCreating ? "Creating..." : "Confirm"}
          </button>
          <button onClick={onClose} className={styles.btnCancel} disabled={isCreating}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const ManageProfiles = () => {
  const [form, setForm] = useState({
    org: "",
    orgName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "admin",
  })
  const [notification, setNotification] = useState({ message: "", type: "" })
  const [statusFilter, setStatusFilter] = useState("all") // 'all', 'active', 'inactive'
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const dispatch = useDispatch()
  const currentAdmin = useSelector(selectCurrentAdmin)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  // Initialize auth state from localStorage
  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  const { data: admins = [], error: fetchError, isLoading: isFetching, refetch } = useGetAllAdminsQuery()

  const [createAdmin, { isLoading: isCreating }] = useCreateAdminMutation()
  const [updateAdmin, { isLoading: isUpdating }] = useUpdateAdminMutation()
  const [deleteAdmin, { isLoading: isRemoving }] = useDeleteAdminMutation()

  // Filter admins based on status
  const filteredAdmins = useMemo(() => {
    if (statusFilter === "all") return admins
    if (statusFilter === "active") return admins.filter((admin) => admin.status === "ACTIVE")
    if (statusFilter === "inactive") return admins.filter((admin) => admin.status === "INACTIVE")
    return admins
  }, [admins, statusFilter])

  // Count active and inactive admins
  const adminCounts = useMemo(() => {
    const active = admins.filter((admin) => admin.status === "ACTIVE").length
    const inactive = admins.filter((admin) => admin.status === "INACTIVE").length
    return { active, inactive, total: admins.length }
  }, [admins])

  const showNotification = (message, type = "success") => {
    setNotification({ message, type })
    setTimeout(() => setNotification({ message: "", type: "" }), 5000)
  }

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()

    // Validate password confirmation
    if (form.password !== form.confirmPassword) {
      showNotification("Passwords do not match!", "error")
      return
    }

    // Show confirmation modal
    setShowConfirmModal(true)
  }

  const handleConfirmCreate = async () => {
    try {
      // Ensure role is always admin
      const adminData = {
        org: form.org,
        orgName: form.orgName,
        email: form.email,
        password: form.password,
        role: "admin",
      }
      await createAdmin(adminData).unwrap()
      showNotification("Admin created successfully!")
      setForm({ org: "", orgName: "", email: "", password: "", confirmPassword: "", role: "admin" })
      setShowConfirmModal(false)
      setShowPassword(false)
      setShowConfirmPassword(false)
    } catch (error) {
      const errorMessage = error?.data?.error || error?.message || "An error occurred"
      showNotification(errorMessage, "error")
      console.error("Error:", error)
    }
  }

  const handleUpdateAdmin = async (updateData) => {
    try {
      // Ensure role is always admin
      const dataWithAdminRole = { ...updateData, role: "admin" }

      if (!dataWithAdminRole.password || dataWithAdminRole.password.trim() === "") {
        const { password, ...dataWithoutPassword } = dataWithAdminRole
        await updateAdmin(dataWithoutPassword).unwrap()
      } else {
        await updateAdmin(dataWithAdminRole).unwrap()
      }
      showNotification("Admin updated successfully!")
    } catch (error) {
      const errorMessage = error?.data?.error || error?.message || "Failed to update admin"
      showNotification(errorMessage, "error")
      console.error("Update error:", error)
      throw error
    }
  }

  const handleRemove = async (id) => {
    if (!window.confirm("Are you sure you want to remove this admin? This will deactivate their account.")) return

    try {
      // Find the admin to get their current data
      const adminToRemove = admins.find((admin) => admin.id === id)
      if (!adminToRemove) {
        showNotification("Admin not found", "error")
        return
      }

      // Soft delete by updating status to INACTIVE with all required fields
      const updateData = {
        id: adminToRemove.id,
        org: adminToRemove.org,
        orgName: adminToRemove.orgName,
        email: adminToRemove.email,
        role: "admin",
        status: "INACTIVE",
      }

      await updateAdmin(updateData).unwrap()
      showNotification("Admin removed successfully! Account has been deactivated.")
    } catch (error) {
      const errorMessage = error?.data?.error || error?.message || "Failed to remove admin"
      showNotification(errorMessage, "error")
      console.error("Remove error:", error)
    }
  }

  const handleRefresh = () => {
    refetch()
    showNotification("Data refreshed!")
  }

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value)
  }

  const handleSyncOrganizations = async () => {
    if (!window.confirm("This will create organization records for existing admins that don't have them. Continue?")) return

    setIsSyncing(true)
    try {
      const response = await fetch('http://localhost:8080/api/sync-orgs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      
      if (response.ok) {
        showNotification(`Sync completed! ${result.message}`)
        refetch() // Refresh the admin list to show updated data
      } else {
        showNotification(result.error || "Sync failed", "error")
      }
    } catch (error) {
      showNotification("Failed to sync organizations", "error")
      console.error("Sync error:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  if (isFetching) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.loading}>Loading admin profiles...</div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.error}>
          <h2>Error loading admin profiles</h2>
          <p>{fetchError?.data?.error || fetchError?.message || "Failed to fetch data"}</p>
          <button onClick={handleRefresh} className={styles.btnRefresh}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.mainArea}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Manage Admin Profiles</h1>
          <p className={styles.subtitle}>Create and manage administrator accounts</p>
          {currentAdmin && (
            <div className={styles.currentUserInfo}>
              <span>
                Logged in as: {currentAdmin.orgName || currentAdmin.org} ({currentAdmin.email})
              </span>
            </div>
          )}
        </div>
        <div className={styles.headerRight}>
          <div className={styles.statisticsCard}>
            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{adminCounts.total}</span>
                <span className={styles.statLabel}>Total Admins</span>
              </div>
              <div className={styles.statItem}>
                <span className={`${styles.statNumber} ${styles.activeCount}`}>{adminCounts.active}</span>
                <span className={styles.statLabel}>Active</span>
              </div>
              <div className={styles.statItem}>
                <span className={`${styles.statNumber} ${styles.inactiveCount}`}>{adminCounts.inactive}</span>
                <span className={styles.statLabel}>Inactive</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {notification.message && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>{notification.message}</div>
      )}

      <div className={styles.controlsSection}>
        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <label htmlFor="statusFilter" className={styles.filterLabel}>
              Filter by Status:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className={styles.filterSelect}
            >
              <option value="all">All Admins ({adminCounts.total})</option>
              <option value="active">Active ({adminCounts.active})</option>
              <option value="inactive">Inactive ({adminCounts.inactive})</option>
            </select>
          </div>
          <div className={styles.actionButtons}>
            <button onClick={handleSyncOrganizations} className={styles.syncButton} disabled={isSyncing}>
              {isSyncing ? "Syncing..." : "Sync Organizations"}
            </button>
            <button onClick={handleRefresh} className={styles.refreshButton}>
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      <div className={styles.createSection}>
        <div className={styles.sectionHeader}>
          <h2>Create New Admin</h2>
        </div>
        <form className={styles.createForm} onSubmit={handleCreateAdmin}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="admin-org">Organization Acronym</label>
              <input
                type="text"
                id="admin-org"
                name="org"
                placeholder="Organization Acronym (e.g., FAIPS)"
                value={form.org}
                onChange={handleInputChange}
                required
                disabled={isCreating}
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label htmlFor="admin-orgName">Organization Name</label>
              <input
                type="text"
                id="admin-orgName"
                name="orgName"
                placeholder="Full organization name"
                value={form.orgName}
                onChange={handleInputChange}
                required
                disabled={isCreating}
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label htmlFor="admin-email">Email</label>
              <input
                type="email"
                id="admin-email"
                name="email"
                placeholder="admin@organization.com"
                value={form.email}
                onChange={handleInputChange}
                required
                disabled={isCreating}
                className={styles.formInput}
              />
            </div>
            
            <div className={styles.formField}>
              <label htmlFor="admin-password">Password</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="admin-password"
                  name="password"
                  placeholder="Enter secure password"
                  value={form.password}
                  onChange={handleInputChange}
                  required
                  disabled={isCreating}
                  className={styles.formInput}
                />
                {form.password && (
                  <button
                    type="button"
                    className={styles.eyeIcon}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isCreating}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                        fill="currentColor"
                      />
                      {!showPassword && (
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
            
            <div className={styles.formField}>
              <label htmlFor="admin-confirmPassword">Confirm Password</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="admin-confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={form.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={isCreating}
                  className={styles.formInput}
                />
                {form.confirmPassword && (
                  <button
                    type="button"
                    className={styles.eyeIcon}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isCreating}
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
            
            <div className={styles.formField}>
              <label>Role</label>
              <div className={styles.roleDisplay}>
                <span className={styles.roleValue}>Admin</span>
                <span className={styles.roleNote}>Fixed role for this interface</span>
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.createButton} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.tableSection}>
        <div className={styles.sectionHeader}>
          <h2>Admin Profiles</h2>
          <span className={styles.itemCount}>
            {filteredAdmins.length} {filteredAdmins.length === 1 ? 'Admin' : 'Admins'}
          </span>
        </div>

        {filteredAdmins.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👤</div>
            <h3>No Admin Profiles Found</h3>
            <p>
              {statusFilter === "all"
                ? "No admin profiles have been created yet. Create your first admin profile above."
                : `No ${statusFilter} admin profiles found. Try adjusting your filters.`}
            </p>
          </div>
        ) : (
          <div className={styles.adminGrid}>
            {filteredAdmins.map((admin) => (
              <AdminCard
                key={admin.id}
                admin={admin}
                onUpdate={handleUpdateAdmin}
                onRemove={handleRemove}
                isRemoving={isRemoving}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmCreate}
        orgAcronym={form.org}
        orgName={form.orgName}
        email={form.email}
        isCreating={isCreating}
      />
    </div>
  )
}

export default ManageProfiles

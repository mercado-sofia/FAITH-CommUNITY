"use client"

import { useState, useMemo } from "react"
import {
  useGetAllAdminsQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
} from "../../../rtk/superadmin/manageProfilesApi"
import styles from "../styles/ManageProfiles.module.css"

const AdminCard = ({ admin, onUpdate, onRemove, isRemoving, isUpdating }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    org_name: admin.org_name,
    email: admin.email,
    password: "",
    role: "admin", // Always admin
    status: admin.status,
  })

  const handleInputChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm({
      org_name: admin.org_name,
      email: admin.email,
      password: "",
      role: "admin", // Always admin
      status: admin.status,
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      // Ensure role is always admin
      const updateData = { ...editForm, role: "admin" }
      await onUpdate({ id: admin.id, ...updateData })
      setIsEditing(false)
    } catch (error) {
      console.error("Update failed:", error)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm({
      org_name: admin.org_name,
      email: admin.email,
      password: "",
      role: "admin", // Always admin
      status: admin.status,
    })
  }

  if (isEditing) {
    return (
      <div className={`${styles.adminCard} ${styles.editingCard}`}>
        <form onSubmit={handleSave} className={styles.editForm}>
          <div className={styles.editField}>
            <label>Organization Name:</label>
            <input
              type="text"
              name="org_name"
              value={editForm.org_name}
              onChange={handleInputChange}
              required
              disabled={isUpdating}
              className={styles.editInput}
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
            <input
              type="password"
              name="password"
              value={editForm.password}
              onChange={handleInputChange}
              placeholder="Leave blank to keep current password"
              disabled={isUpdating}
              className={styles.editInput}
            />
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
        <h2>{admin.org_name}</h2>
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
  const [form, setForm] = useState({ org_name: "", email: "", password: "", role: "admin" })
  const [notification, setNotification] = useState({ message: "", type: "" })
  const [statusFilter, setStatusFilter] = useState("all") // 'all', 'active', 'inactive'

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

    try {
      // Ensure role is always admin
      const adminData = { ...form, role: "admin" }
      await createAdmin(adminData).unwrap()
      showNotification("Admin created successfully!")
      setForm({ org_name: "", email: "", password: "", role: "admin" })
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
      // Soft delete by updating status to INACTIVE
      await updateAdmin({ id, status: "INACTIVE", role: "admin" }).unwrap()
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

  if (isFetching) {
    return (
      <div className={styles.manageProfilesContainer}>
        <div className={styles.loading}>Loading admin profiles...</div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className={styles.manageProfilesContainer}>
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
    <div className={styles.manageProfilesContainer}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Manage Admin Profiles</h1>
        <div className={styles.headerActions}>
          <div className={styles.filterSection}>
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
          <button onClick={handleRefresh} className={styles.btnRefresh}>
            Refresh Data
          </button>
        </div>
      </div>

      {notification.message && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>{notification.message}</div>
      )}

      <div className={styles.createSection}>
        <h2>Create New Admin</h2>
        <form className={styles.adminForm} onSubmit={handleCreateAdmin}>
          <input
            type="text"
            name="org_name"
            placeholder="Organization Name"
            value={form.org_name}
            onChange={handleInputChange}
            required
            disabled={isCreating}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleInputChange}
            required
            disabled={isCreating}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleInputChange}
            required
            disabled={isCreating}
          />
          <div className={styles.roleDisplay}>
            <span className={styles.roleLabel}>Role: </span>
            <span className={styles.roleValue}>Admin</span>
          </div>
          <button type="submit" className={styles.btnCreate} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Admin"}
          </button>
        </form>
      </div>

      <div className={styles.adminStats}>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Admins:</span>
            <span className={styles.statValue}>{adminCounts.total}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Active:</span>
            <span className={`${styles.statValue} ${styles.activeCount}`}>{adminCounts.active}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Inactive:</span>
            <span className={`${styles.statValue} ${styles.inactiveCount}`}>{adminCounts.inactive}</span>
          </div>
        </div>
      </div>

      <div className={styles.adminCardsWrapper}>
        {filteredAdmins.length === 0 ? (
          <div className={styles.noData}>
            <p>
              {statusFilter === "all"
                ? "No admin profiles found. Create your first admin profile above."
                : `No ${statusFilter} admin profiles found.`}
            </p>
          </div>
        ) : (
          filteredAdmins.map((admin) => (
            <AdminCard
              key={admin.id}
              admin={admin}
              onUpdate={handleUpdateAdmin}
              onRemove={handleRemove}
              isRemoving={isRemoving}
              isUpdating={isUpdating}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default ManageProfiles

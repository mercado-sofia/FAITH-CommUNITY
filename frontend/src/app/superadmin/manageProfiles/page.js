'use client';

import React, { useState, useEffect } from "react";
import { 
  useGetAllAdminsQuery, 
  useCreateAdminMutation, 
  useUpdateAdminMutation, 
  useDeleteAdminMutation 
} from '../../../rtk/superadmin/manageProfilesApi';
import styles from '../styles/ManageProfiles.module.css';

const AdminCard = ({ admin, onUpdate, onDelete, isDeleting, isUpdating }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    org_name: admin.org_name,
    email: admin.email,
    password: '',
    role: admin.role
  });

  const handleInputChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm({
      org_name: admin.org_name,
      email: admin.email,
      password: '',
      role: admin.role
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await onUpdate({ id: admin.id, ...editForm });
      setIsEditing(false);
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      org_name: admin.org_name,
      email: admin.email,
      password: '',
      role: admin.role
    });
  };

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
            <select
              name="role"
              value={editForm.role}
              onChange={handleInputChange}
              disabled={isUpdating}
              className={styles.editSelect}
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          
          <div className={styles.editActions}>
            <button 
              type="submit" 
              className={styles.btnSave}
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
            <button 
              type="button" 
              className={styles.btnCancel}
              onClick={handleCancel}
              disabled={isUpdating}
            >
              Cancel
            </button>
          </div>
          
          <div className={styles.editNote}>
            <small>Created: {new Date(admin.created_at).toLocaleString()}</small>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.adminCard}>
      <div className={styles.cardHeader}>
        <h2>{admin.org_name}</h2>
        <span className={`${styles.roleTag} ${styles[admin.role]}`}>
          {admin.role}
        </span>
      </div>
      
      <div className={styles.cardContent}>
        <p><strong>Email:</strong> {admin.email}</p>
        <p><strong>Created:</strong> {new Date(admin.created_at).toLocaleString()}</p>
      </div>
      
      <div className={styles.cardActions}>
        <button 
          onClick={handleEdit} 
          className={styles.btnEdit}
          disabled={isDeleting || isUpdating}
        >
          Edit
        </button>
        <button 
          onClick={() => onDelete(admin.id)} 
          className={styles.btnDelete}
          disabled={isDeleting || isUpdating}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

const ManageProfiles = () => {
  const [form, setForm] = useState({ org_name: "", email: "", password: "", role: "admin" });
  const [notification, setNotification] = useState({ message: '', type: '' });
  
  // RTK Query hooks
  const { 
    data: admins = [], 
    error: fetchError, 
    isLoading: isFetching,
    refetch
  } = useGetAllAdminsQuery();
  
  const [createAdmin, { isLoading: isCreating }] = useCreateAdminMutation();
  const [updateAdmin, { isLoading: isUpdating }] = useUpdateAdminMutation();
  const [deleteAdmin, { isLoading: isDeleting }] = useDeleteAdminMutation();

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    try {
      await createAdmin(form).unwrap();
      showNotification('Admin created successfully!');
      setForm({ org_name: "", email: "", password: "", role: "admin" });
    } catch (error) {
      const errorMessage = error?.data?.error || error?.message || 'An error occurred';
      showNotification(errorMessage, 'error');
      console.error('Error:', error);
    }
  };

  const handleUpdateAdmin = async (updateData) => {
    try {
      // If password is empty, remove it from the update data
      if (!updateData.password || updateData.password.trim() === '') {
        const { password, ...dataWithoutPassword } = updateData;
        await updateAdmin(dataWithoutPassword).unwrap();
      } else {
        await updateAdmin(updateData).unwrap();
      }
      showNotification('Admin updated successfully!');
    } catch (error) {
      const errorMessage = error?.data?.error || error?.message || 'Failed to update admin';
      showNotification(errorMessage, 'error');
      console.error('Update error:', error);
      throw error; // Re-throw to handle in the card component
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) {
      return;
    }
    
    try {
      await deleteAdmin(id).unwrap();
      showNotification('Admin deleted successfully!');
    } catch (error) {
      const errorMessage = error?.data?.error || error?.message || 'Failed to delete admin';
      showNotification(errorMessage, 'error');
      console.error('Delete error:', error);
    }
  };

  const handleRefresh = () => {
    refetch();
    showNotification('Data refreshed!');
  };

  // Loading state
  if (isFetching) {
    return (
      <div className={styles.manageProfilesContainer}>
        <div className={styles.loading}>Loading admin profiles...</div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className={styles.manageProfilesContainer}>
        <div className={styles.error}>
          <h2>Error loading admin profiles</h2>
          <p>{fetchError?.data?.error || fetchError?.message || 'Failed to fetch data'}</p>
          <button onClick={handleRefresh} className={styles.btnRefresh}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.manageProfilesContainer}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Manage Admin Profiles</h1>
        <button onClick={handleRefresh} className={styles.btnRefresh}>
          Refresh Data
        </button>
      </div>

      {/* Notification */}
      {notification.message && (
        <div className={`${styles.notification} ${styles[notification.type]}`}>
          {notification.message}
        </div>
      )}

      {/* Create Admin Form */}
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
          <select 
            name="role" 
            value={form.role} 
            onChange={handleInputChange}
            disabled={isCreating}
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
          
          <button 
            type="submit" 
            className={styles.btnCreate}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create Admin"}
          </button>
        </form>
      </div>

      <div className={styles.adminStats}>
        <p>Total Admins: {admins.length}</p>
      </div>

      <div className={styles.adminCardsWrapper}>
        {admins.length === 0 ? (
          <div className={styles.noData}>
            <p>No admin profiles found. Create your first admin profile above.</p>
          </div>
        ) : (
          admins.map((admin) => (
            <AdminCard 
              key={admin.id} 
              admin={admin} 
              onUpdate={handleUpdateAdmin}
              onDelete={handleDelete}
              isDeleting={isDeleting}
              isUpdating={isUpdating}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ManageProfiles;
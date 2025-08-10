'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  useGetAdminByIdQuery,
  useUpdateAdminMutation,
} from '../../../rtk/superadmin/manageProfilesApi';
import { selectCurrentAdmin, selectIsAuthenticated } from '../../../rtk/superadmin/adminSlice';
import styles from './adminSettings.module.css';

export default function AdminSettings() {
  const dispatch = useDispatch();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  // Get admin data from API
  const { data: adminFromApi, isLoading: isLoadingAdmin, refetch } = useGetAdminByIdQuery(
    currentAdmin?.id,
    { skip: !currentAdmin?.id }
  );
  
  const [updateAdmin, { isLoading: isUpdating }] = useUpdateAdminMutation();

  const [adminData, setAdminData] = useState({
    org: '',
    orgName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    status: 'ACTIVE'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [errors, setErrors] = useState({});

  // Initialize admin data when API data is loaded
  useEffect(() => {
    if (adminFromApi) {
      setAdminData({
        org: adminFromApi.org || '',
        orgName: adminFromApi.orgName || '',
        email: adminFromApi.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        status: adminFromApi.status || 'ACTIVE'
      });
    } else if (currentAdmin) {
      // Fallback to current admin data from Redux
      setAdminData({
        org: currentAdmin.org || '',
        orgName: currentAdmin.orgName || '',
        email: currentAdmin.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        status: currentAdmin.status || 'ACTIVE'
      });
    }
  }, [adminFromApi, currentAdmin]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAdminData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };



  const validatePasswordChange = () => {
    const newErrors = {};
    
    if (!adminData.currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!adminData.newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (adminData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }
    
    if (adminData.newPassword !== adminData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateProfile = () => {
    const newErrors = {};
    
    if (!adminData.org.trim()) {
      newErrors.org = 'Organization acronym is required';
    }
    
    if (!adminData.orgName.trim()) {
      newErrors.orgName = 'Organization name is required';
    }
    
    if (!adminData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(adminData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (validateProfile()) {
      try {
        const updateData = {
          org: adminData.org,
          orgName: adminData.orgName,
          email: adminData.email,
          role: 'admin', // Ensure role remains admin
          status: adminData.status
        };
        
        await updateAdmin({ 
          id: currentAdmin.id, 
          ...updateData 
        }).unwrap();
        
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
        setIsEditing(false);
        refetch(); // Refresh data
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } catch (error) {
        console.error('Failed to update profile:', error);
        setMessage({ 
          text: error.data?.message || 'Failed to update profile. Please try again.', 
          type: 'error' 
        });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
      }
    }
  };

  const handleChangePassword = async () => {
    if (validatePasswordChange()) {
      try {
        const updateData = {
          org: adminData.org,
          orgName: adminData.orgName,
          email: adminData.email,
          password: adminData.newPassword,
          role: 'admin',
          status: adminData.status
        };
        
        await updateAdmin({ 
          id: currentAdmin.id, 
          ...updateData 
        }).unwrap();
        
        setMessage({ text: 'Password changed successfully!', type: 'success' });
        setShowPasswordChange(false);
        setAdminData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } catch (error) {
        console.error('Failed to change password:', error);
        setMessage({ 
          text: error.data?.message || 'Failed to change password. Please try again.', 
          type: 'error' 
        });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowPasswordChange(false);
    setErrors({});
    setAdminData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
  };

  return (
    <div className={styles.mainArea}>
      <div className={styles.header}>
        <h1>Admin Settings</h1>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {isLoadingAdmin && (
        <div className={styles.loading}>
          Loading admin data...
        </div>
      )}

      <div className={styles.settingsContainer}>
        {/* Profile Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Profile Information</h2>
            {!isEditing && (
              <button 
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <div className={styles.editForm}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Organization Acronym</label>
                <input
                  type="text"
                  name="org"
                  value={adminData.org}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.org ? styles.inputError : ''}`}
                  placeholder="e.g., FAITH, FTL, FAHSS"
                  disabled={isUpdating}
                />
                {errors.org && <span className={styles.errorText}>{errors.org}</span>}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Organization Name</label>
                <input
                  type="text"
                  name="orgName"
                  value={adminData.orgName}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.orgName ? styles.inputError : ''}`}
                  placeholder="Full organization name"
                  disabled={isUpdating}
                />
                {errors.orgName && <span className={styles.errorText}>{errors.orgName}</span>}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={adminData.email}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  placeholder="admin@organization.org"
                  disabled={isUpdating}
                />
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>

              <div className={styles.actionButtons}>
                <button 
                  className={styles.saveButton}
                  onClick={handleSaveProfile}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  className={styles.cancelButton}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.profileContent}>
              <div className={styles.profileFields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Organization Acronym</label>
                  <div className={styles.displayValue}>{adminData.org}</div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Organization Name</label>
                  <div className={styles.displayValue}>{adminData.orgName}</div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Email Address</label>
                  <div className={styles.displayValue}>{adminData.email}</div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Account Status</label>
                  <div className={`${styles.statusBadge} ${styles[adminData.status.toLowerCase()]}`}>
                    {adminData.status}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Password Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Password & Security</h2>
          {!showPasswordChange && (
            <button 
              className={styles.editButton}
              onClick={() => setShowPasswordChange(true)}
            >
              Change Password
            </button>
          )}
        </div>

        {showPasswordChange ? (
          <div className={styles.passwordForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Current Password</label>
              <input
                type="password"
                name="currentPassword"
                value={adminData.currentPassword}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.currentPassword ? styles.inputError : ''}`}
                placeholder="Enter your current password"
                disabled={isUpdating}
              />
              {errors.currentPassword && <span className={styles.errorText}>{errors.currentPassword}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={adminData.newPassword}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.newPassword ? styles.inputError : ''}`}
                placeholder="Enter your new password"
                disabled={isUpdating}
              />
              {errors.newPassword && <span className={styles.errorText}>{errors.newPassword}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={adminData.confirmPassword}
                onChange={handleInputChange}
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                placeholder="Confirm your new password"
                disabled={isUpdating}
              />
              {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
            </div>

            <div className={styles.actionButtons}>
              <button 
                className={styles.saveButton}
                onClick={handleChangePassword}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : 'Update Password'}
              </button>
              <button 
                className={styles.cancelButton}
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.passwordInfo}>
            <p className={styles.infoText}>
              Password last changed: <strong>30 days ago</strong>
            </p>
            <p className={styles.infoText}>
              For security purposes, we recommend changing your password regularly.
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

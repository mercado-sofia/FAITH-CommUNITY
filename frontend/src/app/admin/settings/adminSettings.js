'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaEdit, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import {
  useGetAdminByIdQuery,
  useUpdateAdminMutation,
  useVerifyPasswordForEmailChangeMutation,
  useVerifyPasswordForPasswordChangeMutation,
} from '../../../rtk/superadmin/manageProfilesApi';
import { selectCurrentAdmin, updateAdminEmail } from '../../../rtk/superadmin/adminSlice';
import styles from './adminSettings.module.css';

// Separate component for password change functionality
const PasswordChangeForm = ({ adminId, onCancel, onSuccess }) => {
  const [updateAdmin, { isLoading: isUpdating }] = useUpdateAdminMutation();
  const [verifyPasswordForPasswordChange, { isLoading: isVerifyingPassword }] = useVerifyPasswordForPasswordChangeMutation();
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Password visibility states
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (fieldName) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const validatePasswordChange = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (validatePasswordChange()) {
      try {
        // First verify the current password
        try {
          await verifyPasswordForPasswordChange({
            id: adminId,
            currentPassword: passwordData.currentPassword
          }).unwrap();
        } catch (error) {
          setMessage({
            text: 'Invalid current password. Please try again.',
            type: 'error'
          });
          setTimeout(() => setMessage({ text: '', type: '' }), 5000);
          return;
        }

        // If password verification succeeds, proceed with password update
        const updateData = {
          password: passwordData.newPassword,
          role: 'admin',
          status: 'ACTIVE'
        };
        
        await updateAdmin({ 
          id: adminId, 
          ...updateData 
        }).unwrap();
        
        setMessage({ text: 'Password changed successfully!', type: 'success' });
        setTimeout(() => {
          setMessage({ text: '', type: '' });
          onSuccess();
        }, 3000);
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
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordVisibility({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false
    });
    setErrors({});
    setMessage({ text: '', type: '' });
    onCancel();
  };

  return (
    <div className={styles.passwordForm}>
      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}
      
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Current Password</label>
        <div className={styles.passwordInputContainer}>
          <input
            type={passwordVisibility.currentPassword ? "text" : "password"}
            name="currentPassword"
            value={passwordData.currentPassword}
            onChange={handlePasswordInputChange}
            className={`${styles.input} ${styles.passwordInput} ${errors.currentPassword ? styles.inputError : ''}`}
            placeholder="Enter your current password"
            disabled={isUpdating || isVerifyingPassword}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => togglePasswordVisibility('currentPassword')}
            disabled={isUpdating || isVerifyingPassword}
          >
            {passwordVisibility.currentPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {errors.currentPassword && <span className={styles.errorText}>{errors.currentPassword}</span>}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>New Password</label>
        <div className={styles.passwordInputContainer}>
          <input
            type={passwordVisibility.newPassword ? "text" : "password"}
            name="newPassword"
            value={passwordData.newPassword}
            onChange={handlePasswordInputChange}
            className={`${styles.input} ${styles.passwordInput} ${errors.newPassword ? styles.inputError : ''}`}
            placeholder="Enter your new password"
            disabled={isUpdating || isVerifyingPassword}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => togglePasswordVisibility('newPassword')}
            disabled={isUpdating || isVerifyingPassword}
          >
            {passwordVisibility.newPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {errors.newPassword && <span className={styles.errorText}>{errors.newPassword}</span>}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Confirm New Password</label>
        <div className={styles.passwordInputContainer}>
          <input
            type={passwordVisibility.confirmPassword ? "text" : "password"}
            name="confirmPassword"
            value={passwordData.confirmPassword}
            onChange={handlePasswordInputChange}
            className={`${styles.input} ${styles.passwordInput} ${errors.confirmPassword ? styles.inputError : ''}`}
            placeholder="Confirm your new password"
            disabled={isUpdating || isVerifyingPassword}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => togglePasswordVisibility('confirmPassword')}
            disabled={isUpdating || isVerifyingPassword}
          >
            {passwordVisibility.confirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
      </div>

      <div className={styles.actionButtons}>
        <button 
          className={styles.saveButton}
          onClick={handleChangePassword}
          disabled={isUpdating || isVerifyingPassword}
        >
          {isUpdating ? 'Updating...' : isVerifyingPassword ? 'Verifying...' : 'Update Password'}
        </button>
        <button 
          className={styles.cancelButton}
          onClick={handleCancel}
          disabled={isUpdating || isVerifyingPassword}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default function AdminSettings() {
  const dispatch = useDispatch();
  const currentAdmin = useSelector(selectCurrentAdmin);
  
  // Get admin data from API
  const { data: adminFromApi, isLoading: isLoadingAdmin, error: apiError, refetch } = useGetAdminByIdQuery(
    currentAdmin?.id,
    { 
      skip: !currentAdmin?.id,
      // Retry on failure
      retry: 3,
      // Don't refetch on window focus if we have data
      refetchOnWindowFocus: false
    }
  );

  // Use currentAdmin as primary source, API as enhancement
  // If API returns empty email but Redux has it, use Redux data
  const effectiveAdminData = adminFromApi ? {
    ...adminFromApi,
    email: adminFromApi.email || currentAdmin?.email || ''
  } : currentAdmin;

  const [updateAdmin, { isLoading: isUpdating }] = useUpdateAdminMutation();
  const [verifyPassword, { isLoading: isVerifying }] = useVerifyPasswordForEmailChangeMutation();

  const [adminData, setAdminData] = useState({
    org: '',
    orgName: '',
    email: '',
    emailChangePassword: '', // New field for email change password verification
    status: 'ACTIVE'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [errors, setErrors] = useState({});
  
  // Password visibility state for email change
  const [emailPasswordVisibility, setEmailPasswordVisibility] = useState(false);

  // Helper function to check if email has changed
  const hasEmailChanged = () => {
    // Get the original email from the most reliable source
    const originalEmail = effectiveAdminData?.email || '';
    return adminData.email !== originalEmail;
  };

  // Initialize admin data when API data is loaded
  useEffect(() => {
    if (effectiveAdminData) {
      setAdminData({
        org: effectiveAdminData.org || '',
        orgName: effectiveAdminData.orgName || '',
        email: effectiveAdminData.email || '',
        emailChangePassword: '', // Clear email change password
        status: effectiveAdminData.status || 'ACTIVE'
      });
    } else {
      // Set default values to prevent null errors
      setAdminData({
        org: '',
        orgName: '',
        email: '',
        emailChangePassword: '',
        status: 'ACTIVE'
      });
    }
  }, [adminFromApi, currentAdmin]);

  // Clear email change password on mount
  useEffect(() => {
    setAdminData(prev => ({ ...prev, emailChangePassword: '' }));
  }, []);

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

  // Toggle email password visibility
  const toggleEmailPasswordVisibility = () => {
    setEmailPasswordVisibility(prev => !prev);
  };

  const validateProfile = () => {
    const newErrors = {};
    
    if (!adminData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(adminData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Check if email has changed and require password verification
    if (hasEmailChanged()) {
      if (!adminData.emailChangePassword.trim()) {
        newErrors.emailChangePassword = 'Current password is required to change email address';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (validateProfile()) {
      try {
        // If email has changed, verify password first
        if (hasEmailChanged()) {
          try {
            await verifyPassword({
              id: currentAdmin.id,
              currentPassword: adminData.emailChangePassword
            }).unwrap();
          } catch (error) {
            setMessage({
              text: 'Invalid current password. Please try again.',
              type: 'error'
            });
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
            return;
          }
        }

        const updateData = {
          email: adminData.email,
          role: 'admin', // Ensure role remains admin
          status: adminData.status
        };
        
        await updateAdmin({ 
          id: currentAdmin.id, 
          ...updateData 
        }).unwrap();
        
        // Update Redux store with new email
        if (hasEmailChanged()) {
          dispatch(updateAdminEmail({ email: adminData.email }));
        }
        
        setMessage({ text: 'Email updated successfully!', type: 'success' });
        setIsEditing(false);
        setAdminData(prev => ({ ...prev, emailChangePassword: '' })); // Clear password field
        refetch(); // Refresh data
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } catch (error) {
        console.error('Failed to update profile:', error);
        setMessage({ 
          text: error.data?.message || 'Failed to update email. Please try again.', 
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
    setEmailPasswordVisibility(false); // Reset email password visibility
    setAdminData(prev => ({
      ...prev,
      emailChangePassword: '' // Clear email change password field
    }));
  };

  const handlePasswordChangeSuccess = () => {
    setShowPasswordChange(false);
    setMessage({ text: 'Password changed successfully!', type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  return (
    <div className={styles.mainArea}>
      <div className={styles.header}>
        <h1>Settings</h1>
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

      {apiError && (
        <div className={`${styles.message} ${styles.error}`}>
          <strong>Error loading admin data:</strong> {apiError?.data?.message || apiError?.message || 'Unknown error'}
          <button 
            onClick={() => refetch()} 
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      )}

      <div className={styles.settingsGrid}>
        {/* Email Settings Panel */}
        <div className={styles.settingsPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelIcon}>
              <FaEnvelope />
            </div>
            <div className={styles.panelTitle}>
              <h2>Email Address</h2>
              <p>Update your email address for notifications and login</p>
            </div>
            {!isEditing && (
              <button 
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
              >
                <FaEdit />
                Edit
              </button>
            )}
          </div>

          <div className={styles.panelContent}>
            {isEditing ? (
              <div className={styles.editForm}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={adminData.email}
                    onChange={handleInputChange}
                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                    placeholder="admin@organization.org"
                    disabled={isUpdating || isVerifying}
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                {/* Password verification field - only show when email has changed */}
                {hasEmailChanged() && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      Current Password <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.passwordInputContainer}>
                      <input
                        type={emailPasswordVisibility ? "text" : "password"}
                        name="emailChangePassword"
                        value={adminData.emailChangePassword}
                        onChange={handleInputChange}
                        className={`${styles.input} ${styles.passwordInput} ${errors.emailChangePassword ? styles.inputError : ''}`}
                        placeholder="Enter your current password"
                        disabled={isUpdating || isVerifying}
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={toggleEmailPasswordVisibility}
                        disabled={isUpdating || isVerifying}
                      >
                        {emailPasswordVisibility ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.emailChangePassword && <span className={styles.errorText}>{errors.emailChangePassword}</span>}
                    <div className={styles.helperText}>
                      Required to confirm email change
                    </div>
                  </div>
                )}

                <div className={styles.actionButtons}>
                  <button 
                    className={styles.saveButton}
                    onClick={handleSaveProfile}
                    disabled={isUpdating || isVerifying}
                  >
                    {isUpdating ? 'Saving...' : isVerifying ? 'Verifying...' : 'Save Changes'}
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
              <div className={styles.displayContent}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Current Email</label>
                  <div className={styles.displayValue}>{adminData.email}</div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Account Status</label>
                  <div className={`${styles.statusBadge} ${styles[adminData.status.toLowerCase()]}`}>
                    {adminData.status}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Password Settings Panel */}
        <div className={styles.settingsPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelIcon}>
              <FaLock />
            </div>
            <div className={styles.panelTitle}>
              <h2>Password & Security</h2>
              <p>Change your password and manage security settings</p>
            </div>
            {!showPasswordChange && (
              <button 
                className={styles.editButton}
                onClick={() => setShowPasswordChange(true)}
              >
                Change
              </button>
            )}
          </div>

          <div className={styles.panelContent}>
            {showPasswordChange ? (
              <PasswordChangeForm
                adminId={currentAdmin?.id}
                onCancel={() => setShowPasswordChange(false)}
                onSuccess={handlePasswordChangeSuccess}
              />
            ) : (
              <div className={styles.displayContent}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Password Status</label>
                  <div className={styles.passwordInfo}>
                    <p className={styles.infoText}>
                      Last changed: <strong>30 days ago</strong>
                    </p>
                    <p className={styles.infoText}>
                      For security, we recommend changing your password regularly.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { FaBuilding, FaTimes, FaSpinner, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './styles/OrgProfileEditModal.module.css';
import SuccessModal from '../../components/SuccessModal';

export default function OrgProfileEditModal({ 
  isOpen, 
  onClose, 
  onSave, 
  orgData,
  errors = {},
  saving = false
}) {
  const [editData, setEditData] = useState({
    email: orgData?.email || ''
  });
  const [modalMode, setModalMode] = useState('profile'); // 'profile' or 'password'
  const [isVerifying, setIsVerifying] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Reset form data when modal opens or orgData changes
  useEffect(() => {
    if (isOpen) {
      setEditData({
        email: orgData?.email || ''
      });
      setModalMode('profile');
      setIsVerifying(false);
      setPassword('');
      setPasswordVisibility(false);
      setPasswordError('');
      setShowSuccessModal(false); // Reset success modal state
    }
  }, [isOpen, orgData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = name === 'email' ? value.trim().toLowerCase() : value;
    
    setEditData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!editData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (Object.keys(newErrors).length > 0) {
      // If there are validation errors, don't proceed
      return;
    }

    // Check if there are actual changes
    const hasChanges = editData.email !== orgData?.email;

    if (hasChanges) {
      // Switch to password confirmation mode
      setModalMode('password');
    } else {
      // No changes, just close the modal
      onClose();
    }
  };

  const handlePasswordConfirm = async () => {
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }

    try {
      setIsVerifying(true);
      setPasswordError('');
      
      // Verify password first
      const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/admin/profile/verify-password-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ password })
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}));
        if (verifyResponse.status === 401) {
          throw new Error('Incorrect password. Please try again.');
        } else {
          throw new Error(errorData.message || 'Password verification failed');
        }
      }

      // Call onSave with the data including password
      await onSave({
        ...editData,
        password: password
      });
      
      // Close modal and show success
      onClose();
      setShowSuccessModal(true);
      
    } catch (error) {
      setPasswordError(error.message || 'Password verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    // Reset form data to original values
    setEditData({
      email: orgData?.email || ''
    });
    setModalMode('profile');
    setIsVerifying(false);
    setPassword('');
    setPasswordVisibility(false);
    setPasswordError('');
    setShowSuccessModal(false); // Reset success modal state
    onClose();
  };

  const handleBackToProfile = () => {
    setModalMode('profile');
    setPassword('');
    setPasswordVisibility(false);
    setPasswordError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (passwordError) {
      setPasswordError('');
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisibility(prev => !prev);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              {modalMode === 'profile' ? <FaBuilding /> : <FaLock />}
            </div>
            <div className={styles.headerText}>
              <h2>{modalMode === 'profile' ? 'Edit Email Address' : 'Confirm Password'}</h2>
              <p>{modalMode === 'profile' ? 'Update your email address' : 'Enter your current password to confirm the changes'}</p>
            </div>
          </div>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={saving || isVerifying}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalContent}>
          {modalMode === 'profile' ? (
            <form onSubmit={handleSubmit}>
              {errors?.general && (
                <div className={`${styles.message} ${styles.error}`}>
                  {errors.general}
                </div>
              )}


              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Email Address <span className={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={editData.email}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors?.email ? styles.inputError : ''}`}
                  placeholder="admin@organization.org"
                  disabled={saving}
                />
                {errors?.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>

              <div className={styles.actionButtons}>
                <button 
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={styles.saveButton}
                  disabled={saving}
                >
                  {saving ? <FaSpinner className={styles.spinner} /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordConfirm(); }}>
              {passwordError && (
                <div className={`${styles.message} ${styles.error}`}>
                  {passwordError}
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Current Password <span className={styles.required}>*</span>
                </label>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={passwordVisibility ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    className={`${styles.input} ${styles.passwordInput} ${passwordError ? styles.inputError : ''}`}
                    placeholder="Enter your current password"
                    disabled={isVerifying}
                    autoFocus
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={togglePasswordVisibility}
                    disabled={isVerifying}
                    tabIndex={-1}
                  >
                    {passwordVisibility ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <div className={styles.helperText}>
                  Required to confirm any changes to your profile
                </div>
              </div>

              <div className={styles.actionButtons}>
                <button 
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleBackToProfile}
                  disabled={isVerifying}
                >
                  Back
                </button>
                <button 
                  type="submit"
                  className={styles.saveButton}
                  disabled={isVerifying}
                >
                  {isVerifying ? <FaSpinner className={styles.spinner} /> : null}
                  Confirm Changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {/* Success Modal - Always rendered, shown when needed */}
      <SuccessModal
        message="Email address updated successfully!"
        isVisible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        type="success"
        autoHideDuration={2000}
      />
    </div>
  );
}

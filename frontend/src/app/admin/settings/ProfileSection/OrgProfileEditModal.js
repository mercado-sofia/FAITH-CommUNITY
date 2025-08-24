'use client';

import { useState, useEffect } from 'react';
import { FaBuilding, FaTimes } from 'react-icons/fa';
import styles from './styles/OrgProfileEditModal.module.css';

export default function OrgProfileEditModal({ 
  isOpen, 
  onClose, 
  onSave, 
  orgData,
  errors = {},
  saving = false
}) {
  const [editData, setEditData] = useState({
    org: orgData?.org || '',
    orgName: orgData?.orgName || '',
    email: orgData?.email || ''
  });

  // Reset form data when modal opens or orgData changes
  useEffect(() => {
    if (isOpen) {
      setEditData({
        org: orgData?.org || '',
        orgName: orgData?.orgName || '',
        email: orgData?.email || ''
      });
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
    if (!editData.org?.trim()) {
      newErrors.org = 'Organization acronym is required';
    }
    if (!editData.orgName?.trim()) {
      newErrors.orgName = 'Organization name is required';
    }
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
    const hasChanges = editData.org !== orgData?.org || 
                      editData.orgName !== orgData?.orgName || 
                      editData.email !== orgData?.email;

    if (hasChanges) {
      // Call onSave with the data - this will trigger the password confirmation modal
      await onSave(editData);
    } else {
      // No changes, just close the modal
      onClose();
    }
  };

  const handleClose = () => {
    // Reset form data to original values
    setEditData({
      org: orgData?.org || '',
      orgName: orgData?.orgName || '',
      email: orgData?.email || ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <FaBuilding />
            </div>
            <div className={styles.headerText}>
              <h2>Edit Organization Profile</h2>
              <p>Update your organization's basic information and email</p>
            </div>
          </div>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            disabled={saving}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.modalContent}>
          <form onSubmit={handleSubmit}>
            {errors?.general && (
              <div className={`${styles.message} ${styles.error}`}>
                {errors.general}
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Organization Acronym <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="org"
                value={editData.org}
                onChange={handleInputChange}
                className={`${styles.input} ${errors?.org ? styles.inputError : ''}`}
                placeholder="e.g., FAITH"
                disabled={saving}
                autoFocus
              />
              {errors?.org && <span className={styles.errorText}>{errors.org}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Organization Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="orgName"
                value={editData.orgName}
                onChange={handleInputChange}
                className={`${styles.input} ${errors?.orgName ? styles.inputError : ''}`}
                placeholder="e.g., FAITH Community Organization"
                disabled={saving}
              />
              {errors?.orgName && <span className={styles.errorText}>{errors.orgName}</span>}
            </div>

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
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

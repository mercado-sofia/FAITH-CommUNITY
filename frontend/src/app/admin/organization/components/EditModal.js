'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { FaCamera } from 'react-icons/fa'
import styles from './styles/EditModal.module.css'

export default function EditModal({
  isOpen,
  orgData,
  setOrgData,
  errors,
  uploading,
  handleInputChange,
  handleFileUpload,
  handleSave,
  handleCancel,
  saving,
  modalMessage,
  setModalMessage
}) {
  // Auto-clear modal message after 3 seconds
  useEffect(() => {
    if (modalMessage?.text) {
      const timer = setTimeout(() => {
        setModalMessage({ text: "", type: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [modalMessage, setModalMessage]);
  // Clear modal message when modal closes
  useEffect(() => {
    if (!isOpen) {
      setModalMessage({ text: "", type: "" });
    }
  }, [isOpen, setModalMessage]);

  // Lock body scroll when modal is open to prevent background shifting
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Lock body scroll and maintain position
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore body scroll and position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Account Details</h2>
          <button 
            className={styles.closeButton}
            onClick={handleCancel}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* Modal Message */}
          {modalMessage?.text && (
            <div className={`${styles.modalMessage} ${styles[modalMessage.type]}`}>
              {modalMessage.text}
            </div>
          )}
          
          {/* Main Content Area */}
          <div className={styles.mainContent}>
            {/* Profile Photo Section */}
            <div className={styles.profileSection}>
              <div className={styles.profileImageContainer}>
                {orgData.logo ? (
                  <Image
                    src={orgData.logo}
                    alt="Organization Logo"
                    width={120}
                    height={120}
                    className={styles.profileImage}
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className={styles.profilePlaceholder}>
                    <FaCamera className={styles.cameraIcon} />
                  </div>
                )}
                <div className={styles.profileOverlay}>
                  <FaCamera className={styles.cameraIcon} />
                  <span className={styles.changeText}>Click to change photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className={styles.fileInput}
                  />
                </div>
              </div>
              {uploading && <span className={styles.uploadingText}>Uploading...</span>}
            </div>

            {/* Form Fields */}
            <div className={styles.formSection}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Organization Acronym <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="org"
                  value={orgData.org}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.org ? styles.inputError : ""}`}
                  placeholder="e.g., FAITH"
                />
                {errors.org && <span className={styles.errorText}>{errors.org}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Organization Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="orgName"
                  value={orgData.orgName}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.orgName ? styles.inputError : ""}`}
                  placeholder="e.g., FAITH Community Organization"
                />
                {errors.orgName && <span className={styles.errorText}>{errors.orgName}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={orgData.email}
                  disabled
                  className={`${styles.input} ${styles.disabledInput}`}
                  placeholder="Email is managed in Admin Settings"
                />
                <span className={styles.helperText}>Email is managed in Admin Settings</span>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Facebook Link:</label>
                <input
                  type="url"
                  name="facebook"
                  value={orgData.facebook}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.facebook ? styles.inputError : ""}`}
                  placeholder="https://facebook.com/yourorganization"
                />
                {errors.facebook && <span className={styles.errorText}>{errors.facebook}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description:</label>
                <textarea
                  name="description"
                  value={orgData.description}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Brief description of your organization"
                  rows={4}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.buttonSection}>
              <button 
                onClick={handleCancel}
                className={styles.cancelButton}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className={styles.saveButton}
                disabled={saving || uploading}
              >
                {saving ? (
                  <>
                    <span className={styles.spinner}></span>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

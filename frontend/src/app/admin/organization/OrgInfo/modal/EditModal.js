'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { FaCamera } from 'react-icons/fa'
import { getOrganizationImageUrl } from '@/utils/uploadPaths'
import { useModalScrollLock, useModalMessage, useFormChanges } from '../../hooks'
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
  setModalMessage,
  originalData
}) {
  // Use custom hooks for modal functionality
  useModalScrollLock(isOpen);
  const { modalMessage: localModalMessage, showMessage, clearMessage } = useModalMessage(isOpen);
  const { hasOrganizationChanges } = useFormChanges();

  // Check if any changes have been made
  const hasChanges = () => hasOrganizationChanges(originalData, orgData);

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Organization Details</h2>
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
            {/* Logo Section - Centered */}
            <div className={styles.logoSection}>
              <label className={styles.label}>Logo</label>
              <div className={styles.profileImageContainer}>
                {orgData.logo ? (
                  <Image
                    src={getOrganizationImageUrl(orgData.logo, 'logo')}
                    alt="Organization Logo"
                    width={200}
                    height={200}
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

                         {/* Organization Color Section - Right under logo */}
             <div className={styles.formSection}>
               <div className={styles.formGroup}>
                 <label className={styles.label}>
                   Organization Color <span className={styles.required}>*</span>
                 </label>
                 <div className={styles.colorPickerContainer}>
                   <input
                     type="color"
                     name="orgColor"
                     value={orgData.orgColor || "#444444"}
                     onChange={handleInputChange}
                     className={styles.colorPicker}
                   />
                   <span className={styles.colorValue}>{orgData.orgColor || "#444444"}</span>
                 </div>
                 <span className={styles.helperText}>This color will be your Organization&apos;s theme color</span>
               </div>
             </div>

             {/* Form Fields */}
             <div className={styles.formSection}>
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
          </div>
        </div>

        {/* Fixed Footer with Action Buttons */}
        <div className={styles.modalFooter}>
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
            disabled={saving || uploading || !hasChanges()}
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
  )
}

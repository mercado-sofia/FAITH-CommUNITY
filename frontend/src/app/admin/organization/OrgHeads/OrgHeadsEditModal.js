'use client'

import { useState, useEffect, useRef } from 'react'
import { FaPlus } from 'react-icons/fa'
import styles from './OrgHeadsEditModal.module.css'
import { sortHeadsByOrder } from './utils/roleHierarchy'
import { useOrgHeadForm, usePhotoUpload } from './hooks'
import { HeadFormRow } from './components'

export default function OrgHeadsEditModal({
  isOpen,
  orgHeadsData,
  setOrgHeadsData,
  handleSave,
  handleCancel,
  saving,
  originalData,
  isIndividualEdit = false
}) {
  // Use custom hooks for form and photo management
  const {
    localHeads,
    fieldErrors,
    validationErrors,
    setValidationErrors,
    handleInputChange,
    handleAddHead,
    handleRemoveHead,
    validateForm,
    hasChanges,
    resetForm,
    setHeads
  } = useOrgHeadForm();

  const {
    uploading,
    uploadProgress,
    uploadPhoto,
    resetUploadState
  } = usePhotoUpload();
  
  // Use ref to track previous data and prevent infinite loops
  const prevOrgHeadsDataRef = useRef(null)
  const isInitializedRef = useRef(false)

  // Simple initialization when modal opens
  useEffect(() => {
    if (isOpen && orgHeadsData && !isInitializedRef.current) {
      const sortedHeads = sortHeadsByOrder(orgHeadsData);
      setHeads(sortedHeads);
      isInitializedRef.current = true;
    } else if (!isOpen) {
      resetForm();
      isInitializedRef.current = false;
    }
  }, [isOpen, orgHeadsData, setHeads, resetForm])

  // Check if any changes have been made using the hook
  const checkHasChanges = () => hasChanges(originalData);

  if (!isOpen) return null

  const handlePhotoChange = (file, index) => {
    // Handle photo file selection
    if (file) {
      // For now, just store the file as base64 for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        handleInputChange(index, 'photo', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async (photoData, index, onSuccess) => {
    try {
      await uploadPhoto(photoData, index, onSuccess);
    } catch (error) {
      console.error('Photo upload failed:', error);
      setValidationErrors(prev => ({ 
        ...prev, 
        [index]: { 
          errors: [`Upload failed: ${error.message}`], 
          warnings: [] 
        }
      }));
    }
  };

  const handleSaveClick = () => {
    if (saving) return;
    
    if (typeof handleSave !== 'function') return;
    
    if (validateForm()) {
      try {
        let headsToSave;
        
        if (isIndividualEdit) {
          // For individual editing, preserve the original display_order
          headsToSave = localHeads.map(head => ({
            ...head,
            display_order: originalData[0]?.display_order || 1
          }));
        } else {
          // For bulk editing, update display_order sequentially
          headsToSave = localHeads.map((head, index) => ({
            ...head,
            display_order: index + 1
          }));
        }
        
        handleSave(headsToSave);
      } catch (error) {
        console.error('Error preparing heads for save:', error);
      }
    }
  };

  const handleCancelClick = () => {
    if (typeof handleCancel === 'function') {
      handleCancel();
    }
  };

    return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isIndividualEdit ? 'Edit Organization Head' : 'Edit Organization Heads'}
          </h2>
          <button
            className={styles.closeButton}
            onClick={handleCancelClick}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          {localHeads.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No organization heads to edit.</p>
              {!isIndividualEdit && (
              <button
                  type="button"
                onClick={handleAddHead}
                className={styles.addButton}
                disabled={saving}
              >
                <FaPlus /> Add First Head
              </button>
              )}
            </div>
          ) : (
            <>
              {localHeads.map((head, index) => (
                <HeadFormRow
                  key={`${head.id || 'new'}-${index}`}
                  head={head}
                  index={index}
                  fieldErrors={fieldErrors}
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                  onInputChange={handleInputChange}
                  onRemoveHead={handleRemoveHead}
                  onPhotoUpload={handlePhotoUpload}
                  onPhotoChange={handlePhotoChange}
                  isIndividualEdit={isIndividualEdit}
                />
              ))}
              
              {!isIndividualEdit && (
              <button
                  type="button"
                onClick={handleAddHead}
                  className={styles.addButton}
                disabled={saving}
              >
                <FaPlus /> Add Another Head
              </button>
              )}
            </>
          )}
        </div>

        {localHeads.length > 0 && (
        <div className={styles.footer}>
          <button
              type="button"
              onClick={handleCancelClick}
            className={styles.cancelButton}
            disabled={saving}
          >
            Cancel
          </button>
          <button
              type="button"
            onClick={handleSaveClick}
            className={styles.saveButton}
              disabled={saving || !checkHasChanges()}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}

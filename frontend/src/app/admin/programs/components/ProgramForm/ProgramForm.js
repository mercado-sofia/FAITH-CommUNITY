'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import { useProgramForm, useImageUpload, useCollaboration } from '../../hooks';
import { FormFields, ImageUpload, AdditionalImagesUpload, CollaboratorSection } from './components';
import { UnsaveChangesModal } from '../index';
import styles from './ProgramForm.module.css';

const ProgramForm = ({ mode = 'create', program = null, onCancel, onSubmit }) => {
  const isEditMode = mode === 'edit';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Use custom hooks
  const {
    formData,
    errors,
    hasChanges,
    isEditMode: formIsEditMode,
    updateFormData,
    validateForm,
    clearError,
    clearAllErrors,
    setFormData,
    setHasChanges
  } = useProgramForm(mode, program);

  const {
    imagePreview,
    additionalImagePreviews,
    dragActive,
    additionalDragActive,
    fileInputRef,
    additionalImagesRef,
    handleImageChange,
    handleAdditionalImagesChange,
    removeImage,
    removeAdditionalImage,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleAdditionalDragEnter,
    handleAdditionalDragLeave,
    handleAdditionalDragOver,
    handleAdditionalDrop,
    setImagePreview,
    setAdditionalImagePreviews
  } = useImageUpload();

  const {
    collaboratorInput,
    filteredAdmins,
    selectedAdminIndex,
    selectedAdminForInvite,
    handleCollaboratorInputChange,
    handleCollaboratorInputKeyDown,
    selectAdmin,
    clearCollaboratorInput,
    addCollaborator,
    removeCollaborator,
    loadExistingCollaborators
  } = useCollaboration(isEditMode, program?.id);

  // Initialize existing images in edit mode
  useEffect(() => {
    if (isEditMode && program) {
      // Set existing main image preview
      if (program.image && !imagePreview) {
        setImagePreview(getProgramImageUrl(program.image));
      }
      
      // Set existing additional images previews
      if (program.additional_images && program.additional_images.length > 0 && additionalImagePreviews.length === 0) {
        const existingPreviews = program.additional_images.map((imagePath, index) => ({
          id: `existing-${index}`,
          url: getProgramImageUrl(imagePath, 'additional'),
          name: `Additional Image ${index + 1}`
        }));
        setAdditionalImagePreviews(existingPreviews);
      }
    }
  }, [isEditMode, program, imagePreview, additionalImagePreviews.length, setImagePreview, setAdditionalImagePreviews]);

  // Load existing collaborators in edit mode
  useEffect(() => {
    if (isEditMode && program?.id) {
      loadExistingCollaborators((collaborators) => {
        updateFormData({ collaborators });
      });
    }
  }, [isEditMode, program?.id, loadExistingCollaborators, updateFormData]);

  // Also load collaborators from program data if available
  useEffect(() => {
    if (isEditMode && program?.collaborators && Array.isArray(program.collaborators)) {
      updateFormData({ collaborators: program.collaborators });
    }
  }, [isEditMode, program?.collaborators, updateFormData]);

  // Handle form data changes
  const handleFormDataChange = useCallback((updates) => {
    updateFormData(updates);
  }, [updateFormData]);

  // Handle image changes
  const handleImageChangeWrapper = useCallback(async (event) => {
    const result = await handleImageChange(event);
    if (result?.file) {
      // Store the base64 preview data instead of the File object
      updateFormData({ image: result.preview });
    } else if (result?.error) {
      updateFormData({ image: null });
      // Handle error display if needed
    }
  }, [handleImageChange, updateFormData]);

  // Handle additional images changes
  const handleAdditionalImagesChangeWrapper = useCallback(async (event) => {
    const results = await handleAdditionalImagesChange(event);
    // Store the base64 preview data instead of File objects
    const validPreviews = results.filter(result => result.preview).map(result => result.preview);
    if (validPreviews.length > 0) {
      updateFormData({ additionalImages: [...formData.additionalImages, ...validPreviews] });
    }
  }, [handleAdditionalImagesChange, updateFormData, formData.additionalImages]);

  // Handle remove additional image
  const handleRemoveAdditionalImage = useCallback((index) => {
    removeAdditionalImage(index);
    const newAdditionalImages = formData.additionalImages.filter((_, i) => i !== index);
    updateFormData({ additionalImages: newAdditionalImages });
  }, [removeAdditionalImage, formData.additionalImages, updateFormData]);

  // Handle collaborator actions
  const handleInviteCollaborator = useCallback(async () => {
    try {
      await addCollaborator(formData.collaborators, (newCollaborators) => {
        updateFormData({ collaborators: newCollaborators });
      });
    } catch (error) {
      console.error('Failed to add collaborator:', error);
      // You might want to show an error message to the user here
    }
  }, [addCollaborator, formData.collaborators, updateFormData]);

  const handleRemoveCollaborator = useCallback(async (index) => {
    try {
      await removeCollaborator(index, formData.collaborators, (newCollaborators) => {
        updateFormData({ collaborators: newCollaborators });
      });
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      // You might want to show an error message to the user here
    }
  }, [removeCollaborator, formData.collaborators, updateFormData]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    clearAllErrors();

    try {
      // Prepare form data for submission
      const submissionData = {
        ...formData,
        status: formData.status, // Status is calculated automatically
        // Transform collaborators from objects to just IDs for backend
        collaborators: Array.isArray(formData.collaborators) 
          ? formData.collaborators.map(collab => collab.id).filter(id => id)
          : []
      };

      // Handle existing images in edit mode
      if (isEditMode && program) {
        // Keep existing image if no new one is uploaded
        if (!formData.image && program.image) {
          submissionData.image = program.image;
        }
        // Keep existing additional images if no new ones are uploaded
        if (formData.additionalImages.length === 0 && program.additional_images) {
          submissionData.additionalImages = program.additional_images;
        }
      }

      await onSubmit(submissionData);
    } catch (error) {
      console.error('Form submission error:', error);
      updateFormData({ submit: error.message || 'Failed to submit form' });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, formData, isEditMode, program, onSubmit, clearAllErrors, updateFormData]);

  // Handle form key down
  const handleFormKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Handle close (for edit mode)
  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedModal(true);
      return;
    }
    onCancel();
  }, [hasChanges, onCancel]);

  // Handle unsaved changes modal actions
  const handleUnsavedModalConfirm = useCallback(() => {
    setShowUnsavedModal(false);
    onCancel();
  }, [onCancel]);

  const handleUnsavedModalCancel = useCallback(() => {
    setShowUnsavedModal(false);
  }, []);

  return (
    <form 
      onSubmit={isEditMode ? undefined : handleSubmit} 
      className={styles.form} 
      onKeyDown={handleFormKeyDown}
      noValidate={isEditMode}
    >
      <div className={styles.formLayout}>
        {/* Left Panel - Main Container */}
        <div className={styles.leftContainer}>
          {/* Form Fields Container */}
          <div className={styles.container}>
            <FormFields
              formData={formData}
              errors={errors}
              isEditMode={isEditMode}
              onFormDataChange={handleFormDataChange}
              onClearError={clearError}
            />
          </div>

          {/* Collaborator Section */}
          <CollaboratorSection
            isEditMode={isEditMode}
            collaboratorInput={collaboratorInput}
            filteredAdmins={filteredAdmins}
            selectedAdminIndex={selectedAdminIndex}
            selectedAdminForInvite={selectedAdminForInvite}
            collaborators={formData.collaborators}
            onCollaboratorInputChange={handleCollaboratorInputChange}
            onCollaboratorInputKeyDown={handleCollaboratorInputKeyDown}
            onSelectAdmin={selectAdmin}
            onClearCollaboratorInput={clearCollaboratorInput}
            onInviteCollaborator={handleInviteCollaborator}
            onRemoveCollaborator={handleRemoveCollaborator}
          />

          {/* Action Buttons */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={isEditMode ? handleClose : onCancel}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            
            <button
              type={isEditMode ? "button" : "submit"}
              onClick={isEditMode ? handleSubmit : undefined}
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? <FaSpinner className={styles.spinner} /> : null}
              {isEditMode ? "Update Program" : "Submit for Approval"}
            </button>
          </div>
              
          {/* Submit Error */}
          {errors.submit && (
            <div className={styles.submitError}>
              {errors.submit}
            </div>
          )}
        </div>

        {/* Right Panel - Images and Actions */}
        <div className={styles.rightPanel}>
          {/* Main Image Upload */}
          <ImageUpload
            title="Highlight Image"
            required={!isEditMode}
            imagePreview={imagePreview}
            dragActive={dragActive}
            fileInputRef={fileInputRef}
            onImageChange={handleImageChangeWrapper}
            onRemoveImage={removeImage}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            error={errors.image}
          />

          {/* Additional Images Upload */}
          <AdditionalImagesUpload
            additionalImagePreviews={additionalImagePreviews}
            additionalDragActive={additionalDragActive}
            additionalImagesRef={additionalImagesRef}
            formData={formData}
            onAdditionalImagesChange={handleAdditionalImagesChangeWrapper}
            onRemoveAdditionalImage={handleRemoveAdditionalImage}
            onAdditionalDragEnter={handleAdditionalDragEnter}
            onAdditionalDragLeave={handleAdditionalDragLeave}
            onAdditionalDragOver={handleAdditionalDragOver}
            onAdditionalDrop={handleAdditionalDrop}
            errors={errors}
          />
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <UnsaveChangesModal
        isOpen={showUnsavedModal}
        onConfirm={handleUnsavedModalConfirm}
        onCancel={handleUnsavedModalCancel}
      />
    </form>
  );
};

export default ProgramForm;

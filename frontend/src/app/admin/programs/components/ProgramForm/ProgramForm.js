'use client';

import { useState, useCallback, useEffect } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { getProgramImageUrl } from '@/utils/shared/uploadPaths';
import { useProgramForm } from '@/hooks/admin/useProgramForm';
import { useImageUpload } from '@/hooks/admin/useImageUpload';
import { useCollaboration } from '@/hooks/admin/useCollaboration';
import { FormFields, ImageUpload, AdditionalImagesUpload, CollaboratorSection } from './components';
import CustomDropdown from './components/CustomDropdown';
import { UnsaveChangesModal } from '../index';
import { ROLE_OPTIONS } from '@/utils/admin/roleHierarchy';
import logger from '@/utils/shared/logger';
import styles from './ProgramForm.module.css';

const ProgramForm = ({ mode = 'create', program = null, onCancel, onSubmit, onRefreshCollaborators, headerTitle }) => {
  const isEditMode = mode === 'edit';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [postActReportFile, setPostActReportFile] = useState(null);

  // Use custom hooks
  const {
    formData,
    errors,
    hasChanges,
    updateFormData,
    validateForm,
    clearError,
    clearAllErrors,
    resetForm
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
    setAdditionalImagePreviews,
    resetImageUploads
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
    loadExistingCollaborators,
    refreshCollaborators,
    resetCollaboration,
    sendInvitesForNewCollaborators
  } = useCollaboration(isEditMode, program?.id);

  // State for custom role input (only shown when "Others" is selected)
  const [customRole, setCustomRole] = useState('');
  // State for custom edited role input (for edit mode)
  const [customEditedRole, setCustomEditedRole] = useState('');

  // Handle role change
  const handleRoleChange = useCallback((selectedRole) => {
    if (selectedRole === 'Others') {
      updateFormData({ submitted_by_role: 'Others' });
      setCustomRole('');
    } else {
      updateFormData({ submitted_by_role: selectedRole });
      setCustomRole('');
    }
    
    // Clear role error when user selects a role
    if (errors.submitted_by_role) clearError('submitted_by_role');
  }, [updateFormData, errors.submitted_by_role, clearError]);

  // Handle custom role change
  const handleCustomRoleChange = useCallback((value) => {
    setCustomRole(value);
    // Update formData with custom role
    updateFormData({ submitted_by_role: value });
    
    // Clear role error when user starts typing
    if (errors.submitted_by_role) clearError('submitted_by_role');
  }, [updateFormData, errors.submitted_by_role, clearError]);

  // Handle edited role change (for edit mode)
  const handleEditedRoleChange = useCallback((selectedRole) => {
    if (selectedRole === 'Others') {
      updateFormData({ edited_by_role: 'Others' });
      setCustomEditedRole(''); // Clear when "Others" is selected so admin can input fresh
    } else {
      updateFormData({ edited_by_role: selectedRole });
      setCustomEditedRole('');
    }
  }, [updateFormData]);

  // Handle custom edited role change (for edit mode)
  const handleCustomEditedRoleChange = useCallback((value) => {
    setCustomEditedRole(value);
    // Update formData with custom role
    updateFormData({ edited_by_role: value });
  }, [updateFormData]);

  // Initialize custom role if existing role is not in predefined options
  useEffect(() => {
    if (formData.submitted_by_role && !ROLE_OPTIONS.find(option => option.value === formData.submitted_by_role)) {
      setCustomRole(formData.submitted_by_role);
    } else {
      setCustomRole('');
    }
  }, [formData.submitted_by_role]);

  // Initialize custom edited role if existing role is not in predefined options (for edit mode)
  // Note: edited_by_role is always reset to empty on form open, so this only handles user input
  useEffect(() => {
    if (isEditMode && formData.edited_by_role && !ROLE_OPTIONS.find(option => option.value === formData.edited_by_role)) {
      setCustomEditedRole(formData.edited_by_role);
    } else if (isEditMode && formData.edited_by_role === 'Others') {
      setCustomEditedRole(''); // Leave blank when "Others" is selected
    } else {
      setCustomEditedRole('');
    }
  }, [formData.edited_by_role, isEditMode]);
  
  // Reset customEditedRole when edit mode is entered (form opens)
  useEffect(() => {
    if (isEditMode) {
      setCustomEditedRole('');
    }
  }, [isEditMode, program?.id]); // Reset when entering edit mode or when program changes

  // Initialize existing images in edit mode
  useEffect(() => {
    if (isEditMode && program) {
      // Set existing main image preview
      if (program.image && !imagePreview) {
        setImagePreview(getProgramImageUrl(program.image));
      }
      
      // Set existing additional images previews AND form data
      if (program.additional_images && program.additional_images.length > 0) {
        // Initialize previews if not already set
        if (additionalImagePreviews.length === 0) {
          const existingPreviews = program.additional_images.map((imagePath, index) => ({
            id: `existing-${index}`,
            url: getProgramImageUrl(imagePath, 'additional'),
            name: `Additional Image ${index + 1}`
          }));
          setAdditionalImagePreviews(existingPreviews);
        }
        
        // Always initialize formData.additionalImages with existing Cloudinary URLs if it's empty
        // This ensures existing images are preserved when updating
        if (!formData.additionalImages || formData.additionalImages.length === 0) {
          const existingImageUrls = program.additional_images.map(imagePath => {
            // Check if it's already a full URL or needs the helper function
            if (imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
              return imagePath;
            }
            return getProgramImageUrl(imagePath, 'additional');
          });
          updateFormData({ additionalImages: existingImageUrls });
        }
      }
    }
  }, [isEditMode, program, imagePreview, additionalImagePreviews.length, formData.additionalImages, setImagePreview, setAdditionalImagePreviews, updateFormData]);

  // Load existing collaborators in edit mode
  useEffect(() => {
    if (isEditMode && program?.id) {
      loadExistingCollaborators((collaborators) => {
        updateFormData({ collaborators });
      });
    }
  }, [isEditMode, program?.id, loadExistingCollaborators, updateFormData]);

  // Handle form data changes
  const handleFormDataChange = useCallback((updates) => {
    updateFormData(updates);
  }, [updateFormData]);

  // Handle image changes
  const handleImageChangeWrapper = useCallback(async (event) => {
    const result = await handleImageChange(event);
    if (result?.file) {
      // Store the File object for backend submission
      updateFormData({ image: result.file });
      // Clear image error if it exists
      if (errors.image) clearError('image');
      // The preview is already set by the handleImageChange hook
    } else if (result?.error) {
      updateFormData({ image: null });
      setImagePreview(null);
      // Handle error display if needed
    }
  }, [handleImageChange, updateFormData, setImagePreview, errors.image, clearError]);

  // Handle additional images changes
  const handleAdditionalImagesChangeWrapper = useCallback(async (event) => {
    const results = await handleAdditionalImagesChange(event);
    // Store File objects for upload, not base64 data URLs
    // Base64 previews are only for UI display
    const validFiles = results.filter(result => result.file && result.preview).map(result => ({
      file: result.file,
      preview: result.preview.url, // Keep preview URL for display
      name: result.preview.name
    }));
    if (validFiles.length > 0) {
      // Store File objects with preview info, not base64 URLs
      const currentAdditionalImages = Array.isArray(formData.additionalImages) ? formData.additionalImages : [];
      // Filter out any existing base64 URLs (from old data) and add new File objects
      const existingUrls = currentAdditionalImages.filter(item => typeof item === 'string' && !item.startsWith('data:'));
      const newAdditionalImages = [...existingUrls, ...validFiles];
      updateFormData({ additionalImages: newAdditionalImages });
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
      // Handle error silently in production
    }
  }, [addCollaborator, formData.collaborators, updateFormData]);

  const handleRemoveCollaborator = useCallback(async (index) => {
    try {
      await removeCollaborator(index, formData.collaborators, (newCollaborators) => {
        updateFormData({ collaborators: newCollaborators });
      });
    } catch (error) {
      // Handle error silently in production
    }
  }, [removeCollaborator, formData.collaborators, updateFormData]);

  // Function to refresh collaborators (exposed to parent component)
  const handleRefreshCollaborators = useCallback(async () => {
    if (isEditMode && program?.id) {
      try {
        await refreshCollaborators((newCollaborators) => {
          updateFormData({ collaborators: newCollaborators });
        });
      } catch (error) {
        // Handle error silently in production
      }
    }
  }, [refreshCollaborators, isEditMode, program?.id, updateFormData]);

  // Expose refresh function to parent component
  useEffect(() => {
    if (onRefreshCollaborators && isEditMode) {
      onRefreshCollaborators(handleRefreshCollaborators);
    }
  }, [onRefreshCollaborators, handleRefreshCollaborators, isEditMode]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    // Validate form with image preview for edit mode and post-act report file
    const isValid = validateForm(imagePreview, postActReportFile);
    
    // If validation failed, return early (errors are already set by validateForm)
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    clearAllErrors();

    try {
      // Prepare form data for submission - simplified and more reliable
      const submissionData = {
        title: formData.title?.trim() || '',
        description: formData.description?.trim() || '',
        category: formData.category?.trim() || '',
        event_start_date: formData.event_start_date || null,
        event_end_date: formData.event_end_date || null,
        multiple_dates: formData.multiple_dates || null,
        status: isEditMode ? (formData.status || 'active') : 'pending',
        accepts_volunteers: formData.accepts_volunteers !== undefined ? formData.accepts_volunteers : false,
        // Only send collaborators in create mode - in edit mode they are handled separately via invite endpoint
        collaborators: isEditMode ? undefined : (
          Array.isArray(formData.collaborators) 
            ? formData.collaborators.map(collab => collab.id).filter(id => id && typeof id === 'number')
            : []
        ),
        // Handle image properly for both create and edit modes
        image: null,
        // Include additional images from formData
        additionalImages: Array.isArray(formData.additionalImages) ? formData.additionalImages : [],
        // Include post-act report file if provided (only in create mode)
        postActReport: !isEditMode ? postActReportFile : undefined,
        // Officer information - use submitted_by for create mode, edited_by for edit mode
        // Note: Backend expects submitted_by_name/role for both create and edit, but in edit mode
        // we send edited_by_name/role as submitted_by_name/role
        submitted_by_name: !isEditMode 
          ? (formData.submitted_by_name?.trim() || '') 
          : (formData.edited_by_name?.trim() || ''),
        submitted_by_role: !isEditMode 
          ? (formData.submitted_by_role?.trim() || '') 
          : (formData.edited_by_role?.trim() || '')
      };

      // Handle image data properly
      if (formData.image instanceof File) {
        // For File objects, we'll let the parent component handle upload
        submissionData.image = formData.image;
      } else if (typeof formData.image === 'string' && formData.image.startsWith('data:image/')) {
        // For base64 strings, send as is
        submissionData.image = formData.image;
      } else if (isEditMode && program && program.image) {
        // In edit mode, if no new image is provided, send undefined to keep existing
        submissionData.image = undefined;
      } else {
        // No image provided
        submissionData.image = null;
      }

      // In Edit mode, send invites for newly added collaborators before submitting
      if (isEditMode && sendInvitesForNewCollaborators) {
        try {
          await sendInvitesForNewCollaborators(formData.collaborators);
        } catch (error) {
          logger.error('Failed to send some collaborator invites', error, { context: 'ProgramForm' });
          // Continue with form submission even if some invites fail
        }
      }

      await onSubmit(submissionData);
      
      // Reset form after successful submission (only for create mode)
      if (!isEditMode) {
        resetForm();
        resetImageUploads();
        resetCollaboration();
        setPostActReportFile(null);
      }
    } catch (error) {
      updateFormData({ submit: error.message || 'Failed to submit form' });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, formData, isEditMode, program, onSubmit, clearAllErrors, updateFormData, resetForm, resetImageUploads, resetCollaboration, sendInvitesForNewCollaborators, imagePreview, postActReportFile]);

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

  // Handle back click (replaces Cancel button)
  const handleBackClick = useCallback(() => {
    if (isEditMode) {
      handleClose();
    } else {
      if (hasChanges) {
        setShowUnsavedModal(true);
        return;
      }
      onCancel();
    }
  }, [isEditMode, handleClose, hasChanges, onCancel]);

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
      {/* Header with Title and Action Buttons */}
      <div className={styles.formHeader}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            onClick={handleBackClick}
            className={styles.backLink}
          >
            Go Back
          </button>
          <h1>{headerTitle || (isEditMode ? 'Edit Program' : 'Add New Program')}</h1>
        </div>
        <div className={styles.headerActions}>
          <button
            type={isEditMode ? "button" : "submit"}
            onClick={isEditMode ? handleSubmit : undefined}
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isEditMode ? "Save Changes" : "Submit for Approval"}
            {isSubmitting ? <FaSpinner className={styles.spinner} /> : null}
          </button>
        </div>
      </div>

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
              postActReportFile={postActReportFile}
              onPostActReportChange={setPostActReportFile}
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

          {/* Submitted By Section - Show in create mode */}
          {!isEditMode && (
            <div className={styles.container}>
              <h3 className={styles.containerTitle}>Submitted by</h3>
              <div className={styles.submittedByFields}>
                <div className={styles.submittedByNameField}>
                  <label className={styles.inlineLabel}>
                    Name
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      className={`${styles.input} ${errors.submitted_by_name ? styles.inputError : ''}`}
                      value={formData.submitted_by_name || ''}
                      onChange={(e) => {
                        updateFormData({ submitted_by_name: e.target.value });
                        if (errors.submitted_by_name) clearError('submitted_by_name');
                      }}
                      placeholder="Enter name"
                    />
                    {errors.submitted_by_name && <span className={styles.errorText}>{errors.submitted_by_name}</span>}
                  </div>
                </div>
                <div className={styles.submittedByRoleField}>
                  <label className={styles.inlineLabel}>
                    Position
                  </label>
                  <div className={styles.roleInputGroup}>
                    <div className={styles.inputWrapper}>
                      <CustomDropdown
                        options={ROLE_OPTIONS}
                        value={ROLE_OPTIONS.find(option => option.value === formData.submitted_by_role) 
                          ? formData.submitted_by_role 
                          : (formData.submitted_by_role && !ROLE_OPTIONS.find(option => option.value === formData.submitted_by_role) 
                            ? 'Others' 
                            : '')}
                        onChange={(selectedValue) => handleRoleChange(selectedValue)}
                        placeholder="Select a role"
                        error={!!errors.submitted_by_role}
                        required
                      />
                    </div>
                    {/* Custom role input - only show when "Others" is selected or when role is not in predefined options */}
                    {(formData.submitted_by_role === 'Others' || (formData.submitted_by_role && !ROLE_OPTIONS.find(option => option.value === formData.submitted_by_role))) && (
                      <div className={styles.customRoleInput}>
                        <input
                          type="text"
                          value={customRole}
                          onChange={(e) => handleCustomRoleChange(e.target.value)}
                          className={`${styles.input} ${errors.submitted_by_role ? styles.inputError : ''}`}
                          placeholder="Enter custom role/position"
                          required
                        />
                      </div>
                    )}
                  </div>
                  {errors.submitted_by_role && <span className={styles.errorText}>{errors.submitted_by_role}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Edited By Section - Only shown in edit mode */}
          {isEditMode && (
            <div className={styles.container}>
              <h3 className={styles.containerTitle}>Edited by</h3>
              <div className={styles.submittedByFields}>
                <div className={styles.submittedByNameField}>
                  <label className={styles.inlineLabel}>
                    Name
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      className={`${styles.input} ${errors.edited_by_name ? styles.inputError : ''}`}
                      value={formData.edited_by_name || ''}
                      onChange={(e) => {
                        updateFormData({ edited_by_name: e.target.value });
                        if (errors.edited_by_name) clearError('edited_by_name');
                      }}
                      placeholder="Enter name"
                    />
                    {errors.edited_by_name && <span className={styles.errorText}>{errors.edited_by_name}</span>}
                  </div>
                </div>
                <div className={styles.submittedByRoleField}>
                  <label className={styles.inlineLabel}>
                    Position
                  </label>
                  <div className={styles.roleInputGroup}>
                    <div className={styles.inputWrapper}>
                      <CustomDropdown
                        options={ROLE_OPTIONS}
                        value={ROLE_OPTIONS.find(option => option.value === formData.edited_by_role) 
                          ? formData.edited_by_role
                          : (formData.edited_by_role && !ROLE_OPTIONS.find(option => option.value === formData.edited_by_role) 
                            ? 'Others' 
                            : '')}
                        onChange={(selectedValue) => {
                          handleEditedRoleChange(selectedValue);
                          if (errors.edited_by_role) clearError('edited_by_role');
                        }}
                        placeholder="Select a role"
                        error={!!errors.edited_by_role}
                        required={true}
                      />
                    </div>
                    {/* Custom role input - only show when "Others" is selected or when role is not in predefined options */}
                    {(formData.edited_by_role === 'Others' || (formData.edited_by_role && !ROLE_OPTIONS.find(option => option.value === formData.edited_by_role))) && (
                      <div className={styles.customRoleInput}>
                        <input
                          type="text"
                          value={customEditedRole}
                          onChange={(e) => {
                            handleCustomEditedRoleChange(e.target.value);
                            if (errors.edited_by_role) clearError('edited_by_role');
                          }}
                          className={`${styles.input} ${errors.edited_by_role ? styles.inputError : ''}`}
                          placeholder="Enter custom role/position"
                          required
                        />
                      </div>
                    )}
                  </div>
                  {errors.edited_by_role && <span className={styles.errorText}>{errors.edited_by_role}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className={styles.submitError}>
              {errors.submit}
            </div>
          )}
        </div>

        {/* Right Panel - Images and Actions */}
        <div className={styles.rightPanel}>
          {/* Volunteer Applications Container */}
          <div className={styles.container}>
            <h3 className={styles.containerTitle}>Volunteer Applications</h3>
            <div className={styles.volunteerToggleContainer}>
              <div className={styles.toggleWrapper}>
                <input
                  type="checkbox"
                  id="accepts_volunteers"
                  className={styles.toggleInput}
                  checked={formData.accepts_volunteers}
                  onChange={(e) => {
                    updateFormData({ accepts_volunteers: e.target.checked });
                    if (errors.accepts_volunteers) clearError('accepts_volunteers');
                  }}
                />
                <label htmlFor="accepts_volunteers" className={styles.toggleLabel}>
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>
              <div className={styles.volunteerToggleText}>
                <span className={formData.accepts_volunteers ? styles.toggleTextActive : styles.toggleTextInactive}>
                  {formData.accepts_volunteers ? 'Accepting applications' : 'Not accepting applications'}
                </span>
                <p className={styles.volunteerToggleDescription}>
                  {formData.accepts_volunteers 
                    ? 'Public users can apply to volunteer'
                    : 'Public users cannot apply to volunteer'
                  }
                </p>
              </div>
            </div>
            {errors.accepts_volunteers && <span className={styles.errorText}>{errors.accepts_volunteers}</span>}
          </div>

          {/* Main Image Upload */}
          <ImageUpload
            title="Highlight Image"
            required={true}
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
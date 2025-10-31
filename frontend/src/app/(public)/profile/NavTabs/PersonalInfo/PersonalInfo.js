'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import { FaEdit, FaSave, FaUndo, FaUser } from 'react-icons/fa';
import { OptimizedImage } from '@/components';
import CustomSelect from './CustomSelect/CustomSelect';
import DeleteAccount from './DeleteAccount/DeleteAccount';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useProfileApi } from '../../hooks/useApiCall';
import { useToast } from '../../components/Toast';
import { formatBirthDate, formatDateForInput } from '@/utils/dateUtils';
import { getProfilePhotoUrl } from '@/utils/uploadPaths';
import styles from './PersonalInfo.module.css';

const PersonalInfo = memo(function PersonalInfo({ userData, setUserData }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Photo states - moved to component state to prevent reset on re-render
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState(null);
  const [photoSelected, setPhotoSelected] = useState(false);
  const [photoToRemove, setPhotoToRemove] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Photo handling functions
  const resetPhotoStates = useCallback(() => {
    setSelectedPhotoFile(null);
    setSelectedPhotoPreview(null);
    setPhotoError('');
    setPhotoSelected(false);
    setPhotoToRemove(false);
  }, []);

  const handlePhotoUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File size must be less than 5MB');
      return;
    }

    setPhotoError('');
    setSelectedPhotoFile(file);
    setPhotoSelected(true);
    setPhotoToRemove(false);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemovePhoto = useCallback(() => {
    setPhotoError('');
    setSelectedPhotoFile(null);
    setSelectedPhotoPreview(null);
    setPhotoSelected(false);
    setPhotoToRemove(true);
  }, []);
  
  const {
    fieldErrors,
    requiredFieldErrors,
    validateRequiredField,
    validateBirthDate,
    clearAllErrors,
    setFieldError
  } = useFormValidation();
  
  const {
    updateProfile,
    uploadProfilePhoto,
    removeProfilePhoto,
    isLoading: apiLoading
  } = useProfileApi();
  
  const { showSuccess, showError } = useToast();

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      resetPhotoStates();
    };
  }, [resetPhotoStates]);

  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel edit mode
      setIsEditMode(false);
      setEditData({});
      clearAllErrors();
      setHasChanges(false);
      resetPhotoStates();
    } else {
      // Enter edit mode
      setIsEditMode(true);
      setEditData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        contactNumber: userData.contactNumber || '',
        address: userData.address || '',
        birthDate: userData.birthDate ? formatDateForInput(userData.birthDate) : '',
        gender: userData.gender || '',
        occupation: userData.occupation || '',
        citizenship: userData.citizenship || ''
      });
      clearAllErrors();
      setHasChanges(false);
      // Reset photo states when entering edit mode to start fresh
      resetPhotoStates();
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate birth date
    if (name === 'birthDate') {
      const birthDateError = validateBirthDate(value);
      if (birthDateError) {
        setFieldError('birthDate', birthDateError);
      } else {
        setFieldError('birthDate', '');
      }
    }
    
    // Validate required fields
    validateRequiredField(name, value);
  };


  // Watch for changes to update hasChanges - but only when editData or photo states change
  useEffect(() => {
    if (isEditMode) {
      // Check if any field has changed
      const hasAnyChanges = Object.keys(editData).some(key => {
        const original = userData[key] || '';
        const current = editData[key] || '';
        return original !== current;
      });
      
      // Also check if photo has been selected or marked for removal
      const hasPhotoChanges = selectedPhotoFile !== null || photoToRemove;
      
      setHasChanges(hasAnyChanges || hasPhotoChanges);
    }
  }, [editData, selectedPhotoFile, photoToRemove, isEditMode, userData]);


  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    // Validate all required fields
    const requiredFields = ['firstName', 'lastName', 'contactNumber', 'address'];
    const hasRequiredFieldErrors = requiredFields.some(field => {
      const value = editData[field] || '';
      return value.trim() === '';
    });
    
    if (hasRequiredFieldErrors) {
      showError('Please fill in all required fields');
      return;
    }
    
    // Check for birth date validation before saving
    if (editData.birthDate && fieldErrors.birthDate) {
      showError('Please fix the birth date error before saving');
      return;
    }

    try {
      let updatedUserData = { ...userData, ...editData };

      // Handle photo operations
      if (selectedPhotoFile) {
        setIsUploadingPhoto(true);
        setPhotoError('');
        
        try {
          const response = await uploadProfilePhoto(selectedPhotoFile);
          
          // Handle different response structures
          const photoUrl = response.data?.profilePhotoUrl || response.data?.profile_photo_url || response.profilePhotoUrl;
          
          if (!photoUrl) {
            throw new Error('No photo URL returned from server');
          }
          
          updatedUserData.profile_photo_url = photoUrl;
        } catch (error) {
          const errorMessage = error.message || 'Failed to upload photo';
          setPhotoError(errorMessage);
          showError(`Photo upload failed: ${errorMessage}`);
          setIsUploadingPhoto(false);
          return;
        }
        setIsUploadingPhoto(false);
      } else if (photoToRemove) {
        setIsUploadingPhoto(true);
        setPhotoError('');
        
        try {
          await removeProfilePhoto();
          updatedUserData.profile_photo_url = null;
        } catch (error) {
          const errorMessage = error.message || 'Failed to remove photo';
          setPhotoError(errorMessage);
          showError(`Photo removal failed: ${errorMessage}`);
          setIsUploadingPhoto(false);
          return;
        }
        setIsUploadingPhoto(false);
      }

      // Update profile data
      await updateProfile(editData);

      // Update user data in localStorage
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      setUserData(updatedUserData);
      
      showSuccess('Profile updated successfully!');
      
      // Add a small delay to show the success message before closing edit mode
      setTimeout(() => {
        setIsEditMode(false);
        setEditData({});
        resetPhotoStates();
      }, 1000);
      
    } catch (error) {
      const errorMessage = error.message || 'An error occurred while updating profile';
      showError(errorMessage);
    }
  };

  // Date formatting functions are now imported from centralized utilities

  return (
    <div className={styles.personalInfoSection}>
      <div className={styles.personalInfoContainer}>
        <div className={styles.sectionHeader}>
          <h2>Personal Information</h2>
          {!isEditMode ? (
            <button 
              onClick={handleEditToggle} 
              className={styles.editButton}
            >
              <FaEdit />
              <span>Edit</span>
            </button>
          ) : (
            <div className={styles.editActions}>
              <button 
                onClick={handleSaveProfile} 
                className={`${styles.actionButton} ${styles.saveButton}`}
                disabled={apiLoading || !hasChanges}
              >
                <FaSave />
                <span>Save</span>
              </button>
              <button 
                onClick={handleEditToggle} 
                className={`${styles.actionButton} ${styles.cancelButton}`}
                disabled={apiLoading}
              >
                <FaUndo />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

      {/* Profile Photo and Change Button */}
      <div className={styles.profilePhotoSection}>
        <div className={styles.profilePhotoContainer}>
          <div className={`${styles.profileImageContainer} ${isEditMode ? styles.editMode : ''}`}>
            <div className={styles.profileImage}>
              {selectedPhotoPreview ? (
                <Image
                  src={selectedPhotoPreview}
                  alt="Profile Preview"
                  width={60}
                  height={60}
                  className={styles.image}
                  priority
                />
              ) : photoToRemove ? (
                <FaUser className={styles.profileIconDefault} />
              ) : userData?.profile_photo_url ? (
                <OptimizedImage
                  src={getProfilePhotoUrl(userData.profile_photo_url)}
                  alt="Profile"
                  width={60}
                  height={60}
                  className={styles.image}
                  fallbackIcon={FaUser}
                />
              ) : (
                <FaUser className={styles.profileIconDefault} />
              )}
            </div>
            {isUploadingPhoto && (
              <div className={styles.uploadingOverlay}>
                <div className={styles.spinner}></div>
                <span>Uploading...</span>
              </div>
            )}
          </div>
          <div className={styles.photoActionsContainer}>
            {isEditMode && (
              <>
                <button className={styles.changePhotoButton}>
                  <label htmlFor="photoUpload" className={styles.uploadButton}>
                    Change
                  </label>
                  <input
                    id="photoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                    disabled={isUploadingPhoto}
                  />
                </button>
                {(userData?.profile_photo_url || selectedPhotoFile) && !photoToRemove && (
                  <button 
                    className={styles.removePhotoButton}
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto}
                  >
                    Remove
                  </button>
                )}
              </>
            )}
            {photoSelected && (
              <div className={styles.photoSelectedMessage}>
                <span className={styles.checkIcon}>✓</span>
                <span>Photo selected</span>
              </div>
            )}
            {photoToRemove && (
              <div className={styles.photoSelectedMessage}>
                <span className={styles.checkIcon}>✓</span>
                <span>Photo will be removed</span>
              </div>
            )}
          </div>
        </div>
        {photoError && (
          <div className={styles.photoErrorMessage}>
            {photoError}
          </div>
        )}
      </div>


      {/* Personal Information Form */}
      <div className={styles.personalInfoForm}>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label>First Name</label>
            {isEditMode ? (
              <>
                <input
                  type="text"
                  name="firstName"
                  value={editData.firstName || ''}
                  onChange={handleEditChange}
                  placeholder="First Name"
                  className={`${styles.editInput} ${requiredFieldErrors.firstName ? styles.errorInput : ''}`}
                  required
                />
                {requiredFieldErrors.firstName && (
                  <div className={styles.fieldErrorMessage}>
                    {requiredFieldErrors.firstName}
                  </div>
                )}
              </>
            ) : (
              <p>{userData.firstName || 'Not provided'}</p>
            )}
          </div>
          <div className={styles.formField}>
            <label>Last Name</label>
            {isEditMode ? (
              <>
                <input
                  type="text"
                  name="lastName"
                  value={editData.lastName || ''}
                  onChange={handleEditChange}
                  placeholder="Last Name"
                  className={`${styles.editInput} ${requiredFieldErrors.lastName ? styles.errorInput : ''}`}
                  required
                />
                {requiredFieldErrors.lastName && (
                  <div className={styles.fieldErrorMessage}>
                    {requiredFieldErrors.lastName}
                  </div>
                )}
              </>
            ) : (
              <p>{userData.lastName || 'Not provided'}</p>
            )}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label>Contact Number</label>
            {isEditMode ? (
              <>
                <input
                  type="tel"
                  name="contactNumber"
                  value={editData.contactNumber || ''}
                  onChange={handleEditChange}
                  placeholder="Contact Number"
                  className={`${styles.editInput} ${requiredFieldErrors.contactNumber ? styles.errorInput : ''}`}
                  required
                />
                {requiredFieldErrors.contactNumber && (
                  <div className={styles.fieldErrorMessage}>
                    {requiredFieldErrors.contactNumber}
                  </div>
                )}
              </>
            ) : (
              <p>{userData.contactNumber || 'Not provided'}</p>
            )}
          </div>
          <div className={styles.formField}>
            <label>Birth Date</label>
            {isEditMode ? (
              <>
                <input
                  type="date"
                  name="birthDate"
                  value={editData.birthDate ? formatDateForInput(editData.birthDate) : ''}
                  onChange={handleEditChange}
                  className={`${styles.editInput} ${fieldErrors.birthDate ? styles.errorInput : ''}`}
                />
                {fieldErrors.birthDate && (
                  <div className={styles.fieldErrorMessage}>
                    {fieldErrors.birthDate}
                  </div>
                )}
              </>
            ) : (
              <p>{formatBirthDate(userData.birthDate)}</p>
            )}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label>Gender</label>
            {isEditMode ? (
              <CustomSelect
                name="gender"
                value={editData.gender || ''}
                onChange={handleEditChange}
                placeholder="Select Gender"
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' }
                ]}
              />
            ) : (
              <p>{userData.gender || 'Not provided'}</p>
            )}
          </div>
          <div className={styles.formField}>
            <label>Occupation</label>
            {isEditMode ? (
              <input
                type="text"
                name="occupation"
                value={editData.occupation || ''}
                onChange={handleEditChange}
                placeholder="Occupation"
                className={styles.editInput}
              />
            ) : (
              <p>{userData.occupation || 'Not provided'}</p>
            )}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label>Address</label>
            {isEditMode ? (
              <>
                <textarea
                  name="address"
                  value={editData.address || ''}
                  onChange={handleEditChange}
                  placeholder="Enter your complete address (e.g., 081, Darasa, Tanauan City)"
                  className={`${styles.editTextarea} ${requiredFieldErrors.address ? styles.errorInput : ''}`}
                  rows="3"
                  spellCheck="true"
                  autoComplete="street-address"
                  required
                />
                {requiredFieldErrors.address && (
                  <div className={styles.fieldErrorMessage}>
                    {requiredFieldErrors.address}
                  </div>
                )}
              </>
            ) : (
              <p>{userData.address || 'Not provided'}</p>
            )}
          </div>
          <div className={styles.formField}>
            <label>Citizenship</label>
            {isEditMode ? (
              <input
                type="text"
                name="citizenship"
                value={editData.citizenship || ''}
                onChange={handleEditChange}
                placeholder="Citizenship"
                className={styles.editInput}
              />
            ) : (
              <p>{userData.citizenship || 'Not provided'}</p>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Delete Account Component */}
      <DeleteAccount />
    </div>
  );
});

export default PersonalInfo;
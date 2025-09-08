'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { FaEdit, FaSave, FaUndo } from 'react-icons/fa';
import CustomSelect from '../CustomSelect/CustomSelect';
import DeleteAccount from '../DeleteAccount/DeleteAccount';
import styles from './PersonalInfo.module.css';

export default function PersonalInfo({ userData, setUserData }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [birthDateError, setBirthDateError] = useState('');
  const [requiredFieldErrors, setRequiredFieldErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState(null);
  const [photoSelected, setPhotoSelected] = useState(false);
  const [photoSelectedTimeout, setPhotoSelectedTimeout] = useState(null);
  const [photoToRemove, setPhotoToRemove] = useState(false);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (photoSelectedTimeout) {
        clearTimeout(photoSelectedTimeout);
      }
    };
  }, [photoSelectedTimeout]);

  const resetPhotoStates = () => {
    setSelectedPhotoFile(null);
    setSelectedPhotoPreview(null);
    setPhotoError('');
    setPhotoSelected(false);
    setPhotoToRemove(false);
    // Clear any existing timeout
    if (photoSelectedTimeout) {
      clearTimeout(photoSelectedTimeout);
      setPhotoSelectedTimeout(null);
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel edit mode
      setIsEditMode(false);
      setEditData({});
      setEditError('');
      setEditSuccess('');
      setBirthDateError('');
      setRequiredFieldErrors({});
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
        birthDate: userData.birthDate || '',
        gender: userData.gender || '',
        occupation: userData.occupation || '',
        citizenship: userData.citizenship || ''
      });
      setEditError('');
      setEditSuccess('');
      setBirthDateError('');
      setRequiredFieldErrors({});
      setHasChanges(false);
      resetPhotoStates();
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
    setEditError('');
    
    // Validate birth date
    if (name === 'birthDate') {
      validateBirthDate(value);
    }
    
    // Validate required fields
    validateRequiredField(name, value);
    
    // Change detection is handled by useEffect
  };

  const updateHasChanges = useCallback(() => {
    // Check if any field has changed
    const hasAnyChanges = Object.keys(editData).some(key => {
      const original = userData[key] || '';
      const current = editData[key] || '';
      return original !== current;
    });
    
    // Also check if photo has been selected or marked for removal
    const hasPhotoChanges = selectedPhotoFile !== null || photoToRemove;
    
    setHasChanges(hasAnyChanges || hasPhotoChanges);
  }, [editData, userData, selectedPhotoFile, photoToRemove]);

  // Watch for photo state changes to update hasChanges
  useEffect(() => {
    updateHasChanges();
  }, [updateHasChanges]);

  const validateRequiredField = (fieldName, value) => {
    const requiredFields = ['firstName', 'lastName', 'contactNumber', 'address'];
    
    if (requiredFields.includes(fieldName)) {
      setRequiredFieldErrors(prev => ({
        ...prev,
        [fieldName]: value.trim() === '' ? 'This field is required' : ''
      }));
    }
  };

  const validateBirthDate = (dateValue) => {
    if (!dateValue) {
      setBirthDateError('');
      return;
    }

    const selectedDate = new Date(dateValue);
    const today = new Date();
    
    if (selectedDate > today) {
      setBirthDateError('Please enter a valid birth date');
    } else {
      setBirthDateError('');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    // Validate all required fields
    const requiredFields = ['firstName', 'lastName', 'contactNumber', 'address'];
    const hasRequiredFieldErrors = requiredFields.some(field => {
      const value = editData[field] || '';
      return value.trim() === '';
    });
    
    if (hasRequiredFieldErrors) {
      setEditError('Please fill in all required fields');
      return;
    }
    
    // Check for birth date validation before saving
    if (editData.birthDate && birthDateError) {
      setEditError('Please fix the birth date error before saving');
      return;
    }
    
    setIsSaving(true);
    setEditError('');
    setEditSuccess('');
    setPhotoError('');

    try {
      const token = localStorage.getItem('userToken');
      let updatedUserData = { ...userData, ...editData };

      // Handle photo operations
      if (selectedPhotoFile) {
        // Upload new photo
        setIsUploadingPhoto(true);
        const formData = new FormData();
        formData.append('profilePhoto', selectedPhotoFile);

        const photoResponse = await fetch('http://localhost:8080/api/users/profile/photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const photoData = await photoResponse.json();

        if (photoResponse.ok) {
          updatedUserData.profile_photo_url = photoData.profilePhotoUrl;
        } else {
          setPhotoError(photoData.error || 'Failed to upload photo');
          setIsUploadingPhoto(false);
          setIsSaving(false);
          return;
        }
        setIsUploadingPhoto(false);
      } else if (photoToRemove) {
        // Remove existing photo
        setIsUploadingPhoto(true);
        const removeResponse = await fetch('http://localhost:8080/api/users/profile/photo', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (removeResponse.ok) {
          updatedUserData.profile_photo_url = null;
        } else {
          setPhotoError('Failed to remove photo');
          setIsUploadingPhoto(false);
          setIsSaving(false);
          return;
        }
        setIsUploadingPhoto(false);
      }

      // Then update profile data
      const response = await fetch('http://localhost:8080/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });

      const data = await response.json();

      if (response.ok) {
        // Update user data in localStorage
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        setUserData(updatedUserData);
        
        setEditSuccess('Profile updated successfully!');
        setIsEditMode(false);
        setEditData({});
        resetPhotoStates();
        
        setTimeout(() => {
          setEditSuccess('');
        }, 3000);
      } else {
        setEditError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setEditError('An error occurred while updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePhotoUpload = (event) => {
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
    setPhotoToRemove(false); // Clear remove flag when new photo is selected

    // Clear any existing timeout
    if (photoSelectedTimeout) {
      clearTimeout(photoSelectedTimeout);
    }

    // Set timeout to hide the message after 3 seconds
    const timeout = setTimeout(() => {
      setPhotoSelected(false);
      setPhotoSelectedTimeout(null);
    }, 3000);
    setPhotoSelectedTimeout(timeout);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Change detection is handled by useEffect
  };

  const handleRemovePhoto = () => {
    setPhotoError('');
    setSelectedPhotoFile(null);
    setSelectedPhotoPreview(null);
    setPhotoSelected(false);
    setPhotoToRemove(true);

    // Clear any existing timeout
    if (photoSelectedTimeout) {
      clearTimeout(photoSelectedTimeout);
      setPhotoSelectedTimeout(null);
    }
  };

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
                disabled={isSaving || !hasChanges}
              >
                <FaSave />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
              <button 
                onClick={handleEditToggle} 
                className={`${styles.actionButton} ${styles.cancelButton}`}
                disabled={isSaving}
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
                <Image
                  src="/default-profile.png"
                  alt="Default Profile"
                  width={60}
                  height={60}
                  className={styles.image}
                  priority
                />
              ) : userData?.profile_photo_url ? (
                <Image
                  src={`http://localhost:8080${userData.profile_photo_url}`}
                  alt="Profile"
                  width={60}
                  height={60}
                  className={styles.image}
                  priority
                />
              ) : (
                <Image
                  src="/default-profile.png"
                  alt="Default Profile"
                  width={60}
                  height={60}
                  className={styles.image}
                  priority
                />
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

      {editError && (
        <div className={styles.editErrorMessage}>
          {editError}
        </div>
      )}
      {editSuccess && (
        <div className={styles.editSuccessMessage}>
          {editSuccess}
        </div>
      )}

      {/* Personal Information Form */}
      <div className={styles.personalInfoForm}>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label>First Name <span className={styles.required}>*</span></label>
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
            <label>Last Name <span className={styles.required}>*</span></label>
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
            <label>Contact Number <span className={styles.required}>*</span></label>
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
                  value={editData.birthDate || ''}
                  onChange={handleEditChange}
                  className={`${styles.editInput} ${birthDateError ? styles.errorInput : ''}`}
                />
                {birthDateError && (
                  <div className={styles.fieldErrorMessage}>
                    {birthDateError}
                  </div>
                )}
              </>
            ) : (
              <p>{formatDate(userData.birthDate)}</p>
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
            <label>Address <span className={styles.required}>*</span></label>
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
}
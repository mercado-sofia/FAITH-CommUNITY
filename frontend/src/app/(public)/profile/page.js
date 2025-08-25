'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FaArrowLeft, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaSignOutAlt,
  FaVenusMars,
  FaBriefcase,
  FaPassport,
  FaLock,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaCamera,
  FaUpload,
  FaEdit,
  FaSave,
  FaUndo,
  FaCrop,
  FaCheck,
  FaRedo
} from 'react-icons/fa';
import styles from './profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [cropData, setCropData] = useState({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    scale: 1,
    rotation: 0
  });
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    
    if (!token || !storedUserData) {
      window.location.href = '/login';
      return;
    }

    try {
      const user = JSON.parse(storedUserData);
      setUserData(user);
    } catch (error) {
      console.error('Error parsing user data:', error);
      window.location.href = '/login';
      return;
    }

    setIsLoading(false);
  }, [router]);

  const handleLogout = async () => {
    // Dispatch global event to show full-page loader
    window.dispatchEvent(new CustomEvent('showLogoutLoader'));
    
    try {
      const userToken = localStorage.getItem('userToken');
      
      if (userToken) {
        const response = await fetch('http://localhost:8080/api/users/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.warn('Logout API call failed, but continuing with client-side logout');
        }
      }

      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');

      document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Redirect with page refresh to ensure clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Hide loader if logout fails
      window.dispatchEvent(new CustomEvent('hideLogoutLoader'));
      
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Redirect with page refresh to ensure clean state
      window.location.href = '/';
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel edit mode
      setIsEditMode(false);
      setEditData({});
      setEditError('');
      setEditSuccess('');
    } else {
      // Enter edit mode
      setIsEditMode(true);
      setEditData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        contactNumber: userData.contactNumber || '',
        address: userData.address || '',
        gender: userData.gender || '',
        occupation: userData.occupation || '',
        citizenship: userData.citizenship || ''
      });
      setEditError('');
      setEditSuccess('');
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
    setEditError('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    setIsSaving(true);
    setEditError('');
    setEditSuccess('');

    try {
      const token = localStorage.getItem('userToken');
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
        const updatedUserData = {
          ...userData,
          ...editData
        };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        setUserData(updatedUserData);
        
        setEditSuccess('Profile updated successfully!');
        setIsEditMode(false);
        setEditData({});
        
        setTimeout(() => {
          setEditSuccess('');
        }, 3000);
      } else {
        setEditError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordError('');
    setPasswordSuccess('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch('http://localhost:8080/api/users/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        setPasswordError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('An error occurred while changing password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setPasswordSuccess('');
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
  };

  const handlePhotoUpload = async (event) => {
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

    // Show crop modal instead of uploading directly
    setSelectedFile(file);
    setShowCropModal(true);
    // Initialize crop data to center the crop area
    setCropData({
      x: 50,
      y: 50,
      width: 200,
      height: 200,
      scale: 1,
      rotation: 0
    });
    setPhotoError('');
    setPhotoSuccess('');
  };

  const handleCropChange = (newCrop) => {
    setCropData(newCrop);
  };

  const handleCropComplete = async () => {
    if (!selectedFile) return;

    setIsCropping(true);
    setPhotoError('');

    try {
      // Create a canvas to crop the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();

      img.onload = async () => {
        // Set canvas size to the crop dimensions
        canvas.width = 200;
        canvas.height = 200;

        // Calculate the crop area based on the circular crop overlay
        const containerSize = 300; // Size of the crop area container
        const cropSize = cropData.width; // Size of the crop circle
        
        // Calculate the center of the crop area
        const cropCenterX = cropData.x + cropSize / 2;
        const cropCenterY = cropData.y + cropSize / 2;
        
        // Calculate the crop rectangle in image coordinates
        const imageSize = Math.min(img.naturalWidth, img.naturalHeight);
        const scale = imageSize / containerSize;
        
        const cropX = (cropCenterX - cropSize / 2) * scale;
        const cropY = (cropCenterY - cropSize / 2) * scale;
        const cropWidth = cropSize * scale;
        const cropHeight = cropSize * scale;

        // Apply rotation if needed
        if (cropData.rotation !== 0) {
          ctx.save();
          ctx.translate(100, 100);
          ctx.rotate((cropData.rotation * Math.PI) / 180);
          ctx.translate(-100, -100);
        }

        // Draw the cropped image
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, 200, 200
        );

        if (cropData.rotation !== 0) {
          ctx.restore();
        }

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setPhotoError('Failed to process image');
            setIsCropping(false);
            return;
          }

          // Create a new file from the blob
          const croppedFile = new File([blob], selectedFile.name, {
            type: selectedFile.type,
            lastModified: Date.now()
          });

          // Upload the cropped image
          const formData = new FormData();
          formData.append('profilePhoto', croppedFile);

          const token = localStorage.getItem('userToken');
          const response = await fetch('http://localhost:8080/api/users/profile/photo', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          const data = await response.json();

          if (response.ok) {
            setPhotoSuccess('Profile photo updated successfully!');
            // Update user data in localStorage
            const updatedUserData = {
              ...userData,
              profile_photo_url: data.profilePhotoUrl
            };
            localStorage.setItem('userData', JSON.stringify(updatedUserData));
            setUserData(updatedUserData);
            
            // Close crop modal
            setShowCropModal(false);
            setSelectedFile(null);
            setCropData({
              x: 0,
              y: 0,
              width: 200,
              height: 200,
              scale: 1,
              rotation: 0
            });
            
            setTimeout(() => {
              setPhotoSuccess('');
            }, 3000);
          } else {
            setPhotoError(data.error || 'Failed to upload photo');
          }
          setIsCropping(false);
        }, selectedFile.type, 0.9);
      };

      img.src = URL.createObjectURL(selectedFile);
    } catch (error) {
      console.error('Error cropping photo:', error);
      setPhotoError('An error occurred while processing photo');
      setIsCropping(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setSelectedFile(null);
    setCropData({
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      scale: 1,
      rotation: 0
    });
    setPhotoError('');
  };

  const handleRotate = () => {
    setCropData(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  };

  const handleCropDragStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startCropX = cropData.x;
    const startCropY = cropData.y;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      setCropData(prev => ({
        ...prev,
        x: Math.max(0, Math.min(100, startCropX + deltaX)),
        y: Math.max(0, Math.min(100, startCropY + deltaY))
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCropResize = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = cropData.width;
    const startHeight = cropData.height;
    const startXPos = cropData.x;
    const startYPos = cropData.y;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startXPos;
      let newY = startYPos;

      // Adjust based on which handle is being dragged
      if (handle.includes('right')) {
        newWidth = Math.max(50, Math.min(200, startWidth + deltaX));
      }
      if (handle.includes('left')) {
        const widthChange = Math.max(-startWidth + 50, Math.min(startWidth - 50, -deltaX));
        newWidth = startWidth - widthChange;
        newX = startXPos + widthChange;
      }
      if (handle.includes('bottom')) {
        newHeight = Math.max(50, Math.min(200, startHeight + deltaY));
      }
      if (handle.includes('top')) {
        const heightChange = Math.max(-startHeight + 50, Math.min(startHeight - 50, -deltaY));
        newHeight = startHeight - heightChange;
        newY = startYPos + heightChange;
      }

      // Keep it circular
      const size = Math.min(newWidth, newHeight);
      
      setCropData(prev => ({
        ...prev,
        width: size,
        height: size,
        x: newX,
        y: newY
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/" className={styles.backButton}>
          <FaArrowLeft />
          <span>Back to Home</span>
        </Link>
        <h1>My Profile</h1>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div className={`${styles.profileImageContainer} ${isEditMode ? styles.editMode : ''}`}>
            <div className={styles.profileImage}>
              {userData?.profile_photo_url ? (
                <Image
                  src={`http://localhost:8080${userData.profile_photo_url}`}
                  alt="Profile"
                  width={120}
                  height={120}
                  className={styles.image}
                  priority
                />
              ) : (
                <Image
                  src="/default-profile.png"
                  alt="Default Profile"
                  width={120}
                  height={120}
                  className={styles.image}
                  priority
                />
              )}
            </div>
            {isEditMode && (
              <div className={styles.photoUploadOverlay}>
                <label htmlFor="photoUpload" className={styles.uploadButton}>
                  <FaCamera />
                  <span>Change Photo</span>
                </label>
                <input
                  id="photoUpload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                  disabled={isUploadingPhoto}
                />
              </div>
            )}
            {isUploadingPhoto && (
              <div className={styles.uploadingOverlay}>
                <div className={styles.spinner}></div>
                <span>Uploading...</span>
              </div>
            )}
          </div>
          <div className={styles.profileInfo}>
            <h2>{userData.firstName} {userData.lastName}</h2>
            <p className={styles.email}>{userData.email}</p>
            {photoError && (
              <div className={styles.photoErrorMessage}>
                {photoError}
              </div>
            )}
            {photoSuccess && (
              <div className={styles.photoSuccessMessage}>
                {photoSuccess}
              </div>
            )}
          </div>
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

        <div className={styles.profileDetails}>
          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>
              <FaUser />
            </div>
            <div className={styles.detailContent}>
              <label>Full Name</label>
              {isEditMode ? (
                <div className={styles.editFormRow}>
                  <input
                    type="text"
                    name="firstName"
                    value={editData.firstName || ''}
                    onChange={handleEditChange}
                    placeholder="First Name"
                    className={styles.editInput}
                  />
                  <input
                    type="text"
                    name="lastName"
                    value={editData.lastName || ''}
                    onChange={handleEditChange}
                    placeholder="Last Name"
                    className={styles.editInput}
                  />
                </div>
              ) : (
                <p>{userData.firstName} {userData.lastName}</p>
              )}
            </div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>
              <FaEnvelope />
            </div>
            <div className={styles.detailContent}>
              <label>Email Address</label>
              <p>{userData.email}</p>
            </div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>
              <FaPhone />
            </div>
            <div className={styles.detailContent}>
              <label>Contact Number</label>
              {isEditMode ? (
                <input
                  type="tel"
                  name="contactNumber"
                  value={editData.contactNumber || ''}
                  onChange={handleEditChange}
                  placeholder="Contact Number"
                  className={styles.editInput}
                />
              ) : (
                <p>{userData.contactNumber || 'Not provided'}</p>
              )}
            </div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>
              <FaMapMarkerAlt />
            </div>
            <div className={styles.detailContent}>
              <label>Address</label>
              {isEditMode ? (
                <textarea
                  name="address"
                  value={editData.address || ''}
                  onChange={handleEditChange}
                  placeholder="Address"
                  className={styles.editTextarea}
                  rows="3"
                />
              ) : (
                <p>{userData.address || 'Not provided'}</p>
              )}
            </div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>
              <FaCalendarAlt />
            </div>
            <div className={styles.detailContent}>
              <label>Birth Date</label>
              <p>{formatDate(userData.birthDate)}</p>
            </div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>
              <FaVenusMars />
            </div>
            <div className={styles.detailContent}>
              <label>Gender</label>
              {isEditMode ? (
                <select
                  name="gender"
                  value={editData.gender || ''}
                  onChange={handleEditChange}
                  className={styles.editSelect}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <p>{userData.gender || 'Not provided'}</p>
              )}
            </div>
          </div>

          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>
              <FaBriefcase />
            </div>
            <div className={styles.detailContent}>
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

          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>
              <FaPassport />
            </div>
            <div className={styles.detailContent}>
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

        <div className={styles.actions}>
          {!isEditMode ? (
            <button 
              onClick={handleEditToggle} 
              className={styles.editButton}
            >
              <FaEdit />
              <span>Edit Profile</span>
            </button>
          ) : (
            <>
              <button 
                onClick={handleSaveProfile} 
                className={styles.saveButton}
                disabled={isSaving}
              >
                <FaSave />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button 
                onClick={handleEditToggle} 
                className={styles.cancelButton}
                disabled={isSaving}
              >
                <FaUndo />
                <span>Cancel</span>
              </button>
            </>
          )}
          <button 
            onClick={() => setShowPasswordModal(true)} 
            className={styles.changePasswordButton}
          >
            <FaLock />
            <span>Change Password</span>
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Change Password</h3>
              <button onClick={closePasswordModal} className={styles.closeButton}>
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className={styles.passwordForm}>
              <div className={styles.formGroup}>
                <label>Current Password</label>
                <div className={styles.passwordInput}>
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className={styles.eyeButton}
                  >
                    {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>New Password</label>
                <div className={styles.passwordInput}>
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className={styles.eyeButton}
                  >
                    {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Confirm New Password</label>
                <div className={styles.passwordInput}>
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className={styles.eyeButton}
                  >
                    {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className={styles.errorMessage}>
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className={styles.successMessage}>
                  {passwordSuccess}
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className={styles.cancelButton}
                  disabled={isChangingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Crop Modal */}
      {showCropModal && selectedFile && (
        <div className={styles.modalOverlay}>
          <div className={styles.cropModal}>
            <div className={styles.modalHeader}>
              <h3>Adjust Profile Photo</h3>
              <button onClick={handleCropCancel} className={styles.closeButton}>
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.cropContainer}>
              <div className={styles.cropInstructions}>
                <p>Drag the circle to position your photo. Use the handles to resize, and the controls below to zoom and rotate.</p>
              </div>
              <div className={styles.cropPreview}>
                <div className={styles.cropArea}>
                  <Image
                    src={URL.createObjectURL(selectedFile)}
                    alt="Crop preview"
                    className={styles.cropImage}
                    width={400}
                    height={400}
                    style={{
                      transform: `rotate(${cropData.rotation}deg) scale(${cropData.scale})`,
                      transformOrigin: 'center'
                    }}
                  />
                  <div 
                    className={styles.cropOverlay}
                    style={{
                      left: cropData.x,
                      top: cropData.y,
                      width: cropData.width,
                      height: cropData.height
                    }}
                    onMouseDown={handleCropDragStart}
                  >
                    <div 
                      className={styles.cropHandle} 
                      style={{ top: '-5px', left: '-5px' }}
                      onMouseDown={(e) => handleCropResize(e, 'top-left')}
                    ></div>
                    <div 
                      className={styles.cropHandle} 
                      style={{ top: '-5px', right: '-5px' }}
                      onMouseDown={(e) => handleCropResize(e, 'top-right')}
                    ></div>
                    <div 
                      className={styles.cropHandle} 
                      style={{ bottom: '-5px', left: '-5px' }}
                      onMouseDown={(e) => handleCropResize(e, 'bottom-left')}
                    ></div>
                    <div 
                      className={styles.cropHandle} 
                      style={{ bottom: '-5px', right: '-5px' }}
                      onMouseDown={(e) => handleCropResize(e, 'bottom-right')}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className={styles.cropControls}>
                <div className={styles.cropControlGroup}>
                  <label>Zoom:</label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={cropData.scale}
                    onChange={(e) => setCropData(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                    className={styles.cropSlider}
                  />
                  <span>{Math.round(cropData.scale * 100)}%</span>
                </div>
                
                <div className={styles.cropControlGroup}>
                  <button
                    type="button"
                    onClick={handleRotate}
                    className={styles.rotateButton}
                  >
                    <FaRedo />
                    <span>Rotate</span>
                  </button>
                </div>
              </div>

              {photoError && (
                <div className={styles.errorMessage}>
                  {photoError}
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={handleCropCancel}
                  className={styles.cancelButton}
                  disabled={isCropping}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCropComplete}
                  className={styles.submitButton}
                  disabled={isCropping}
                >
                  {isCropping ? 'Processing...' : 'Save Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

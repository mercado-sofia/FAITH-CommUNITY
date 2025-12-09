'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiEdit3, FiUpload } from 'react-icons/fi';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/shared/portalAuth';
import { makeSuperadminRequest } from '@/utils/superadmin/apiClient';
import { getOrganizationImageUrl } from '@/utils/shared/uploadPaths';
import { API_BASE_URL } from '@/config/api';
import styles from './HeadManagement.module.css';

export default function HeadManagement({ showSuccessModal }) {
  const [headData, setHeadData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    position: 'Head of FACES',
    image_url: ''
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null); // For immediate preview of selected file

  // Load head data - only on mount to prevent race conditions
  useEffect(() => {
    let isMounted = true;
    
    const loadHeadData = async () => {
      try {
        const baseUrl = API_BASE_URL || '';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/heads-faces`,
          { method: 'GET' },
          'superadmin'
        );

        if (!isMounted) return;

        if (response && response.ok) {
          const data = await response.json();
          // Handle single profile - data.data is an array that may be empty or have one item
          const head = data.data && data.data.length > 0 ? data.data[0] : null;
          if (isMounted) {
            setHeadData(head);
            setFormData({
              name: head?.name || '',
              description: head?.description || '',
              position: head?.position || 'Head of FACES',
              image_url: head?.image_url || ''
            });
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Load error:', error);
          let errorMessage = 'Failed to load head data';
          
          if (error.message) {
            errorMessage = error.message;
          } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
          }
          
          showAuthError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadHeadData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Only run on mount - use response data after save instead of reloading

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showSuccessModal('Please select an image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        showSuccessModal('File size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL for immediate display
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }
  };

  // Upload image to Cloudinary
  const uploadImage = async (file) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const baseUrl = API_BASE_URL || '';
      // No need to check token - cookies handle authentication

      const uploadUrl = `${baseUrl}/api/superadmin/heads-faces/upload-image`;

      // Use centralized API client with automatic token refresh
      const response = await makeSuperadminRequest(
        uploadUrl,
        {
          method: 'POST',
          // Don't set Content-Type - browser will set it with boundary for FormData
          body: formData,
        },
        null // No router available
      );

      if (response.ok) {
        const data = await response.json();
        return data.data.url;
      } else {
        // If response is null, token refresh failed and redirect occurred
        if (!response) {
          throw new Error('Authentication expired. Please log in again.');
        }
        
        // Handle 401 responses (should not happen if token refresh worked)
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }
        
        // Handle CORS errors (status 0)
        if (response.status === 0) {
          throw new Error(`CORS error: Unable to connect to backend. Please check:\n1. Backend URL is correct (${baseUrl})\n2. CORS is configured on backend\n3. Backend is running`);
        }
        
        let errorMessage = 'Failed to upload image';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Upload error response:', errorData);
        } catch (e) {
          errorMessage = response.statusText || `Server error (${response.status})`;
          console.error('Non-JSON error response:', response.status, response.statusText);
        }
        throw new Error(`${errorMessage} (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Network errors, CORS errors, etc.
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Network error: Cannot connect to backend at ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`);
      }
      
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      setIsUpdating(true);
      
      let imageUrl = formData.image_url;
      
      // Upload image if a new file is selected
      if (selectedFile) {
        try {
        imageUrl = await uploadImage(selectedFile);
          // Clear preview URL after successful upload
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          showSuccessModal(uploadError.message || 'Failed to upload image. Please try again.');
          setIsUpdating(false);
          return;
        }
      }
      
      const submitData = {
        ...formData,
        image_url: imageUrl
      };
      
      const baseUrl = API_BASE_URL || '';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/heads-faces/manage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        },
        'superadmin'
      );

      if (response && response.ok) {
        const data = await response.json();
        setHeadData(data.data);
        setFormData({
          name: data.data.name || '',
          description: data.data.description || '',
          position: data.data.position || 'Head of FACES',
          image_url: data.data.image_url || ''
        });
        
        // Clean up preview URL if it still exists
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        setSelectedFile(null);
        setIsEditing(false);
        showSuccessModal('Head of FACES updated successfully!');
      } else {
        let errorMessage = 'Failed to update head of FACES';
        try {
          if (response) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error('Update error response:', errorData);
          }
        } catch (e) {
          errorMessage = response ? (response.statusText || `Server error (${response.status})`) : 'Network error';
          console.error('Non-JSON error response:', response?.status, response?.statusText);
        }
        showSuccessModal(`${errorMessage} (Status: ${response?.status || 'unknown'})`);
      }
    } catch (error) {
      console.error('Save error:', error);
      let errorMessage = 'Failed to save head data';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };


  // Handle cancel
  const handleCancel = () => {
    // Clean up preview URL if it exists
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    if (headData) {
      setFormData({
        name: headData.name || '',
        description: headData.description || '',
        position: headData.position || 'Head of FACES',
        image_url: headData.image_url || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        position: 'Head of FACES',
        image_url: ''
      });
    }
    setSelectedFile(null);
    setIsEditing(false);
  };
  
  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (isLoading) {
    return (
      <div className={styles.settingsPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <h2>Head Of FACES</h2>
            <p>Manage the head of FACES displayed on the public interface</p>
          </div>
        </div>
        <div className={styles.panelContent}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading head data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Head Of FACES</h2>
          <p>Manage the head of FACES displayed on the public interface</p>
        </div>
        <div className={styles.headerActions}>
          {!isEditing ? (
            <button
              className={styles.editBtn}
              onClick={() => setIsEditing(true)}
              disabled={isUpdating}
            >
              <FiEdit3 size={16} />
              Edit
            </button>
          ) : (
            <div className={styles.editActions}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancel}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={isUpdating || uploadingImage}
              >
                {uploadingImage ? 'Uploading Image...' : isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.panelContent}>
          <div className={styles.headCard}>
            {/* Profile Image Section */}
            <div className={styles.imageSection}>
              <div className={styles.imageContainer}>
                {uploadingImage ? (
                  <div className={styles.uploadingState}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Uploading image...</p>
                  </div>
                ) : previewUrl ? (
                  // Show preview of selected file immediately
                  <Image
                    src={previewUrl}
                    alt="Head of FACES Preview"
                    width={200}
                    height={200}
                    className={styles.profileImage}
                    unoptimized
                  />
                ) : formData.image_url ? (
                  // Show existing image from database
                  <Image
                    src={getOrganizationImageUrl(formData.image_url, 'head')}
                    alt="Head of FACES"
                    width={200}
                    height={200}
                    className={styles.profileImage}
                    unoptimized
                  />
                ) : (
                  <div className={styles.placeholderImage}>
                    <span>{formData.name.charAt(0).toUpperCase() || 'H'}</span>
                  </div>
                )}
                {isEditing && !uploadingImage && (
                  <div className={styles.imageOverlay}>
                    <label htmlFor="image-upload" className={styles.uploadButton}>
                      <FiUpload />
                      {selectedFile ? 'Change Image' : 'Upload Image'}
                    </label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className={styles.fileInput}
                      disabled={uploadingImage}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Profile Information Section */}
            <div className={styles.infoSection}>
              {isEditing ? (
                <div className={styles.editForm}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Name *</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Position</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="e.g., Head of FACES"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Description</label>
                    <textarea
                      className={styles.textArea}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter description"
                      rows={3}
                    />
                  </div>

                </div>
              ) : (
                <div className={styles.readOnlyInfo}>
                  <div className={styles.nameSection}>
                    <h3 className={styles.name}>{formData.name || 'No Name'}</h3>
                    <span className={styles.position}>{formData.position || 'Head of FACES'}</span>
                  </div>
                  
                  {formData.description && (
                    <p className={styles.description}>{formData.description}</p>
                  )}
                  
                  {!formData.name && !formData.description && (
                    <p className={styles.emptyMessage}>No information added yet. Click Edit to add details.</p>
                  )}
                </div>
              )}
            </div>

          </div>
      </div>

    </div>
  );
}

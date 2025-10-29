'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiEdit3, FiUpload } from 'react-icons/fi';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import { getOrganizationImageUrl } from '@/utils/uploadPaths';
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

  // Load head data
  useEffect(() => {
    const loadHeadData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/heads-faces`,
          { method: 'GET' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const head = data.data[0];
            setHeadData(head);
            setFormData({
              name: head.name || '',
              description: head.description || '',
              position: head.position || 'Head of FACES',
              image_url: head.image_url || ''
            });
          }
        }
      } catch (error) {
        showAuthError('Failed to load head data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadHeadData();
  }, [showSuccessModal]);

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        image_url: previewUrl
      }));
    }
  };

  // Upload image to Cloudinary
  const uploadImage = async (file) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const token = localStorage.getItem('superAdminToken');
      
      const response = await fetch(`${baseUrl}/api/superadmin/heads-faces/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.url;
      } else {
        throw new Error('Failed to upload image');
      }
    } catch (error) {
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
        imageUrl = await uploadImage(selectedFile);
      }
      
      const submitData = {
        ...formData,
        image_url: imageUrl
      };
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
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
        setSelectedFile(null);
        setIsEditing(false);
        showSuccessModal('Head of FACES updated successfully!');
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || 'Failed to update head of FACES');
      }
    } catch (error) {
      showSuccessModal('Failed to save head data. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };


  // Handle cancel
  const handleCancel = () => {
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
              {headData ? 'Edit' : 'Add Head'}
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
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.panelContent}>
        {!headData && !isEditing ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👤</div>
            <h3>No Head of FACES</h3>
            <p>Add a head of FACES to display on the public interface</p>
            <button
              className={styles.addButton}
              onClick={() => setIsEditing(true)}
            >
              Add Head of FACES
            </button>
          </div>
        ) : (
          <div className={styles.headCard}>
            {/* Profile Image Section */}
            <div className={styles.imageSection}>
              <div className={styles.imageContainer}>
                {formData.image_url ? (
                  <Image
                    src={getOrganizationImageUrl(formData.image_url, 'head')}
                    alt="Head of FACES"
                    width={200}
                    height={200}
                    className={styles.profileImage}
                  />
                ) : (
                  <div className={styles.placeholderImage}>
                    <span>{formData.name.charAt(0).toUpperCase() || 'H'}</span>
                  </div>
                )}
                {isEditing && (
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
                    <h3 className={styles.name}>{headData?.name || 'No Name'}</h3>
                    <span className={styles.position}>{headData?.position || 'Head of FACES'}</span>
                  </div>
                  
                  {headData?.description && (
                    <p className={styles.description}>{headData.description}</p>
                  )}
                  
                </div>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}

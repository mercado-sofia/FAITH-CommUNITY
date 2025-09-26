'use client';

import { useState, useEffect } from 'react';
import { FaUpload } from 'react-icons/fa';
import { FiTrash2, FiEdit3 } from 'react-icons/fi';
import Image from 'next/image';
import styles from './BrandingManagement.module.css';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { SkeletonLoader } from '../../../components';
import { useScrollPosition } from '@/hooks/useScrollPosition';

export default function BrandingManagementComponent({ showSuccessModal }) {
  const { preserveScrollPositionAsync } = useScrollPosition();
  const [brandingData, setBrandingData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Main edit state and temp data for batch save
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const [tempBrandingData, setTempBrandingData] = useState({});
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [isUpdatingBranding, setIsUpdatingBranding] = useState(false);
  
  // File selection states for batch upload
  const [selectedFiles, setSelectedFiles] = useState({});

  // Load branding data
  useEffect(() => {
    const loadBrandingData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/branding`,
          { method: 'GET' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setBrandingData(data.data);
        }
      } catch (error) {
        console.error('Error loading branding data:', error);
        showAuthError('Failed to load branding data. Please try again.');
      } finally {
      }
    };

    loadBrandingData();
  }, [showSuccessModal]);

  // Branding file upload handlers
  const handleFileUpload = async (file, type) => {
    try {
      console.log('Starting file upload:', { type, fileName: file.name, fileSize: file.size, fileType: file.type });
      
      const formData = new FormData();
      formData.append(type, file);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Get the token for manual request (to avoid Content-Type issues with FormData)
      const token = localStorage.getItem('superAdminToken');
      if (!token) {
        console.log('No token found');
        showSuccessModal('Authentication required. Please log in again.');
        return;
      }

      console.log('Making request to:', `${baseUrl}/api/superadmin/branding/upload-${type}`);

      const response = await fetch(`${baseUrl}/api/superadmin/branding/upload-${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData,
      });

      console.log('Response received:', { status: response.status, statusText: response.statusText });

      if (response.ok) {
        const data = await response.json();
        setBrandingData(prev => ({
          ...prev,
          [`${type}_url`]: data.data[`${type}_url`]
        }));
        showSuccessModal(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully!`);
      } else {
        // Handle 401 responses
        if (response.status === 401) {
          showSuccessModal('Authentication expired. Please log in again.');
          return;
        }
        
        let errorMessage = `Failed to upload ${type}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        showSuccessModal(errorMessage);
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      showSuccessModal(`Failed to upload ${type}. Please try again.`);
    }
  };

  const handleFileDelete = (type) => {
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteType) return;
    
    try {
      setIsDeleting(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/branding/${deleteType}`,
        { method: 'DELETE' },
        'superadmin'
      );

      if (response && response.ok) {
        setBrandingData(prev => ({
          ...prev,
          [`${deleteType}_url`]: null
        }));
        
        // Show correct success message based on delete type
        let successMessage;
        switch (deleteType) {
          case 'logo':
            successMessage = 'Logo deleted successfully!';
            break;
          case 'name':
            successMessage = 'Logo name deleted successfully!';
            break;
          case 'favicon':
            successMessage = 'Favicon deleted successfully!';
            break;
          default:
            successMessage = `${deleteType} deleted successfully!`;
        }
        
        showSuccessModal(successMessage);
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || `Failed to delete ${deleteType}`);
      }
    } catch (error) {
      console.error(`Error deleting ${deleteType}:`, error);
      showSuccessModal(`Failed to delete ${deleteType}. Please try again.`);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteType(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteType(null);
  };

  // Main edit toggle for Branding
  const handleEditToggle = () => {
    if (!isEditingBranding) {
      setTempBrandingData({
        logo_url: brandingData?.logo_url || '',
        logo_name: brandingData?.logo_name || '',
        favicon_url: brandingData?.favicon_url || ''
      });
    }
    setIsEditingBranding(!isEditingBranding);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setIsEditingBranding(false);
    setTempBrandingData({});
    setSelectedFiles({});
  };

  // Branding update handler
  const handleBrandingUpdate = () => {
    if (!tempBrandingData.logo_name?.trim()) {
      showSuccessModal('Logo name cannot be empty');
      return;
    }
    setShowBrandingModal(true);
  };

  // Confirm branding update with batch file uploads
  const handleBrandingConfirm = async () => {
    await preserveScrollPositionAsync(async () => {
      try {
        setIsUpdatingBranding(true);
        
        let finalBrandingData = { ...tempBrandingData };
        
        // Upload files if selected
        for (const [fileType, file] of Object.entries(selectedFiles)) {
          try {
            const fileUrl = await handleFileUpload(file, fileType);
            finalBrandingData[`${fileType}_url`] = fileUrl;
          } catch (error) {
            showSuccessModal(`Failed to upload ${fileType}. Please try again.`);
            return;
          }
        }
        setSelectedFiles({});
        
        // Save all branding data
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/branding`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(finalBrandingData),
          },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setBrandingData(data.data);
          setIsEditingBranding(false);
          showSuccessModal('Branding updated successfully! The changes will be visible on the public site immediately.');
        } else {
          const errorData = await response.json();
          showSuccessModal(errorData.message || 'Failed to update branding');
        }
      } catch (error) {
        console.error('Error updating branding:', error);
        showSuccessModal('Failed to update branding. Please try again.');
      } finally {
        setIsUpdatingBranding(false);
        setShowBrandingModal(false);
      }
    });
  };

  // Cancel branding update
  const handleBrandingCancel = () => {
    setShowBrandingModal(false);
  };


  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Site Branding</h2>
          <p>Upload and manage your site logo, logo name, and favicon</p>
        </div>
        <div className={styles.panelActions}>
          {isEditingBranding ? (
            <div className={styles.headerActions}>
              <button className={styles.cancelBtn} onClick={handleCancelEdit}>
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={handleBrandingUpdate}>
                Save Changes
              </button>
            </div>
          ) : (
            <button className={styles.editToggleBtn} onClick={handleEditToggle}>
              <FiEdit3 size={16} />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.brandingRow}>
          {/* Logo */}
          <div className={styles.brandingItem}>
            <div className={styles.itemHeader}>
              <span className={styles.itemLabel}>Logo</span>
              {isEditingBranding && brandingData?.logo_url && (
                <button 
                  className={styles.removeBtn}
                  onClick={() => handleFileDelete('logo')}
                  title="Remove logo"
                >
                  <FiTrash2 color="#dc2626" />
                </button>
              )}
            </div>
            
            {brandingData?.logo_url ? (
              <div className={styles.preview}>
                <Image 
                  src={brandingData.logo_url} 
                  alt="Logo" 
                  width={100}
                  height={100}
                  unoptimized
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            ) : selectedFiles.logo ? (
              <div className={styles.preview}>
                <Image 
                  src={URL.createObjectURL(selectedFiles.logo)} 
                  alt="Logo preview" 
                  width={100}
                  height={100}
                  unoptimized
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className={styles.emptyState}>No logo</div>
            )}
            
            {isEditingBranding && (
              <>
                {!selectedFiles.logo ? (
                  <div className={styles.fileInputContainer}>
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          setSelectedFiles(prev => ({ ...prev, logo: e.target.files[0] }));
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="logo-upload" className={styles.uploadBtn}>
                      <FaUpload /> Choose Logo
                    </label>
                  </div>
                ) : (
                  <div className={styles.uploadActions}>
                    <div className={styles.selectedFileInfo}>
                      <span className={styles.fileName}>{selectedFiles.logo.name}</span>
                      <span className={styles.fileSize}>
                        {(selectedFiles.logo.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <span className={styles.uploadNote}>
                        Logo will be uploaded when you save changes
                      </span>
                    </div>
                    <div className={styles.uploadButtons}>
                      <button
                        onClick={() => setSelectedFiles(prev => {
                          const newFiles = { ...prev };
                          delete newFiles.logo;
                          return newFiles;
                        })}
                        className={styles.cancelBtn}
                      >
                        Remove Selection
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Logo Name */}
          <div className={styles.brandingItem}>
            <div className={styles.itemHeader}>
              <span className={styles.itemLabel}>Logo Name</span>
              {isEditingBranding && brandingData?.name_url && (
                <button 
                  className={styles.removeBtn}
                  onClick={() => handleFileDelete('name')}
                  title="Remove logo name"
                >
                  <FiTrash2 color="#dc2626" />
                </button>
              )}
            </div>
            
            {brandingData?.name_url ? (
              <div className={styles.preview}>
                <Image 
                  src={brandingData.name_url} 
                  alt="Logo Name" 
                  width={100}
                  height={100}
                  unoptimized
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            ) : selectedFiles.name ? (
              <div className={styles.preview}>
                <Image 
                  src={URL.createObjectURL(selectedFiles.name)} 
                  alt="Logo name preview" 
                  width={100}
                  height={100}
                  unoptimized
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className={styles.emptyState}>No logo name</div>
            )}
            
            {isEditingBranding && (
              <>
                {!selectedFiles.name ? (
                  <div className={styles.fileInputContainer}>
                    <input
                      type="file"
                      id="name-upload"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          setSelectedFiles(prev => ({ ...prev, name: e.target.files[0] }));
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="name-upload" className={styles.uploadBtn}>
                      <FaUpload /> Choose Logo Name
                    </label>
                  </div>
                ) : (
                  <div className={styles.uploadActions}>
                    <div className={styles.selectedFileInfo}>
                      <span className={styles.fileName}>{selectedFiles.name.name}</span>
                      <span className={styles.fileSize}>
                        {(selectedFiles.name.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <span className={styles.uploadNote}>
                        Logo name will be uploaded when you save changes
                      </span>
                    </div>
                    <div className={styles.uploadButtons}>
                      <button
                        onClick={() => setSelectedFiles(prev => {
                          const newFiles = { ...prev };
                          delete newFiles.name;
                          return newFiles;
                        })}
                        className={styles.cancelBtn}
                      >
                        Remove Selection
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Favicon */}
          <div className={styles.brandingItem}>
            <div className={styles.itemHeader}>
              <span className={styles.itemLabel}>Favicon</span>
              {isEditingBranding && brandingData?.favicon_url && (
                <button 
                  className={styles.removeBtn}
                  onClick={() => handleFileDelete('favicon')}
                  title="Remove favicon"
                >
                  <FiTrash2 color="#dc2626" />
                </button>
              )}
            </div>
            
            {brandingData?.favicon_url ? (
              <div className={styles.preview}>
                <Image 
                  src={brandingData.favicon_url} 
                  alt="Favicon" 
                  width={64}
                  height={64}
                  unoptimized
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            ) : selectedFiles.favicon ? (
              <div className={styles.preview}>
                <Image 
                  src={URL.createObjectURL(selectedFiles.favicon)} 
                  alt="Favicon preview" 
                  width={64}
                  height={64}
                  unoptimized
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div className={styles.emptyState}>No favicon</div>
            )}
            
            {isEditingBranding && (
              <>
                {!selectedFiles.favicon ? (
                  <div className={styles.fileInputContainer}>
                    <input
                      type="file"
                      id="favicon-upload"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          setSelectedFiles(prev => ({ ...prev, favicon: e.target.files[0] }));
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="favicon-upload" className={styles.uploadBtn}>
                      <FaUpload /> Choose Favicon
                    </label>
                  </div>
                ) : (
                  <div className={styles.uploadActions}>
                    <div className={styles.selectedFileInfo}>
                      <span className={styles.fileName}>{selectedFiles.favicon.name}</span>
                      <span className={styles.fileSize}>
                        {(selectedFiles.favicon.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <span className={styles.uploadNote}>
                        Favicon will be uploaded when you save changes
                      </span>
                    </div>
                    <div className={styles.uploadButtons}>
                      <button
                        onClick={() => setSelectedFiles(prev => {
                          const newFiles = { ...prev };
                          delete newFiles.favicon;
                          return newFiles;
                        })}
                        className={styles.cancelBtn}
                      >
                        Remove Selection
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        itemName={deleteType}
        itemType={deleteType === 'name' ? 'logo name' : deleteType}
        actionType="delete"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
      
      <ConfirmationModal
        isOpen={showBrandingModal}
        itemName="Branding"
        itemType="all changes"
        actionType="save"
        onConfirm={handleBrandingConfirm}
        onCancel={handleBrandingCancel}
        isDeleting={isUpdatingBranding}
      />
    </div>
  );
}

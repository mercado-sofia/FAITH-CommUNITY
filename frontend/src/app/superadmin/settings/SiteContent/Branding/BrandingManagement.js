'use client';

import { useState, useEffect, useRef } from 'react';
import { FaUpload } from 'react-icons/fa';
import { FiTrash2, FiEdit3 } from 'react-icons/fi';
import Image from 'next/image';
import { mutate } from 'swr';
import styles from './BrandingManagement.module.css';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/shared/portalAuth';
import { makeSuperadminRequest } from '@/utils/superadmin/apiClient';
import { ConfirmationModal } from '@/components';
import { getBrandingImageUrl } from '@/utils/shared/uploadPaths';
import { API_BASE_URL } from '@/config/api';

export default function BrandingManagementComponent({ showSuccessModal }) {
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
  
  // Preview URLs for selected files (created when files are selected, not during render)
  const [previewUrls, setPreviewUrls] = useState({});
  
  // Track object URLs for cleanup to prevent memory leaks (keyed by file type)
  const objectUrlsRef = useRef(new Map());

  // Load branding data - only on mount to prevent race conditions
  useEffect(() => {
    let isMounted = true;
    
    const loadBrandingData = async () => {
      try {
        const baseUrl = API_BASE_URL || '';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/branding`,
          { method: 'GET' },
          'superadmin'
        );

        if (!isMounted) return;

        if (response && response.ok) {
          const data = await response.json();
          if (isMounted) {
            setBrandingData(data.data);
          }
        }
      } catch (error) {
        if (isMounted) {
          showAuthError('Failed to load branding data. Please try again.');
        }
      }
    };

    loadBrandingData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Only run on mount - use response data after save instead of reloading

  // Branding file upload handlers
  const handleFileUpload = async (file, type) => {
    try {
      // Validate file before creating FormData
      if (!file || !(file instanceof File)) {
        console.error('Invalid file object:', file);
        showSuccessModal(`Invalid file for ${type}. Please select a file again.`);
        return null;
      }
      
      const formData = new FormData();
      formData.append(type, file);
      
      // File info logged for debugging (can be removed in production)
      // console.log(`Uploading ${type}:`, {
      //   name: file.name,
      //   size: file.size,
      //   type: file.type,
      //   fieldName: type
      // });

      const baseUrl = API_BASE_URL || '';
      // No need to check token - cookies handle authentication

      const uploadUrl = `${baseUrl}/api/superadmin/branding/upload-${type}`;

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
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          console.error('Error parsing upload response:', parseError);
          showSuccessModal(`Failed to upload ${type}: Invalid response from server. Please try again.`);
          return null;
        }
        
        // Check if response has success flag and data
        if (!data.success) {
          const errorMessage = data.message || data.error || `Failed to upload ${type}`;
          console.error('Upload failed:', errorMessage);
          showSuccessModal(errorMessage);
          return null;
        }
        
        // Extract file URL from response data
        const fileUrl = data.data?.[`${type}_url`];
        
        if (!fileUrl) {
          console.error('Upload response missing file URL:', data);
          showSuccessModal(`Failed to upload ${type}: Server response missing file URL. Please try again.`);
          return null;
        }
        
        // Update state immediately for individual uploads
        setBrandingData(prev => ({
          ...prev,
          [`${type}_url`]: fileUrl
        }));
        
        // Invalidate SWR cache for public branding to force immediate refresh
        // This ensures the Navbar logo updates immediately after individual uploads
        // Use the same API_BASE_URL format as usePublicBranding hook for cache key matching
        try {
          const cacheKey = `${baseUrl}/api/superadmin/branding/public`;
          await mutate(cacheKey);
        } catch (cacheError) {
          // Cache invalidation failed - non-critical, continue
        }
        
        // Return the URL for batch uploads
        return fileUrl;
      } else {
        // If response is null, token refresh failed and redirect occurred
        if (!response) {
          showSuccessModal('Authentication expired. Please log in again.');
          return null;
        }
        
        // Handle 401 responses (should not happen if token refresh worked)
        if (response.status === 401) {
          showSuccessModal('Authentication expired. Please log in again.');
          return null;
        }
        
        // Handle CORS errors (status 0 or network errors)
        if (response.status === 0) {
          console.error('CORS or network error detected');
          showSuccessModal(`CORS error: Unable to connect to backend. Please check:\n1. Backend URL is correct (${baseUrl})\n2. CORS is configured on backend\n3. Backend is running`);
          return null;
        }
        
        let errorMessage = `Failed to upload ${type}`;
        try {
          const errorData = await response.json();
          // Backend returns { success: false, message: '...', error: '...' }
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Upload error response:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `Server error (${response.status})`;
          console.error('Non-JSON error response:', {
            status: response.status,
            statusText: response.statusText,
            parseError: e
          });
        }
        showSuccessModal(`${errorMessage}${response.status ? ` (Status: ${response.status})` : ''}`);
        return null;
      }
    } catch (error) {
      // Network errors, CORS errors, etc.
      console.error('Upload error:', error);
      let errorMessage = `Failed to upload ${type}`;
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend at ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      } else if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`;
      }
      
      showSuccessModal(errorMessage);
      return null;
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
      const baseUrl = API_BASE_URL || '';
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
        
        // Invalidate SWR cache for public branding to force immediate refresh
        // Use the same API_BASE_URL format as usePublicBranding hook for cache key matching
        try {
          const cacheKey = `${baseUrl}/api/superadmin/branding/public`;
          await mutate(cacheKey);
        } catch (cacheError) {
          // Cache invalidation failed - non-critical, continue
        }
        
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
        let errorMessage = `Failed to delete ${deleteType}`;
        try {
          if (response) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          }
        } catch (e) {
          // Response is not JSON or already consumed
          console.error('Error parsing delete response:', e);
        }
        showSuccessModal(errorMessage);
      }
    } catch (error) {
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
        name_url: brandingData?.name_url || '',
        favicon_url: brandingData?.favicon_url || ''
      });
    }
    setIsEditingBranding(!isEditingBranding);
  };

  // Helper function to create and track object URL (called when file is selected)
  const createTrackedObjectURL = (file, fileType) => {
    // Revoke previous URL for this file type if exists
    const existingUrl = objectUrlsRef.current.get(fileType);
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
    }
    
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.set(fileType, url);
    setPreviewUrls(prev => ({ ...prev, [fileType]: url }));
    return url;
  };
  
  // Helper function to revoke object URL for a specific file type
  const revokeObjectURL = (fileType) => {
    const url = objectUrlsRef.current.get(fileType);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(fileType);
    }
    setPreviewUrls(prev => {
      const newUrls = { ...prev };
      delete newUrls[fileType];
      return newUrls;
    });
  };
  
  // Cancel edit
  const handleCancelEdit = () => {
    // Clean up all object URLs when canceling edit
    objectUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    objectUrlsRef.current.clear();
    
    setIsEditingBranding(false);
    setTempBrandingData({});
    setSelectedFiles({});
    setPreviewUrls({});
  };
  
  // Cleanup object URLs on unmount
  useEffect(() => {
    const urlsMap = objectUrlsRef.current;
    return () => {
      urlsMap.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      urlsMap.clear();
    };
  }, []);

  // Branding update handler
  const handleBrandingUpdate = () => {
    // Check if there's either an existing logo name image or a selected file for upload
    const hasLogoName = brandingData?.name_url || selectedFiles.name;
    if (!hasLogoName) {
      showSuccessModal('Logo name image is required. Please upload a logo name image.');
      return;
    }
    setShowBrandingModal(true);
  };

  // Confirm branding update with batch file uploads
  const handleBrandingConfirm = async () => {
      try {
        setIsUpdatingBranding(true);
        
        let finalBrandingData = { ...tempBrandingData };
        
        // Upload files if selected
        for (const [fileType, file] of Object.entries(selectedFiles)) {
          try {
            // Validate file exists and is a File object
            if (!file || !(file instanceof File)) {
              console.error(`Invalid file for ${fileType}:`, file);
              showSuccessModal(`Invalid file selected for ${fileType}. Please select a file again.`);
              setIsUpdatingBranding(false);
              setShowBrandingModal(false);
              return;
            }
            
            const fileUrl = await handleFileUpload(file, fileType);
            if (!fileUrl) {
              // handleFileUpload already shows error message, just reset state and return
              setIsUpdatingBranding(false);
              setShowBrandingModal(false);
              return;
            }
            // Map file type to correct field name
            const fieldMap = {
              'logo': 'logo_url',
              'name': 'name_url',
              'favicon': 'favicon_url'
            };
            const fieldName = fieldMap[fileType] || `${fileType}_url`;
            finalBrandingData[fieldName] = fileUrl;
          } catch (error) {
            // handleFileUpload should handle most errors, but catch any unexpected errors
            console.error(`Unexpected error uploading ${fileType}:`, error);
            showSuccessModal(`Failed to upload ${fileType}: ${error.message || 'Unknown error'}. Please try again.`);
            setIsUpdatingBranding(false);
            setShowBrandingModal(false);
            return;
          }
        }
        
        // Clear selected files and object URLs only after all uploads succeed
        objectUrlsRef.current.forEach((url) => {
          URL.revokeObjectURL(url);
        });
        objectUrlsRef.current.clear();
        setSelectedFiles({});
        setPreviewUrls({});
        
        // Save all branding data
        const baseUrl = API_BASE_URL || '';
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
          
          // Invalidate SWR cache for public branding to force immediate refresh
          try {
            await mutate(`${baseUrl}/api/superadmin/branding/public`);
          } catch (cacheError) {
            // Cache invalidation failed - non-critical, continue
          }
          
          showSuccessModal('Branding updated successfully! The changes will be visible on the public site immediately.');
        } else {
          let errorMessage = 'Failed to update branding';
          try {
            if (response) {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
            }
          } catch (e) {
            // Response is not JSON or already consumed
            console.error('Error parsing update response:', e);
          }
          showSuccessModal(errorMessage);
        }
      } catch (error) {
        showSuccessModal('Failed to update branding. Please try again.');
      } finally {
        setIsUpdatingBranding(false);
        setShowBrandingModal(false);
      }
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
        <div className={styles.headerActions}>
          {isEditingBranding ? (
            <>
              <button
                onClick={handleCancelEdit}
                className={styles.cancelBtn}
                disabled={isUpdatingBranding}
              >
                Cancel
              </button>
              <button
                onClick={handleBrandingUpdate}
                disabled={isUpdatingBranding}
                className={styles.saveBtn}
              >
                {isUpdatingBranding ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={handleEditToggle}
              className={styles.editToggleBtn}
              disabled={isUpdatingBranding}
            >
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
                  src={getBrandingImageUrl(brandingData.logo_url, 'logo')} 
                  alt="Logo" 
                  width={100}
                  height={100}
                  unoptimized
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            ) : selectedFiles.logo && previewUrls.logo ? (
              <div className={styles.preview}>
                <Image 
                  src={previewUrls.logo} 
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
                          const file = e.target.files[0];
                          setSelectedFiles(prev => ({ ...prev, logo: file }));
                          createTrackedObjectURL(file, 'logo');
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
                        onClick={() => {
                          // Clean up object URL for logo
                          revokeObjectURL('logo');
                          
                          setSelectedFiles(prev => {
                            const newFiles = { ...prev };
                            delete newFiles.logo;
                            return newFiles;
                          });
                        }}
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
                  src={getBrandingImageUrl(brandingData.name_url, 'name')} 
                  alt="Logo Name" 
                  width={100}
                  height={100}
                  unoptimized
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            ) : selectedFiles.name && previewUrls.name ? (
              <div className={styles.preview}>
                <Image 
                  src={previewUrls.name} 
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
                          const file = e.target.files[0];
                          setSelectedFiles(prev => ({ ...prev, name: file }));
                          createTrackedObjectURL(file, 'name');
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
                        onClick={() => {
                          // Clean up object URL for name
                          revokeObjectURL('name');
                          
                          setSelectedFiles(prev => {
                            const newFiles = { ...prev };
                            delete newFiles.name;
                            return newFiles;
                          });
                        }}
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
                  src={getBrandingImageUrl(brandingData.favicon_url, 'favicon')} 
                  alt="Favicon" 
                  width={64}
                  height={64}
                  unoptimized
                  style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                />
              </div>
            ) : selectedFiles.favicon && previewUrls.favicon ? (
              <div className={styles.preview}>
                <Image 
                  src={previewUrls.favicon} 
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
                          const file = e.target.files[0];
                          setSelectedFiles(prev => ({ ...prev, favicon: file }));
                          createTrackedObjectURL(file, 'favicon');
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
                        onClick={() => {
                          // Clean up object URL for favicon
                          revokeObjectURL('favicon');
                          
                          setSelectedFiles(prev => {
                            const newFiles = { ...prev };
                            delete newFiles.favicon;
                            return newFiles;
                          });
                        }}
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
        actionType="update"
        onConfirm={handleBrandingConfirm}
        onCancel={handleBrandingCancel}
        isDeleting={isUpdatingBranding}
      />
    </div>
  );
}
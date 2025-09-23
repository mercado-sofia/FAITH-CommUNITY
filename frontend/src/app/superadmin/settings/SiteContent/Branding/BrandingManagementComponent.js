'use client';

import { useState, useEffect } from 'react';
import { FaUpload } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import Image from 'next/image';
import styles from './BrandingManagement.module.css';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import ConfirmationModal from '../../../components/ConfirmationModal';

export default function BrandingManagementComponent({ showSuccessModal }) {
  const [brandingData, setBrandingData] = useState(null);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load branding data
  useEffect(() => {
    const loadBrandingData = async () => {
      try {
        setBrandingLoading(true);
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
        setBrandingLoading(false);
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

  if (brandingLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading branding settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Site Branding</h2>
          <p>Upload and manage your site logo, logo name, and favicon</p>
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.brandingRow}>
          {/* Logo */}
          <div className={styles.brandingItem}>
            <div className={styles.itemHeader}>
              <span className={styles.itemLabel}>Logo</span>
              {brandingData?.logo_url && (
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
            ) : (
              <div className={styles.emptyState}>No logo</div>
            )}
            
            <input
              type="file"
              id="logo-upload"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleFileUpload(e.target.files[0], 'logo');
                }
              }}
              style={{ display: 'none' }}
            />
            <label htmlFor="logo-upload" className={styles.uploadBtn}>
              <FaUpload /> Upload
            </label>
          </div>

          {/* Logo Name */}
          <div className={styles.brandingItem}>
            <div className={styles.itemHeader}>
              <span className={styles.itemLabel}>Logo Name</span>
              {brandingData?.name_url && (
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
            ) : (
              <div className={styles.emptyState}>No logo name</div>
            )}
            
            <input
              type="file"
              id="name-upload"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleFileUpload(e.target.files[0], 'name');
                }
              }}
              style={{ display: 'none' }}
            />
            <label htmlFor="name-upload" className={styles.uploadBtn}>
              <FaUpload /> Upload
            </label>
          </div>

          {/* Favicon */}
          <div className={styles.brandingItem}>
            <div className={styles.itemHeader}>
              <span className={styles.itemLabel}>Favicon</span>
              {brandingData?.favicon_url && (
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
            ) : (
              <div className={styles.emptyState}>No favicon</div>
            )}
            
            <input
              type="file"
              id="favicon-upload"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleFileUpload(e.target.files[0], 'favicon');
                }
              }}
              style={{ display: 'none' }}
            />
            <label htmlFor="favicon-upload" className={styles.uploadBtn}>
              <FaUpload /> Upload
            </label>
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
    </div>
  );
}

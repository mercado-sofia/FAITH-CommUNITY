'use client';

import { useState, useEffect } from 'react';
import { FaUpload, FaTrash } from 'react-icons/fa';
import Image from 'next/image';
import styles from './BrandingManagement.module.css';
import { makeAuthenticatedRequest, showAuthError } from '../../../../../utils/adminAuth';

export default function BrandingManagement({ showSuccessModal }) {
  const [brandingData, setBrandingData] = useState(null);
  const [brandingLoading, setBrandingLoading] = useState(false);

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

  const handleFileDelete = async (type) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/branding/${type}`,
        { method: 'DELETE' },
        'superadmin'
      );

      if (response && response.ok) {
        setBrandingData(prev => ({
          ...prev,
          [`${type}_url`]: null
        }));
        showSuccessModal(`${type === 'logo' ? 'Logo' : 'Favicon'} deleted successfully!`);
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || `Failed to delete ${type}`);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      showSuccessModal(`Failed to delete ${type}. Please try again.`);
    }
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
    <div className={styles.brandingContainer}>
      {/* Branding Management */}
      <div className={styles.settingsPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <h2>Site Branding</h2>
            <p>Upload and manage your site logo and favicon</p>
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
                    <FaTrash />
                  </button>
                )}
              </div>
              
              {brandingData?.logo_url ? (
                <div className={styles.preview}>
                  <Image 
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${brandingData.logo_url}`} 
                    alt="Logo" 
                    width={60}
                    height={30}
                    unoptimized
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
                    <FaTrash />
                  </button>
                )}
              </div>
              
              {brandingData?.favicon_url ? (
                <div className={styles.preview}>
                  <Image 
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${brandingData.favicon_url}`} 
                    alt="Favicon" 
                    width={24}
                    height={24}
                    unoptimized
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
      </div>
    </div>
  );
}

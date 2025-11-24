'use client';

import { useState, useEffect } from 'react';
import { FiEdit3 } from 'react-icons/fi';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import { ConfirmationModal } from '@/components';
import styles from './SiteNameManagement.module.css';

export default function SiteNameManagement({ showSuccessModal }) {
  const [siteNameData, setSiteNameData] = useState(null);
  const [siteName, setSiteName] = useState('');
  const [isUpdatingSiteName, setIsUpdatingSiteName] = useState(false);
  const [showSiteNameModal, setShowSiteNameModal] = useState(false);
  
  // Edit mode state
  const [isEditingSiteName, setIsEditingSiteName] = useState(false);
  const [tempSiteName, setTempSiteName] = useState('');

  // Load site name data
  useEffect(() => {
    const loadSiteNameData = async () => {
      try {
        const { API_BASE_URL } = await import('@/config/api');
        const baseUrl = API_BASE_URL || '';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/branding/site-name`,
          { method: 'GET' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          const defaultSiteName = 'FAITH CommUNITY';
          let siteNameValue = data.data?.site_name || '';
          
          // Auto-insert site name if it doesn't exist in database
          if (!siteNameValue) {
            try {
              const insertResponse = await makeAuthenticatedRequest(
                `${baseUrl}/api/superadmin/branding/site-name`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ site_name: defaultSiteName }),
                },
                'superadmin'
              );
              
              if (insertResponse && insertResponse.ok) {
                siteNameValue = defaultSiteName;
              } else {
                // If auto-insert fails, use default for display
                siteNameValue = defaultSiteName;
              }
            } catch (error) {
              console.error('Auto-insert site name error:', error);
              // Use default for display even if auto-insert fails
              siteNameValue = defaultSiteName;
            }
          }
          
          setSiteNameData(data.data || { site_name: siteNameValue });
          setSiteName(siteNameValue);
          setTempSiteName(siteNameValue);
        }
      } catch (error) {
        console.error('Load error:', error);
        let errorMessage = 'Failed to load site name data';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
        }
        
        showAuthError(errorMessage);
      }
    };

    loadSiteNameData();
  }, [showSuccessModal]);

  // Edit toggle function
  const handleEditToggle = () => {
    setIsEditingSiteName(!isEditingSiteName);
    if (!isEditingSiteName) {
      setTempSiteName(siteName);
    }
  };

  // Cancel edit function
  const handleCancelEdit = () => {
    setIsEditingSiteName(false);
    setTempSiteName(siteName);
  };

  // Site name update handler
  const handleSiteNameUpdate = () => {
    if (!tempSiteName.trim()) {
      showSuccessModal('Site name cannot be empty');
      return;
    }
    setShowSiteNameModal(true);
  };

  // Confirm site name update
  const handleSiteNameConfirm = async () => {
    try {
      setIsUpdatingSiteName(true);
      const { API_BASE_URL } = await import('@/config/api');
      const baseUrl = API_BASE_URL || '';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/branding/site-name`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ site_name: tempSiteName.trim() }),
        },
        'superadmin'
      );

      if (response && response.ok) {
        const data = await response.json();
        setSiteNameData(data.data);
        setSiteName(tempSiteName.trim());
        setIsEditingSiteName(false);
        showSuccessModal('Site name updated successfully! The changes will be visible on the public site immediately.');
      } else {
        // Handle 401 responses
        if (response.status === 401) {
          showSuccessModal('Authentication expired. Please log in again.');
          return;
        }
        
        // Handle CORS errors (status 0)
        if (response.status === 0) {
          console.error('CORS or network error detected');
          showSuccessModal(`CORS error: Unable to connect to backend. Please check:\n1. Backend URL is correct (${baseUrl})\n2. CORS is configured on backend\n3. Backend is running`);
          return;
        }
        
        let errorMessage = 'Failed to update site name';
        try {
        const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Update error response:', errorData);
        } catch (e) {
          errorMessage = response.statusText || `Server error (${response.status})`;
          console.error('Non-JSON error response:', response.status, response.statusText);
        }
        showSuccessModal(`${errorMessage} (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Update error:', error);
      let errorMessage = 'Failed to update site name';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
    } finally {
      setIsUpdatingSiteName(false);
      setShowSiteNameModal(false);
    }
  };

  // Cancel site name update
  const handleSiteNameCancel = () => {
    setShowSiteNameModal(false);
  };


  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Site Name</h2>
          <p>Manage your site name that appears in the footer and FAQs page</p>
        </div>
        <div className={styles.headerActions}>
          {isEditingSiteName ? (
            <>
              <button
                onClick={handleCancelEdit}
                className={styles.cancelBtn}
                disabled={isUpdatingSiteName}
              >
                Cancel
              </button>
              <button
                onClick={handleSiteNameUpdate}
                disabled={isUpdatingSiteName || !tempSiteName.trim()}
                className={styles.saveBtn}
              >
                {isUpdatingSiteName ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={handleEditToggle}
              className={styles.editToggleBtn}
              disabled={isUpdatingSiteName}
            >
              <FiEdit3 size={16} />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.siteNameSection}>
          <div className={styles.inputGroup}>
            <label htmlFor="site-name" className={styles.inputLabel}>
              Site Name
            </label>
            <input
              type="text"
              id="site-name"
              value={isEditingSiteName ? tempSiteName : siteName}
              onChange={(e) => isEditingSiteName ? 
                setTempSiteName(e.target.value) :
                setSiteName(e.target.value)
              }
              className={styles.textInput}
              placeholder="Enter site name"
              maxLength={255}
              disabled={!isEditingSiteName}
            />
          </div>
        </div>
      </div>

      {/* Site Name Update Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSiteNameModal}
        itemName={tempSiteName}
        itemType="site name"
        actionType="update"
        onConfirm={handleSiteNameConfirm}
        onCancel={handleSiteNameCancel}
        isDeleting={isUpdatingSiteName}
        customMessage="This will update the site name across the entire public website, including the footer and FAQs page. The changes will be visible immediately."
      />
    </div>
  );
}

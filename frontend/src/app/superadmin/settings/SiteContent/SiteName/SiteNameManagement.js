'use client';

import { useState, useEffect } from 'react';
import { FiEdit3, FiXCircle } from 'react-icons/fi';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import ConfirmationModal from '../../../components/ConfirmationModal';
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
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/branding/site-name`,
          { method: 'GET' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setSiteNameData(data.data);
          setSiteName(data.data.site_name || '');
          setTempSiteName(data.data.site_name || '');
        }
      } catch (error) {
        console.error('Error loading site name data:', error);
        showAuthError('Failed to load site name data. Please try again.');
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
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
        const errorData = await response.json();
        showSuccessModal(errorData.message || 'Failed to update site name');
      }
    } catch (error) {
      console.error('Error updating site name:', error);
      showSuccessModal('Failed to update site name. Please try again.');
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

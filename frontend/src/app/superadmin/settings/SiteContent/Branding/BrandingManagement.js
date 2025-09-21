'use client';

import { useState, useEffect } from 'react';
import { FaUpload, FaTrash } from 'react-icons/fa';
import Image from 'next/image';
import styles from './BrandingManagement.module.css';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import ConfirmationModal from '../../../components/ConfirmationModal';

export default function BrandingManagement({ showSuccessModal }) {
  const [brandingData, setBrandingData] = useState(null);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Site name state
  const [siteNameData, setSiteNameData] = useState(null);
  const [siteNameLoading, setSiteNameLoading] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [isUpdatingSiteName, setIsUpdatingSiteName] = useState(false);
  const [showSiteNameModal, setShowSiteNameModal] = useState(false);

  // Footer content state
  const [footerData, setFooterData] = useState(null);
  const [footerLoading, setFooterLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState({ phone: '', email: '' });
  const [socialMedia, setSocialMedia] = useState({ facebook: '', instagram: '', twitter: '' });
  const [copyright, setCopyright] = useState('');
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState('');
  const [isUpdatingFooter, setIsUpdatingFooter] = useState(false);
  const [showFooterModal, setShowFooterModal] = useState(false);
  const [footerModalType, setFooterModalType] = useState('');

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

  // Load site name data
  useEffect(() => {
    const loadSiteNameData = async () => {
      try {
        setSiteNameLoading(true);
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
        }
      } catch (error) {
        console.error('Error loading site name data:', error);
        showAuthError('Failed to load site name data. Please try again.');
      } finally {
        setSiteNameLoading(false);
      }
    };

    loadSiteNameData();
  }, [showSuccessModal]);

  // Load footer data
  useEffect(() => {
    const loadFooterData = async () => {
      try {
        setFooterLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/footer`,
          { method: 'GET' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setFooterData(data.data);
          
          // Set contact info
          if (data.data.contact) {
            setContactInfo({
              phone: data.data.contact.phone?.url || '',
              email: data.data.contact.email?.url || ''
            });
          }
          
          // Set social media
          if (data.data.socialMedia) {
            setSocialMedia({
              facebook: data.data.socialMedia.facebook?.url || '',
              instagram: data.data.socialMedia.instagram?.url || '',
              twitter: data.data.socialMedia.twitter?.url || ''
            });
          }
          
          // Set copyright
          setCopyright(data.data.copyright?.content || '');
          
          // Set services
          setServices(data.data.services || []);
        }
      } catch (error) {
        console.error('Error loading footer data:', error);
        showAuthError('Failed to load footer data. Please try again.');
      } finally {
        setFooterLoading(false);
      }
    };

    loadFooterData();
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

  // Site name update handler
  const handleSiteNameUpdate = () => {
    if (!siteName.trim()) {
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
          body: JSON.stringify({ site_name: siteName.trim() }),
        },
        'superadmin'
      );

      if (response && response.ok) {
        const data = await response.json();
        setSiteNameData(data.data);
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

  // Footer update handlers
  const handleContactUpdate = () => {
    setFooterModalType('contact');
    setShowFooterModal(true);
  };

  const handleSocialMediaUpdate = () => {
    setFooterModalType('social');
    setShowFooterModal(true);
  };

  const handleCopyrightUpdate = () => {
    setFooterModalType('copyright');
    setShowFooterModal(true);
  };

  const handleAddService = async () => {
    if (!newService.trim()) {
      showSuccessModal('Service name cannot be empty');
      return;
    }

    try {
      setIsUpdatingFooter(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/footer/services`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newService.trim() }),
        },
        'superadmin'
      );

      if (response && response.ok) {
        const data = await response.json();
        setServices(prev => [...prev, data.data]);
        setNewService('');
        showSuccessModal('Service added successfully!');
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || 'Failed to add service');
      }
    } catch (error) {
      console.error('Error adding service:', error);
      showSuccessModal('Failed to add service. Please try again.');
    } finally {
      setIsUpdatingFooter(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    try {
      setIsUpdatingFooter(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/footer/services/${serviceId}`,
        { method: 'DELETE' },
        'superadmin'
      );

      if (response && response.ok) {
        setServices(prev => prev.filter(service => service.id !== serviceId));
        showSuccessModal('Service deleted successfully!');
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || 'Failed to delete service');
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      showSuccessModal('Failed to delete service. Please try again.');
    } finally {
      setIsUpdatingFooter(false);
    }
  };

  const handleFooterConfirm = async () => {
    try {
      setIsUpdatingFooter(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      let endpoint = '';
      let body = {};

      switch (footerModalType) {
        case 'contact':
          endpoint = '/contact';
          body = contactInfo;
          break;
        case 'social':
          endpoint = '/social-media';
          body = socialMedia;
          break;
        case 'copyright':
          endpoint = '/copyright';
          body = { content: copyright };
          break;
        default:
          return;
      }

      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/footer${endpoint}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
        'superadmin'
      );

      if (response && response.ok) {
        showSuccessModal('Footer content updated successfully! The changes will be visible on the public site immediately.');
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || 'Failed to update footer content');
      }
    } catch (error) {
      console.error('Error updating footer content:', error);
      showSuccessModal('Failed to update footer content. Please try again.');
    } finally {
      setIsUpdatingFooter(false);
      setShowFooterModal(false);
      setFooterModalType('');
    }
  };

  const handleFooterCancel = () => {
    setShowFooterModal(false);
    setFooterModalType('');
  };


  if (brandingLoading || siteNameLoading || footerLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.brandingContainer}>
      {/* Site Name Management */}
      <div className={styles.settingsPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <h2>Site Name</h2>
            <p>Manage your site name that appears in the footer and FAQs page</p>
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
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className={styles.textInput}
                placeholder="Enter site name"
                maxLength={255}
              />
              <button
                onClick={handleSiteNameUpdate}
                disabled={isUpdatingSiteName || !siteName.trim()}
                className={styles.updateBtn}
              >
                {isUpdatingSiteName ? 'Updating...' : 'Update Site Name'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Content Management */}
      <div className={styles.settingsPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <h2>Footer Content</h2>
            <p>Manage contact information, services, social media links, and copyright text</p>
          </div>
        </div>

        <div className={styles.panelContent}>
          <div className={styles.footerSections}>
            {/* Contact Information */}
            <div className={styles.footerSection}>
              <h3>Contact Information</h3>
              <div className={styles.inputGroup}>
                <label htmlFor="phone" className={styles.inputLabel}>Phone Number</label>
                <input
                  type="text"
                  id="phone"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className={styles.textInput}
                  placeholder="Enter phone number"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.inputLabel}>Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                  className={styles.textInput}
                  placeholder="Enter email address"
                />
              </div>
              <button
                onClick={handleContactUpdate}
                className={styles.updateBtn}
              >
                Update Contact Info
              </button>
            </div>

            {/* Social Media */}
            <div className={styles.footerSection}>
              <h3>Social Media URLs</h3>
              <div className={styles.inputGroup}>
                <label htmlFor="facebook" className={styles.inputLabel}>Facebook URL</label>
                <input
                  type="url"
                  id="facebook"
                  value={socialMedia.facebook}
                  onChange={(e) => setSocialMedia(prev => ({ ...prev, facebook: e.target.value }))}
                  className={styles.textInput}
                  placeholder="Enter Facebook URL"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="instagram" className={styles.inputLabel}>Instagram URL</label>
                <input
                  type="url"
                  id="instagram"
                  value={socialMedia.instagram}
                  onChange={(e) => setSocialMedia(prev => ({ ...prev, instagram: e.target.value }))}
                  className={styles.textInput}
                  placeholder="Enter Instagram URL"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="twitter" className={styles.inputLabel}>X (Twitter) URL</label>
                <input
                  type="url"
                  id="twitter"
                  value={socialMedia.twitter}
                  onChange={(e) => setSocialMedia(prev => ({ ...prev, twitter: e.target.value }))}
                  className={styles.textInput}
                  placeholder="Enter X (Twitter) URL"
                />
              </div>
              <button
                onClick={handleSocialMediaUpdate}
                className={styles.updateBtn}
              >
                Update Social Media
              </button>
            </div>

            {/* Services */}
            <div className={styles.footerSection}>
              <h3>Our Services</h3>
              <div className={styles.servicesList}>
                {services.map((service) => (
                  <div key={service.id} className={styles.serviceItem}>
                    <span>{service.name}</span>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className={styles.deleteServiceBtn}
                      disabled={isUpdatingFooter}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
              <div className={styles.addServiceGroup}>
                <input
                  type="text"
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className={styles.textInput}
                  placeholder="Enter new service name"
                  style={{
                    flex: 1,
                    height: '48px',
                    padding: '0.75rem',
                    fontSize: '14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: 'white',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    boxSizing: 'border-box',
                    fontFamily: 'var(--font-poppins), sans-serif'
                  }}
                />
                <button
                  onClick={handleAddService}
                  disabled={isUpdatingFooter || !newService.trim()}
                  className={styles.addServiceBtn}
                  style={{
                    flexShrink: 0,
                    minWidth: '120px',
                    height: '48px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '14px',
                    fontWeight: 500,
                    background: 'white',
                    color: '#000',
                    border: '1px solid #000',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'center',
                    gap: 0,
                    fontFamily: 'var(--font-poppins), sans-serif'
                  }}
                >
                  {isUpdatingFooter ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </div>

            {/* Copyright */}
            <div className={styles.footerSection}>
              <h3>Copyright Text</h3>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  id="copyright"
                  value={copyright}
                  onChange={(e) => setCopyright(e.target.value)}
                  className={styles.textInput}
                  placeholder="Enter copyright text"
                />
              </div>
              <button
                onClick={handleCopyrightUpdate}
                className={styles.updateBtn}
              >
                Update Copyright
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Branding Management */}
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
                    <FaTrash />
                  </button>
                )}
              </div>
              
              {brandingData?.logo_url ? (
                <div className={styles.preview}>
                  <Image 
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${brandingData.logo_url}`} 
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
                    <FaTrash />
                  </button>
                )}
              </div>
              
              {brandingData?.name_url ? (
                <div className={styles.preview}>
                  <Image 
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${brandingData.name_url}`} 
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
                    <FaTrash />
                  </button>
                )}
              </div>
              
              {brandingData?.favicon_url ? (
                <div className={styles.preview}>
                  <Image 
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${brandingData.favicon_url}`} 
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

      {/* Site Name Update Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSiteNameModal}
        itemName={siteName}
        itemType="site name"
        actionType="update"
        onConfirm={handleSiteNameConfirm}
        onCancel={handleSiteNameCancel}
        isDeleting={isUpdatingSiteName}
        customMessage="This will update the site name across the entire public website, including the footer and FAQs page. The changes will be visible immediately."
      />

      {/* Footer Content Update Confirmation Modal */}
      <ConfirmationModal
        isOpen={showFooterModal}
        itemName={
          footerModalType === 'contact' ? 'Contact Information' :
          footerModalType === 'social' ? 'Social Media URLs' :
          footerModalType === 'copyright' ? 'Copyright Text' : ''
        }
        itemType="footer content"
        actionType="update"
        onConfirm={handleFooterConfirm}
        onCancel={handleFooterCancel}
        isDeleting={isUpdatingFooter}
        customMessage="This will update the footer content across the entire public website. The changes will be visible immediately."
      />
    </div>
  );
}

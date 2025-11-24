'use client';

import { useState, useEffect } from 'react';
import { FiTrash2, FiPlus, FiX, FiEdit3 } from 'react-icons/fi';
import { 
  FaFacebook, 
  FaInstagram, 
  FaYoutube, 
  FaLinkedin, 
  FaTiktok, 
  FaPinterest, 
  FaSnapchat, 
  FaWhatsapp, 
  FaTelegram, 
  FaDiscord, 
  FaReddit, 
  FaTwitch, 
  FaSpotify, 
  FaApple, 
  FaGoogle, 
  FaGithub, 
  FaDribbble, 
  FaBehance, 
  FaMedium, 
  FaVimeo, 
  FaSkype, 
  FaSlack 
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { mutate } from 'swr';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import { ConfirmationModal } from '@/components';
import styles from './FooterContentManagement.module.css';

// Social media platform mapping with icons
const SOCIAL_PLATFORMS = [
  { name: 'Facebook', icon: FaFacebook, color: '#1877F2' },
  { name: 'Instagram', icon: FaInstagram, color: '#E4405F' },
  { name: 'X', icon: FaXTwitter, color: '#000000' },
  { name: 'YouTube', icon: FaYoutube, color: '#FF0000' },
  { name: 'LinkedIn', icon: FaLinkedin, color: '#0077B5' },
  { name: 'TikTok', icon: FaTiktok, color: '#000000' },
  { name: 'Pinterest', icon: FaPinterest, color: '#BD081C' },
  { name: 'Snapchat', icon: FaSnapchat, color: '#FFFC00' },
  { name: 'WhatsApp', icon: FaWhatsapp, color: '#25D366' },
  { name: 'Telegram', icon: FaTelegram, color: '#0088CC' },
  { name: 'Discord', icon: FaDiscord, color: '#5865F2' },
  { name: 'Reddit', icon: FaReddit, color: '#FF4500' },
  { name: 'Twitch', icon: FaTwitch, color: '#9146FF' },
  { name: 'Spotify', icon: FaSpotify, color: '#1DB954' },
  { name: 'Apple Music', icon: FaApple, color: '#FA243C' },
  { name: 'Google', icon: FaGoogle, color: '#4285F4' },
  { name: 'GitHub', icon: FaGithub, color: '#333333' },
  { name: 'Dribbble', icon: FaDribbble, color: '#EA4C89' },
  { name: 'Behance', icon: FaBehance, color: '#1769FF' },
  { name: 'Medium', icon: FaMedium, color: '#00AB6C' },
  { name: 'Vimeo', icon: FaVimeo, color: '#1AB7EA' },
  { name: 'Skype', icon: FaSkype, color: '#00AFF0' },
  { name: 'Slack', icon: FaSlack, color: '#4A154B' }
];

export default function FooterContentManagement({ showSuccessModal }) {
  const [footerData, setFooterData] = useState(null);
  const [contactInfo, setContactInfo] = useState({ phone: '', email: '' });
  const [socialMedia, setSocialMedia] = useState([]);
  const [copyright, setCopyright] = useState('');
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState('');
  const [isUpdatingFooter, setIsUpdatingFooter] = useState(false);
  const [showFooterModal, setShowFooterModal] = useState(false);
  const [footerModalType, setFooterModalType] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingFromEditMode, setIsDeletingFromEditMode] = useState(false);
  const [showAddSocialModal, setShowAddSocialModal] = useState(false);
  const [newSocialPlatform, setNewSocialPlatform] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  
  // Edit mode states for each section
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingSocial, setIsEditingSocial] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingCopyright, setIsEditingCopyright] = useState(false);
  
  const [tempContactInfo, setTempContactInfo] = useState({ phone: '', email: '' });
  const [tempSocialMedia, setTempSocialMedia] = useState([]);
  const [tempCopyright, setTempCopyright] = useState('');
  const [tempServices, setTempServices] = useState([]);

  // Load footer data
  useEffect(() => {
    const loadFooterData = async () => {
      try {
        const { API_BASE_URL } = await import('@/config/api');
        const baseUrl = API_BASE_URL || '';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/footer`,
          { method: 'GET' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setFooterData(data.data);
          
          // Set contact info (handle null/empty values)
          const contactData = {
            phone: data.data.contact?.phone?.url || '',
            email: data.data.contact?.email?.url || ''
          };
          setContactInfo(contactData);
          setTempContactInfo(contactData);
          
          // Set social media
          if (data.data.socialMedia && Array.isArray(data.data.socialMedia)) {
            setSocialMedia(data.data.socialMedia);
            setTempSocialMedia(data.data.socialMedia);
          }
          
          // Set copyright with fallback to default text (matching public footer)
          const defaultCopyright = '© Copyright 2025 FAITH CommUNITY. All Rights Reserved.';
          let copyrightData = data.data.copyright?.content || '';
          
          // Auto-insert copyright if it doesn't exist in database
          if (!copyrightData && (!data.data.copyright || Object.keys(data.data.copyright).length === 0)) {
            try {
              const insertResponse = await makeAuthenticatedRequest(
                `${baseUrl}/api/superadmin/footer/copyright`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ content: defaultCopyright }),
                },
                'superadmin'
              );
              
              if (insertResponse && insertResponse.ok) {
                copyrightData = defaultCopyright;
              } else {
                // If auto-insert fails, use default for display
                copyrightData = defaultCopyright;
              }
            } catch (error) {
              console.error('Auto-insert copyright error:', error);
              // Use default for display even if auto-insert fails
              copyrightData = defaultCopyright;
            }
          } else if (!copyrightData) {
            // If copyright object exists but content is empty, use default
            copyrightData = defaultCopyright;
          }
          
          setCopyright(copyrightData);
          setTempCopyright(copyrightData);
          
          // Set services
          const servicesData = data.data.services || [];
          setServices(servicesData);
          setTempServices(servicesData);
        }
      } catch (error) {
        console.error('Load error:', error);
        let errorMessage = 'Failed to load footer data';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
        }
        
        showAuthError(errorMessage);
      }
    };

    loadFooterData();
  }, [showSuccessModal]);

  // Footer update handlers
  const handleContactUpdate = () => {
    setFooterModalType('contact');
    setShowFooterModal(true);
  };

  const handleSocialMediaUpdate = () => {
    setFooterModalType('social');
    setShowFooterModal(true);
  };

  // Helper function to get platform icon
  const getPlatformIcon = (platformName) => {
    const platform = SOCIAL_PLATFORMS.find(p => p.name === platformName);
    return platform ? platform.icon : null;
  };

  // Helper function to get platform color
  const getPlatformColor = (platformName) => {
    const platform = SOCIAL_PLATFORMS.find(p => p.name === platformName);
    return platform ? platform.color : '#666666';
  };

  // Add new social media platform
  const handleAddSocialMedia = () => {
    if (!newSocialPlatform || !newSocialUrl.trim()) {
      showSuccessModal('Please select a platform and enter a URL');
      return;
    }

    const newSocial = {
      platform: newSocialPlatform,
      url: newSocialUrl.trim(),
      icon: newSocialPlatform
    };

    if (isEditingSocial) {
      setTempSocialMedia(prev => [...prev, newSocial]);
    } else {
      setSocialMedia(prev => [...prev, newSocial]);
    }
    setNewSocialPlatform('');
    setNewSocialUrl('');
    setShowAddSocialModal(false);
  };

  // Remove social media platform
  const handleRemoveSocialMedia = (index) => {
    setSocialMedia(prev => prev.filter((_, i) => i !== index));
  };

  // Get available platforms (not already added)
  const getAvailablePlatforms = () => {
    const currentSocialMedia = isEditingSocial ? tempSocialMedia : socialMedia;
    const usedPlatforms = currentSocialMedia.map(social => social.platform);
    return SOCIAL_PLATFORMS.filter(platform => !usedPlatforms.includes(platform.name));
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

    // If in edit mode, add to tempServices with a temporary ID
    if (isEditingServices) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const newServiceObj = {
        id: tempId,
        name: newService.trim(),
        isNew: true // Flag to identify new services that need to be created on save
      };
      setTempServices(prev => [...prev, newServiceObj]);
      setNewService('');
      return;
    }

    // If not in edit mode, add directly to services via API
    try {
      setIsUpdatingFooter(true);
      const { API_BASE_URL } = await import('@/config/api');
      const baseUrl = API_BASE_URL || '';
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
        
        let errorMessage = 'Failed to add service';
        try {
        const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Add service error response:', errorData);
        } catch (e) {
          errorMessage = response.statusText || `Server error (${response.status})`;
          console.error('Non-JSON error response:', response.status, response.statusText);
        }
        showSuccessModal(`${errorMessage} (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Add service error:', error);
      let errorMessage = 'Failed to add service';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
    } finally {
      setIsUpdatingFooter(false);
    }
  };

  const handleDeleteService = (service) => {
    setServiceToDelete(service);
    setIsDeletingFromEditMode(isEditingServices);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;
    
    // If deleting from edit mode, just remove from tempServices
    if (isDeletingFromEditMode) {
      setTempServices(prev => prev.filter(service => service.id !== serviceToDelete.id));
      setShowDeleteModal(false);
      setServiceToDelete(null);
      setIsDeletingFromEditMode(false);
      return;
    }
    
    // If not in edit mode, delete via API
    try {
      setIsDeleting(true);
      const { API_BASE_URL } = await import('@/config/api');
      const baseUrl = API_BASE_URL || '';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/footer/services/${serviceToDelete.id}`,
        { method: 'DELETE' },
        'superadmin'
      );

      if (response && response.ok) {
        setServices(prev => prev.filter(service => service.id !== serviceToDelete.id));
        showSuccessModal('Service deleted successfully!');
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
        
        let errorMessage = 'Failed to delete service';
        try {
        const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Delete service error response:', errorData);
        } catch (e) {
          errorMessage = response.statusText || `Server error (${response.status})`;
          console.error('Non-JSON error response:', response.status, response.statusText);
        }
        showSuccessModal(`${errorMessage} (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Delete service error:', error);
      let errorMessage = 'Failed to delete service';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setServiceToDelete(null);
      setIsDeletingFromEditMode(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setServiceToDelete(null);
    setIsDeletingFromEditMode(false);
  };

  const handleFooterConfirm = async () => {
    try {
      setIsUpdatingFooter(true);
      const { API_BASE_URL } = await import('@/config/api');
      const baseUrl = API_BASE_URL || '';
      let endpoint = '';
      let body = {};

      switch (footerModalType) {
        case 'contact':
          endpoint = '/contact';
          body = {
            phone: tempContactInfo.phone?.trim() || null,
            email: tempContactInfo.email?.trim() || null
          };
          break;
        case 'social':
          endpoint = '/social-media';
          body = { socialMedia: tempSocialMedia };
          break;
        case 'copyright':
          endpoint = '/copyright';
          body = { content: tempCopyright?.trim() || null };
          break;
        case 'services':
          // Handle services updates
          await handleServicesUpdate();
          setShowFooterModal(false);
          setFooterModalType('');
          setIsUpdatingFooter(false);
          return;
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
        // Invalidate SWR cache for public site to force refresh
        try {
          await mutate(`${baseUrl}/api/superadmin/footer`);
        } catch (cacheError) {
          console.warn('Failed to invalidate cache:', cacheError);
        }
        
        // Reload footer data to ensure consistency with database
        const loadFooterData = async () => {
          try {
            const reloadResponse = await makeAuthenticatedRequest(
              `${baseUrl}/api/superadmin/footer`,
              { method: 'GET' },
              'superadmin'
            );
            if (reloadResponse && reloadResponse.ok) {
              const reloadData = await reloadResponse.json();
              if (reloadData.success && reloadData.data) {
                setFooterData(reloadData.data);
                setContactInfo({
                  phone: reloadData.data.contact?.phone?.url || '',
                  email: reloadData.data.contact?.email?.url || ''
                });
                setSocialMedia(reloadData.data.socialMedia || []);
                const defaultCopyright = '© Copyright 2025 FAITH CommUNITY. All Rights Reserved.';
                setCopyright(reloadData.data.copyright?.content || defaultCopyright);
                setServices(reloadData.data.services || []);
              }
            }
          } catch (error) {
            console.error('Error reloading footer data:', error);
          }
        };
        await loadFooterData();
        
        // Update the main state with temp data
        switch (footerModalType) {
          case 'contact':
            setContactInfo({ ...tempContactInfo });
            setIsEditingContact(false);
            break;
          case 'social':
            setSocialMedia([...tempSocialMedia]);
            setIsEditingSocial(false);
            break;
          case 'copyright':
            setCopyright(tempCopyright);
            setIsEditingCopyright(false);
            break;
        }
        showSuccessModal('Footer content updated successfully! The changes will be visible on the public site immediately.');
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
        
        let errorMessage = 'Failed to update footer content';
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
      let errorMessage = 'Failed to update footer content';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
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

  // Edit toggle functions
  const handleEditToggle = (section) => {
    switch (section) {
      case 'contact':
        setIsEditingContact(!isEditingContact);
        if (!isEditingContact) {
          setTempContactInfo(contactInfo);
        }
        break;
      case 'social':
        setIsEditingSocial(!isEditingSocial);
        if (!isEditingSocial) {
          setTempSocialMedia([...socialMedia]);
        }
        break;
      case 'services':
        setIsEditingServices(!isEditingServices);
        if (!isEditingServices) {
          setTempServices([...services]);
        }
        break;
      case 'copyright':
        setIsEditingCopyright(!isEditingCopyright);
        if (!isEditingCopyright) {
          setTempCopyright(copyright);
        }
        break;
    }
  };

  // Cancel edit functions
  const handleCancelEdit = (section) => {
    switch (section) {
      case 'contact':
        setIsEditingContact(false);
        setTempContactInfo(contactInfo);
        break;
      case 'social':
        setIsEditingSocial(false);
        setTempSocialMedia([...socialMedia]);
        break;
      case 'services':
        setIsEditingServices(false);
        setTempServices([...services]);
        break;
      case 'copyright':
        setIsEditingCopyright(false);
        setTempCopyright(copyright);
        break;
    }
  };

  // Handle services update
  const handleServicesUpdate = async () => {
    try {
      const { API_BASE_URL } = await import('@/config/api');
      const baseUrl = API_BASE_URL || '';
      
      // Create new services (those with isNew flag or temp IDs)
      for (const tempService of tempServices) {
        if (tempService.isNew || (typeof tempService.id === 'string' && tempService.id.startsWith('temp-'))) {
          const response = await makeAuthenticatedRequest(
            `${baseUrl}/api/superadmin/footer/services`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: tempService.name }),
            },
            'superadmin'
          );
          
          if (!response || !response.ok) {
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
            
            let errorMessage = 'Failed to create service';
            try {
            const errorData = await response.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
              console.error('Create service error response:', errorData);
            } catch (e) {
              errorMessage = response.statusText || `Server error (${response.status})`;
              console.error('Non-JSON error response:', response.status, response.statusText);
            }
            showSuccessModal(`${errorMessage} (Status: ${response.status})`);
            return;
          }
        }
      }
      
      // Update existing services
      for (const tempService of tempServices) {
        // Skip new services (they were just created above)
        if (tempService.isNew || (typeof tempService.id === 'string' && tempService.id.startsWith('temp-'))) {
          continue;
        }
        
        const originalService = services.find(s => s.id === tempService.id);
        if (originalService && originalService.name !== tempService.name) {
          const response = await makeAuthenticatedRequest(
            `${baseUrl}/api/superadmin/footer/services/${tempService.id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: tempService.name }),
            },
            'superadmin'
          );
          
          if (!response || !response.ok) {
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
            
            let errorMessage = 'Failed to update service';
            try {
            const errorData = await response.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
              console.error('Update service error response:', errorData);
            } catch (e) {
              errorMessage = response.statusText || `Server error (${response.status})`;
              console.error('Non-JSON error response:', response.status, response.statusText);
            }
            showSuccessModal(`${errorMessage} (Status: ${response.status})`);
            return;
          }
        }
      }
      
      // Delete removed services
      for (const originalService of services) {
        const tempService = tempServices.find(s => s.id === originalService.id);
        if (!tempService) {
          const response = await makeAuthenticatedRequest(
            `${baseUrl}/api/superadmin/footer/services/${originalService.id}`,
            { method: 'DELETE' },
            'superadmin'
          );
          
          if (!response || !response.ok) {
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
            
            let errorMessage = 'Failed to delete service';
            try {
            const errorData = await response.json();
              errorMessage = errorData.message || errorData.error || errorMessage;
              console.error('Delete service error response:', errorData);
            } catch (e) {
              errorMessage = response.statusText || `Server error (${response.status})`;
              console.error('Non-JSON error response:', response.status, response.statusText);
            }
            showSuccessModal(`${errorMessage} (Status: ${response.status})`);
            return;
          }
        }
      }
      
      // Reload services to get the latest data with correct IDs
      const reloadResponse = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/footer`,
        { method: 'GET' },
        'superadmin'
      );
      
      if (reloadResponse && reloadResponse.ok) {
        const reloadData = await reloadResponse.json();
        if (reloadData.services) {
          setServices(reloadData.services);
        }
      }
      
      // Invalidate SWR cache
      await mutate(`${baseUrl}/api/superadmin/footer`);
      
      // Update the main state
      setIsEditingServices(false);
      showSuccessModal('Services updated successfully! The changes will be visible on the public site immediately.');
    } catch (error) {
      console.error('Update services error:', error);
      let errorMessage = 'Failed to update services';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
    }
  };

  // Save edit functions - show confirmation modal instead of saving directly
  const handleSaveEdit = (section) => {
    // Show confirmation modal
    setFooterModalType(section);
    setShowFooterModal(true);
  };


  return (
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
            <div className={styles.sectionHeader}>
              <h3>Contact Information</h3>
              <div className={styles.headerActions}>
                {isEditingContact ? (
                  <>
                    <button
                      onClick={() => handleCancelEdit('contact')}
                      className={styles.cancelBtn}
                      disabled={isUpdatingFooter}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit('contact')}
                      className={styles.saveBtn}
                      disabled={isUpdatingFooter}
                    >
                      {isUpdatingFooter ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEditToggle('contact')}
                    className={styles.editToggleBtn}
                    disabled={isUpdatingFooter}
                  >
                    <FiEdit3 size={16} />
                    Edit
                  </button>
                )}
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="phone" className={styles.inputLabel}>Phone Number</label>
              {isEditingContact ? (
                <input
                  type="text"
                  id="phone"
                  value={tempContactInfo.phone || ''}
                  onChange={(e) => setTempContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className={styles.textInput}
                  placeholder="Enter phone number"
                />
              ) : (
                <div className={styles.displayValue}>
                  {contactInfo.phone ? contactInfo.phone : <span className={styles.emptyPlaceholder}>No phone number added yet</span>}
                </div>
              )}
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.inputLabel}>Email Address</label>
              {isEditingContact ? (
                <input
                  type="email"
                  id="email"
                  value={tempContactInfo.email || ''}
                  onChange={(e) => setTempContactInfo(prev => ({ ...prev, email: e.target.value }))}
                  className={styles.textInput}
                  placeholder="Enter email address"
                />
              ) : (
                <div className={styles.displayValue}>
                  {contactInfo.email ? contactInfo.email : <span className={styles.emptyPlaceholder}>No email address added yet</span>}
                </div>
              )}
            </div>
            
          </div>

          {/* Social Media */}
          <div className={styles.footerSection}>
            <div className={styles.sectionHeader}>
              <h3>Social Media Links</h3>
              <div className={styles.headerActions}>
                {isEditingSocial ? (
                  <>
                    <button
                      onClick={() => handleCancelEdit('social')}
                      className={styles.cancelBtn}
                      disabled={isUpdatingFooter}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit('social')}
                      className={styles.saveBtn}
                      disabled={isUpdatingFooter}
                    >
                      {isUpdatingFooter ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEditToggle('social')}
                    className={styles.editToggleBtn}
                    disabled={isUpdatingFooter}
                  >
                    <FiEdit3 size={16} />
                    Edit
                  </button>
                )}
              </div>
            </div>
            
            {/* Current Social Media List */}
            <div className={styles.socialMediaList}>
              {(isEditingSocial ? tempSocialMedia : socialMedia).length > 0 ? (
                (isEditingSocial ? tempSocialMedia : socialMedia).map((social, index) => {
                  const IconComponent = getPlatformIcon(social.platform);
                  const platformColor = getPlatformColor(social.platform);
                  
                  return (
                    <div key={index} className={styles.socialMediaItem}>
                      <div className={styles.socialMediaInfo}>
                        {isEditingSocial ? (
                          <>
                            <div className={styles.socialMediaHeader}>
                              <div className={styles.socialMediaIcon} style={{ color: platformColor }}>
                                {IconComponent && <IconComponent size={16} />}
                              </div>
                              <span className={styles.socialMediaPlatform}>{social.platform}</span>
                            </div>
                            <input
                              type="url"
                              value={social.url}
                              onChange={(e) => {
                                const newTempSocial = [...tempSocialMedia];
                                newTempSocial[index] = { ...newTempSocial[index], url: e.target.value };
                                setTempSocialMedia(newTempSocial);
                              }}
                              className={styles.socialUrlInput}
                              placeholder="Enter URL"
                            />
                          </>
                        ) : (
                          <>
                            <div className={styles.socialMediaHeader}>
                              <div className={styles.socialMediaIcon} style={{ color: platformColor }}>
                                {IconComponent && <IconComponent size={16} />}
                              </div>
                              <span className={styles.socialMediaPlatform}>{social.platform}</span>
                            </div>
                            <div className={styles.socialMediaDetails}>
                              <span className={styles.socialMediaUrl}>{social.url}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {isEditingSocial && (
                        <button
                          onClick={() => {
                            const newTempSocial = tempSocialMedia.filter((_, i) => i !== index);
                            setTempSocialMedia(newTempSocial);
                          }}
                          className={styles.removeSocialBtn}
                          title="Remove social media"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <p className={styles.emptyStateText}>No social media links added yet. Click Edit to add social media platforms.</p>
                </div>
              )}
            </div>

            {/* Add New Social Media Button */}
            {isEditingSocial && (
              <button
                onClick={() => setShowAddSocialModal(true)}
                className={styles.addSocialBtn}
                disabled={getAvailablePlatforms().length === 0}
              >
                <FiPlus size={16} />
                Add Social Media
              </button>
            )}

          </div>

          {/* Services */}
          <div className={styles.footerSection}>
            <div className={styles.sectionHeader}>
              <h3>Our Services</h3>
              <div className={styles.headerActions}>
                {isEditingServices ? (
                  <>
                    <button
                      onClick={() => handleCancelEdit('services')}
                      className={styles.cancelBtn}
                      disabled={isUpdatingFooter}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit('services')}
                      className={styles.saveBtn}
                      disabled={isUpdatingFooter}
                    >
                      {isUpdatingFooter ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEditToggle('services')}
                    className={styles.editToggleBtn}
                    disabled={isUpdatingFooter}
                  >
                    <FiEdit3 size={16} />
                    Edit
                  </button>
                )}
              </div>
            </div>
            
            <div className={styles.servicesList}>
              {(isEditingServices ? tempServices : services).length > 0 ? (
                (isEditingServices ? tempServices : services).map((service) => (
                  <div key={service.id} className={styles.serviceItem}>
                    {isEditingServices ? (
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => {
                          const newTempServices = [...tempServices];
                          const serviceIndex = newTempServices.findIndex(s => s.id === service.id);
                          if (serviceIndex !== -1) {
                            newTempServices[serviceIndex] = { ...newTempServices[serviceIndex], name: e.target.value };
                            setTempServices(newTempServices);
                          }
                        }}
                        className={styles.serviceInput}
                        placeholder="Service name"
                      />
                    ) : (
                      <span>{service.name}</span>
                    )}
                    {isEditingServices && (
                      <button
                        onClick={() => handleDeleteService(service)}
                        className={styles.deleteServiceBtn}
                        disabled={isUpdatingFooter || isDeleting}
                      >
                        <FiTrash2 color="#dc2626" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <p className={styles.emptyStateText}>No services added yet. Click Edit to add services.</p>
                </div>
              )}
            </div>
            
            {isEditingServices && (
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
            )}

          </div>

          {/* Copyright */}
          <div className={styles.footerSection}>
            <div className={styles.sectionHeader}>
              <h3>Copyright Text</h3>
              <div className={styles.headerActions}>
                {isEditingCopyright ? (
                  <>
                    <button
                      onClick={() => handleCancelEdit('copyright')}
                      className={styles.cancelBtn}
                      disabled={isUpdatingFooter}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit('copyright')}
                      className={styles.saveBtn}
                      disabled={isUpdatingFooter}
                    >
                      {isUpdatingFooter ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEditToggle('copyright')}
                    className={styles.editToggleBtn}
                    disabled={isUpdatingFooter}
                  >
                    <FiEdit3 size={16} />
                    Edit
                  </button>
                )}
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              {isEditingCopyright ? (
                <input
                  type="text"
                  id="copyright"
                  value={tempCopyright || ''}
                  onChange={(e) => setTempCopyright(e.target.value)}
                  className={styles.textInput}
                  placeholder="Enter copyright text (e.g., © Copyright 2025 FAITH CommUNITY. All Rights Reserved.)"
                />
              ) : (
                <div className={styles.displayValue}>
                  {copyright || <span className={styles.emptyPlaceholder}>No copyright text added yet</span>}
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>

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

      {/* Service Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        itemName={serviceToDelete?.name}
        itemType="service"
        actionType="delete"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />

      {/* Add Social Media Modal */}
      {showAddSocialModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.addSocialModal}>
            <div className={styles.modalHeader}>
              <h3>Add Social Media Platform</h3>
              <button
                onClick={() => setShowAddSocialModal(false)}
                className={styles.closeModalBtn}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Select Platform</label>
                <div className={styles.platformGrid}>
                  {getAvailablePlatforms().map((platform) => {
                    const IconComponent = platform.icon;
                    return (
                      <button
                        key={platform.name}
                        onClick={() => setNewSocialPlatform(platform.name)}
                        className={`${styles.platformOption} ${newSocialPlatform === platform.name ? styles.platformOptionSelected : ''}`}
                      >
                        <IconComponent size={24} style={{ color: platform.color }} />
                        <span>{platform.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className={styles.inputGroup}>
                <label htmlFor="socialUrl" className={styles.inputLabel}>URL</label>
                <input
                  type="url"
                  id="socialUrl"
                  value={newSocialUrl}
                  onChange={(e) => setNewSocialUrl(e.target.value)}
                  className={styles.textInput}
                  placeholder="Enter social media URL"
                />
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowAddSocialModal(false)}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSocialMedia}
                className={styles.addBtn}
                disabled={!newSocialPlatform || !newSocialUrl.trim()}
              >
                Add Platform
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

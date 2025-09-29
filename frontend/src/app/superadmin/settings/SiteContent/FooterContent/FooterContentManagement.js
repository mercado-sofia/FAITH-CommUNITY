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
            const contactData = {
              phone: data.data.contact.phone?.url || '',
              email: data.data.contact.email?.url || ''
            };
            setContactInfo(contactData);
            setTempContactInfo(contactData);
          }
          
          // Set social media
          if (data.data.socialMedia && Array.isArray(data.data.socialMedia)) {
            setSocialMedia(data.data.socialMedia);
            setTempSocialMedia(data.data.socialMedia);
          }
          
          // Set copyright
          const copyrightData = data.data.copyright?.content || '';
          setCopyright(copyrightData);
          setTempCopyright(copyrightData);
          
          // Set services
          const servicesData = data.data.services || [];
          setServices(servicesData);
          setTempServices(servicesData);
        }
      } catch (error) {
        showAuthError('Failed to load footer data. Please try again.');
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
      showSuccessModal('Failed to add service. Please try again.');
    } finally {
      setIsUpdatingFooter(false);
    }
  };

  const handleDeleteService = (service) => {
    setServiceToDelete(service);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;
    
    try {
      setIsDeleting(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/footer/services/${serviceToDelete.id}`,
        { method: 'DELETE' },
        'superadmin'
      );

      if (response && response.ok) {
        setServices(prev => prev.filter(service => service.id !== serviceToDelete.id));
        showSuccessModal('Service deleted successfully!');
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || 'Failed to delete service');
      }
    } catch (error) {
      showSuccessModal('Failed to delete service. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setServiceToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setServiceToDelete(null);
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
          body = { socialMedia };
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Update existing services
      for (const tempService of tempServices) {
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
            const errorData = await response.json();
            showSuccessModal(errorData.message || 'Failed to update service');
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
            const errorData = await response.json();
            showSuccessModal(errorData.message || 'Failed to delete service');
            return;
          }
        }
      }
      
      // Update the main state
      setServices([...tempServices]);
      setIsEditingServices(false);
      showSuccessModal('Services updated successfully! The changes will be visible on the public site immediately.');
    } catch (error) {
      showSuccessModal('Failed to update services. Please try again.');
    }
  };

  // Save edit functions
  const handleSaveEdit = async (section) => {
    try {
      setIsUpdatingFooter(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      let endpoint = '';
      let body = {};

      switch (section) {
        case 'contact':
          endpoint = '/contact';
          body = tempContactInfo;
          break;
        case 'social':
          endpoint = '/social-media';
          body = { socialMedia: tempSocialMedia };
          break;
        case 'copyright':
          endpoint = '/copyright';
          body = { content: tempCopyright };
          break;
        case 'services':
          // Handle services updates
          await handleServicesUpdate();
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
        // Update the main state with temp data
        switch (section) {
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
        const errorData = await response.json();
        showSuccessModal(errorData.message || 'Failed to update footer content');
      }
    } catch (error) {
      showSuccessModal('Failed to update footer content. Please try again.');
    } finally {
      setIsUpdatingFooter(false);
    }
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
              <input
                type="text"
                id="phone"
                value={isEditingContact ? tempContactInfo.phone : contactInfo.phone}
                onChange={(e) => isEditingContact ? 
                  setTempContactInfo(prev => ({ ...prev, phone: e.target.value })) :
                  setContactInfo(prev => ({ ...prev, phone: e.target.value }))
                }
                className={styles.textInput}
                placeholder="Enter phone number"
                disabled={!isEditingContact}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.inputLabel}>Email Address</label>
              <input
                type="email"
                id="email"
                value={isEditingContact ? tempContactInfo.email : contactInfo.email}
                onChange={(e) => isEditingContact ? 
                  setTempContactInfo(prev => ({ ...prev, email: e.target.value })) :
                  setContactInfo(prev => ({ ...prev, email: e.target.value }))
                }
                className={styles.textInput}
                placeholder="Enter email address"
                disabled={!isEditingContact}
              />
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
              {(isEditingSocial ? tempSocialMedia : socialMedia).map((social, index) => {
                const IconComponent = getPlatformIcon(social.platform);
                const platformColor = getPlatformColor(social.platform);
                
                return (
                  <div key={index} className={styles.socialMediaItem}>
                    <div className={styles.socialMediaInfo}>
                      <div className={styles.socialMediaIcon} style={{ color: platformColor }}>
                        {IconComponent && <IconComponent size={20} />}
                      </div>
                      <div className={styles.socialMediaDetails}>
                        <span className={styles.socialMediaPlatform}>{social.platform}</span>
                        {isEditingSocial ? (
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
                        ) : (
                          <span className={styles.socialMediaUrl}>{social.url}</span>
                        )}
                      </div>
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
                        <FiX size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
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
              {(isEditingServices ? tempServices : services).map((service) => (
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
                      onClick={() => {
                        const newTempServices = tempServices.filter(s => s.id !== service.id);
                        setTempServices(newTempServices);
                      }}
                      className={styles.deleteServiceBtn}
                      disabled={isUpdatingFooter || isDeleting}
                    >
                      <FiTrash2 color="#dc2626" />
                    </button>
                  )}
                </div>
              ))}
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
              <input
                type="text"
                id="copyright"
                value={isEditingCopyright ? tempCopyright : copyright}
                onChange={(e) => isEditingCopyright ? 
                  setTempCopyright(e.target.value) :
                  setCopyright(e.target.value)
                }
                className={styles.textInput}
                placeholder="Enter copyright text"
                disabled={!isEditingCopyright}
              />
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

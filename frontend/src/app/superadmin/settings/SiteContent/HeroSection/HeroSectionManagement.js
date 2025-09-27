'use client';

import { useState, useEffect } from 'react';
import { FaUpload, FaPlay } from 'react-icons/fa';
import { FiTrash2, FiEdit3 } from 'react-icons/fi';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import styles from './HeroSectionManagement.module.css';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { useScrollPosition } from '@/hooks/useScrollPosition';

export default function HeroSectionManagement({ showSuccessModal }) {
  const { preserveScrollPositionAsync } = useScrollPosition();
  const [heroData, setHeroData] = useState({
    tag: 'Welcome to FAITH CommUNITY',
    heading: 'A Unified Platform for Community Extension Programs',
    video_url: null,
    video_link: null,
    video_type: 'upload',
    images: [
      { id: 1, url: null, heading: 'Inside the Initiative', subheading: 'Where Ideas Take Root' },
      { id: 2, url: null, heading: 'Collaboration', subheading: 'Working Together' },
      { id: 3, url: null, heading: 'Innovation', subheading: 'Building the Future' }
    ]
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Upload loading states
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState({});
  
  
  // Main edit state and temp data for batch save
  const [isEditingHero, setIsEditingHero] = useState(false);
  const [tempHeroData, setTempHeroData] = useState({});
  const [showHeroModal, setShowHeroModal] = useState(false);
  const [isUpdatingHero, setIsUpdatingHero] = useState(false);
  
  // File selection states for batch upload
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [selectedImageFiles, setSelectedImageFiles] = useState({});

  // Load hero data
  useEffect(() => {
    const loadHeroData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/hero-section`,
          { method: 'GET' },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          if (data.data) {
            setHeroData(data.data);
          }
        }
      } catch (error) {
        console.error('Error loading hero data:', error);
        showAuthError('Failed to load hero section data. Please try again.');
      } finally {
      }
    };

    loadHeroData();
  }, [showSuccessModal]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showVideoModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showVideoModal]);

  // Handle ESC key to close video
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showVideoModal) {
        setShowVideoModal(false);
      }
    };

    if (showVideoModal) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showVideoModal]);

  // Update text content
  const handleTextUpdate = async (field, value) => {
    try {
      setIsUpdating(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/hero-section/text`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ field, value }),
        },
        'superadmin'
      );

      if (response && response.ok) {
        setHeroData(prev => ({
          ...prev,
          [field]: value
        }));
        showSuccessModal(`${field === 'tag' ? 'Tag' : 'Heading'} updated successfully!`);
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || `Failed to update ${field}`);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      showSuccessModal(`Failed to update ${field}. Please try again.`);
    } finally {
      setIsUpdating(false);
    }
  };


  // Helper function to convert YouTube URLs to embed format
  const convertToEmbedUrl = (url) => {
    if (url.includes('youtube.com/watch')) {
      const videoId = url.match(/[?&]v=([^&]+)/);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId[1]}`;
      }
    } else if (url.includes('youtu.be/')) {
      const videoId = url.match(/youtu\.be\/([^?&]+)/);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId[1]}`;
      }
    } else if (url.includes('vimeo.com/')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/);
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId[1]}`;
      }
    }
    return url; // Return original if no conversion needed
  };


  // File upload handlers
  const handleFileUpload = async (file, type, imageId = null) => {
    try {
      
      // Set loading state
      if (type === 'video') {
        setIsUploadingVideo(true);
      } else if (type === 'image' && imageId) {
        setIsUploadingImages(prev => ({ ...prev, [imageId]: true }));
      }
      
      const formData = new FormData();
      formData.append(type, file);
      if (imageId) {
        formData.append('imageId', imageId);
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Get the token for manual request
      const token = localStorage.getItem('superAdminToken');
      if (!token) {
        showSuccessModal('Authentication required. Please log in again.');
        return;
      }

      const endpoint = imageId 
        ? `${baseUrl}/api/superadmin/hero-section/upload-image`
        : `${baseUrl}/api/superadmin/hero-section/upload-${type}`;


      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });


      if (response.ok) {
        const data = await response.json();
        if (imageId) {
          setHeroData(prev => ({
            ...prev,
            images: prev.images.map(img => 
              img.id === imageId ? { ...img, url: data.data.url } : img
            )
          }));
          showSuccessModal('Image uploaded successfully!');
        } else {
          setHeroData(prev => ({
            ...prev,
            [`${type}_url`]: data.data[`${type}_url`],
            video_link: type === 'video' ? null : prev.video_link, // Clear video link when uploading video
            video_type: type === 'video' ? 'upload' : prev.video_type
          }));
          showSuccessModal(`${type === 'video' ? 'Video' : 'File'} uploaded successfully!`);
        }
      } else {
        if (response.status === 401) {
          showSuccessModal('Authentication expired. Please log in again.');
          return;
        }
        
        let errorMessage = `Failed to upload ${type}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        showSuccessModal(errorMessage);
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      showSuccessModal(`Failed to upload ${type}. Please try again.`);
    } finally {
      // Clear loading state
      if (type === 'video') {
        setIsUploadingVideo(false);
      } else if (type === 'image' && imageId) {
        setIsUploadingImages(prev => ({ ...prev, [imageId]: false }));
      }
    }
  };

  const handleFileDelete = (type, imageId = null) => {
    setDeleteType({ type, imageId });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteType) return;
    
    try {
      setIsDeleting(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const endpoint = deleteType.imageId 
        ? `${baseUrl}/api/superadmin/hero-section/image/${deleteType.imageId}`
        : `${baseUrl}/api/superadmin/hero-section/${deleteType.type}`;
      
      const response = await makeAuthenticatedRequest(
        endpoint,
        { method: 'DELETE' },
        'superadmin'
      );

      if (response && response.ok) {
        if (deleteType.imageId) {
          setHeroData(prev => ({
            ...prev,
            images: prev.images.map(img => 
              img.id === deleteType.imageId ? { ...img, url: null } : img
            )
          }));
          showSuccessModal('Image deleted successfully!');
        } else {
          setHeroData(prev => ({
            ...prev,
            [`${deleteType.type}_url`]: null,
            video_link: deleteType.type === 'video' ? null : prev.video_link,
            video_type: deleteType.type === 'video' ? 'upload' : prev.video_type
          }));
          showSuccessModal(`${deleteType.type === 'video' ? 'Video' : 'File'} deleted successfully!`);
        }
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || `Failed to delete ${deleteType.type}`);
      }
    } catch (error) {
      console.error(`Error deleting ${deleteType.type}:`, error);
      showSuccessModal(`Failed to delete ${deleteType.type}. Please try again.`);
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

  // Main edit toggle for Hero Section
  const handleEditToggle = () => {
    if (!isEditingHero) {
      setTempHeroData({
        tag: heroData.tag,
        heading: heroData.heading,
        video_url: heroData.video_url,
        video_link: heroData.video_link,
        video_type: heroData.video_type,
        images: [...heroData.images]
      });
    }
    setIsEditingHero(!isEditingHero);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setIsEditingHero(false);
    setTempHeroData({});
    setSelectedVideoFile(null);
    setSelectedImageFiles({});
  };

  // Hero update handler
  const handleHeroUpdate = () => {
    if (!tempHeroData.tag?.trim()) {
      showSuccessModal('Tag cannot be empty');
      return;
    }
    if (!tempHeroData.heading?.trim()) {
      showSuccessModal('Heading cannot be empty');
      return;
    }
    setShowHeroModal(true);
  };

  // Confirm hero update with batch file uploads
  const handleHeroConfirm = async () => {
    await preserveScrollPositionAsync(async () => {
      try {
        setIsUpdatingHero(true);
        
        let finalHeroData = { ...tempHeroData };
        
        // Upload video if selected
        if (selectedVideoFile) {
          try {
            const videoUrl = await handleFileUpload(selectedVideoFile, 'video');
            finalHeroData.video_url = videoUrl;
            finalHeroData.video_link = null;
            finalHeroData.video_type = 'upload';
            setSelectedVideoFile(null);
          } catch (error) {
            showSuccessModal('Failed to upload video. Please try again.');
            return;
          }
        }
        
        // Upload images if selected
        for (const [imageId, file] of Object.entries(selectedImageFiles)) {
          try {
            const imageUrl = await handleFileUpload(file, 'image', parseInt(imageId));
            finalHeroData.images = finalHeroData.images.map(img => 
              img.id === parseInt(imageId) ? { ...img, url: imageUrl } : img
            );
          } catch (error) {
            showSuccessModal(`Failed to upload image ${imageId}. Please try again.`);
            return;
          }
        }
        setSelectedImageFiles({});
        
        // Save all hero data
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/hero-section`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(finalHeroData),
          },
          'superadmin'
        );

        if (response && response.ok) {
          const data = await response.json();
          setHeroData(data.data);
          setIsEditingHero(false);
          showSuccessModal('Hero section updated successfully! The changes will be visible on the public site immediately.');
        } else {
          const errorData = await response.json();
          showSuccessModal(errorData.message || 'Failed to update hero section');
        }
      } catch (error) {
        console.error('Error updating hero section:', error);
        showSuccessModal('Failed to update hero section. Please try again.');
      } finally {
        setIsUpdatingHero(false);
        setShowHeroModal(false);
      }
    });
  };

  // Cancel hero update
  const handleHeroCancel = () => {
    setShowHeroModal(false);
  };


  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Hero Section</h2>
          <p>Manage the main hero section content, including tag, heading, video, and banner images</p>
        </div>
        <div className={styles.headerActions}>
          {isEditingHero ? (
            <>
              <button
                onClick={handleCancelEdit}
                className={styles.cancelBtn}
                disabled={isUpdatingHero}
              >
                Cancel
              </button>
              <button
                onClick={handleHeroUpdate}
                disabled={isUpdatingHero}
                className={styles.saveBtn}
              >
                {isUpdatingHero ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={handleEditToggle}
              className={styles.editToggleBtn}
              disabled={isUpdatingHero}
            >
              <FiEdit3 size={16} />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className={styles.panelContent}>
        {/* Text Content Section */}
        <div className={styles.textContentSection}>
          <div className={styles.sectionHeader}>
            <h3>Text Content</h3>
          </div>
          
          {isEditingHero ? (
            <>
              {/* Tag */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Tag (Yellow text)</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={tempHeroData.tag || ''}
                  onChange={(e) => setTempHeroData(prev => ({ ...prev, tag: e.target.value }))}
                  placeholder="Enter tag text..."
                />
              </div>

              {/* Heading */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Main Heading</label>
                <textarea
                  className={styles.textInput}
                  rows={3}
                  value={tempHeroData.heading || ''}
                  onChange={(e) => setTempHeroData(prev => ({ ...prev, heading: e.target.value }))}
                  placeholder="Enter main heading..."
                />
              </div>
            </>
          ) : (
            <div className={styles.readOnlyContent}>
              <div className={styles.readOnlyItem}>
                <label className={styles.readOnlyLabel}>Tag:</label>
                <span className={styles.readOnlyValue}>{heroData.tag}</span>
              </div>
              <div className={styles.readOnlyItem}>
                <label className={styles.readOnlyLabel}>Heading:</label>
                <span className={styles.readOnlyValue}>{heroData.heading}</span>
              </div>
            </div>
          )}
        </div>

        {/* Video Section */}
        <div className={styles.mediaSection}>
          <div className={styles.sectionHeader}>
            <h3>Video Content</h3>
          </div>
          {/* Video Preview - Always Visible */}
          <div className={styles.mediaItem}>
            <div className={styles.itemHeader}>
              <span className={styles.itemLabel}>Hero Video</span>
              {isEditingHero && (heroData.video_url || heroData.video_link) && (
                <button 
                  className={styles.removeBtn}
                  onClick={() => handleFileDelete('video')}
                  title="Remove video"
                >
                  <FiTrash2 color="#dc2626" />
                </button>
              )}
            </div>
            
            {heroData.video_url ? (
              <div className={styles.videoPreview}>
                <video 
                  src={heroData.video_url} 
                  style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                />
                <div className={styles.videoPlayOverlay} onClick={() => setShowVideoModal(true)}>
                  <FaPlay size={24} />
                </div>
              </div>
            ) : heroData.video_link ? (
              <div className={styles.videoPreview}>
                <iframe
                  src={convertToEmbedUrl(heroData.video_link)}
                  style={{ width: '100%', height: '200px', border: 'none' }}
                  title="Video Preview"
                  allowFullScreen
                />
                <div className={styles.videoPlayOverlay} onClick={() => setShowVideoModal(true)}>
                  <FaPlay size={24} />
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <FaPlay size={24} />
                <span>No video uploaded or linked</span>
              </div>
            )}
          </div>

          {isEditingHero ? (
            <div className={styles.mediaItem}>
              {/* Video Link Input */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Video Link (YouTube, Vimeo, etc.)</label>
                <input
                  type="url"
                  className={styles.textInput}
                  value={tempHeroData.video_link || ''}
                  onChange={(e) => setTempHeroData(prev => ({ ...prev, video_link: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              
              <div className={styles.orSeparator}>
                <span className={styles.orText}>OR</span>
              </div>
              
              {/* Video Upload */}
              {!selectedVideoFile ? (
                <div className={styles.fileInputContainer}>
              <input
                type="file"
                id="video-upload"
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files[0]) {
                        setSelectedVideoFile(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />
                  <label htmlFor="video-upload" className={styles.uploadBtn}>
                    <FaUpload /> Choose Video File
              </label>
                </div>
              ) : (
                <div className={styles.uploadActions}>
                  <div className={styles.selectedFileInfo}>
                    <span className={styles.fileName}>{selectedVideoFile.name}</span>
                    <span className={styles.fileSize}>
                      {(selectedVideoFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <span className={styles.uploadNote}>
                      Video will be uploaded when you save changes
                    </span>
                  </div>
                  <div className={styles.uploadButtons}>
                    <button
                      onClick={() => setSelectedVideoFile(null)}
                      className={styles.cancelBtn}
                    >
                      Remove Selection
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.readOnlyContent}>
              <div className={styles.readOnlyItem}>
                <label className={styles.readOnlyLabel}>Video Status:</label>
                <span className={styles.readOnlyValue}>
                  {heroData.video_url ? 'Uploaded Video' : heroData.video_link ? 'Video Link' : 'No Video'}
                </span>
              </div>
              {heroData.video_link && (
                <div className={styles.readOnlyItem}>
                  <label className={styles.readOnlyLabel}>Video Link:</label>
                  <span className={styles.readOnlyValue}>{heroData.video_link}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Images Section */}
        <div className={styles.imagesSection}>
          <h3>Banner Images</h3>
          <div className={styles.imagesGrid}>
            {heroData.images.map((image, index) => (
              <div key={image.id} className={styles.imageItem}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemLabel}>Image {index + 1}</span>
                  <div className={styles.itemActions}>
                    {isEditingHero && image.url && (
                          <button 
                            className={styles.removeBtn}
                            onClick={() => handleFileDelete('image', image.id)}
                            title="Remove image"
                          >
                            <FiTrash2 color="#dc2626" />
                          </button>
                    )}
                  </div>
                </div>
                
                {isEditingHero ? (
                  <>
                    {/* Image Preview */}
                    {image.url ? (
                      <div className={styles.preview}>
                        <Image 
                          src={image.url} 
                          alt={`Banner image ${index + 1}`} 
                          width={200}
                          height={150}
                          unoptimized
                          style={{ maxWidth: '100%', height: 'auto', objectFit: 'cover' }}
                        />
                      </div>
                    ) : selectedImageFiles[image.id] ? (
                      <div className={styles.preview}>
                        <Image 
                          src={URL.createObjectURL(selectedImageFiles[image.id])} 
                          alt={`Banner image ${index + 1} preview`} 
                          width={200}
                          height={150}
                          unoptimized
                          style={{ maxWidth: '100%', height: 'auto', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div className={styles.emptyState}>No image</div>
                    )}
                    
                    {/* Image Text Content */}
                    <div className={styles.imageTextContent}>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Heading</label>
                        <input
                          type="text"
                          className={styles.textInput}
                          value={tempHeroData.images?.[index]?.heading || ''}
                          onChange={(e) => {
                            const newImages = [...tempHeroData.images];
                            newImages[index].heading = e.target.value;
                            setTempHeroData(prev => ({ ...prev, images: newImages }));
                          }}
                          placeholder="Enter image heading..."
                        />
                      </div>
                      
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Subheading</label>
                        <input
                          type="text"
                          className={styles.textInput}
                          value={tempHeroData.images?.[index]?.subheading || ''}
                          onChange={(e) => {
                            const newImages = [...tempHeroData.images];
                            newImages[index].subheading = e.target.value;
                            setTempHeroData(prev => ({ ...prev, images: newImages }));
                          }}
                          placeholder="Enter image subheading..."
                        />
                      </div>
                    </div>
                    
                    {/* Image Upload */}
                    {!selectedImageFiles[image.id] ? (
                      <div className={styles.fileInputContainer}>
                    <input
                      type="file"
                      id={`image-upload-${image.id}`}
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                              setSelectedImageFiles(prev => ({ ...prev, [image.id]: e.target.files[0] }));
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                        <label htmlFor={`image-upload-${image.id}`} className={styles.uploadBtn}>
                          <FaUpload /> Choose Image
                        </label>
                      </div>
                    ) : (
                      <div className={styles.uploadActions}>
                        <div className={styles.selectedFileInfo}>
                          <span className={styles.fileName}>{selectedImageFiles[image.id].name}</span>
                          <span className={styles.fileSize}>
                            {(selectedImageFiles[image.id].size / 1024 / 1024).toFixed(2)} MB
                          </span>
                          <span className={styles.uploadNote}>
                            Image will be uploaded when you save changes
                          </span>
                        </div>
                        <div className={styles.uploadButtons}>
                          <button
                            onClick={() => setSelectedImageFiles(prev => {
                              const newFiles = { ...prev };
                              delete newFiles[image.id];
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
                ) : (
                  <div className={styles.readOnlyContent}>
                    {image.url ? (
                      <div className={styles.preview}>
                        <Image 
                          src={image.url} 
                          alt={`Banner image ${index + 1}`} 
                          width={200}
                          height={150}
                          unoptimized
                          style={{ maxWidth: '100%', height: 'auto', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div className={styles.emptyState}>No image</div>
                    )}
                    <div className={styles.readOnlyItem}>
                      <label className={styles.readOnlyLabel}>Heading:</label>
                      <span className={styles.readOnlyValue}>{image.heading}</span>
                    </div>
                    <div className={styles.readOnlyItem}>
                      <label className={styles.readOnlyLabel}>Subheading:</label>
                      <span className={styles.readOnlyValue}>{image.subheading}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        itemName={deleteType?.type}
        itemType={deleteType?.imageId ? `image ${deleteType.imageId}` : deleteType?.type}
        actionType="delete"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
      
      <ConfirmationModal
        isOpen={showHeroModal}
        itemName="Hero Section"
        itemType="all changes"
        actionType="update"
        onConfirm={handleHeroConfirm}
        onCancel={handleHeroCancel}
        isDeleting={isUpdatingHero}
        customMessage="This will update the hero section content across the entire public website. The changes will be visible immediately."
      />

      {/* Full Viewport Video Modal */}
      {showVideoModal && mounted && (heroData?.video_url || heroData?.video_link) && createPortal(
        <div 
          className={styles.videoOverlay}
          onClick={(e) => {
            // Close video when clicking on overlay (not on video itself)
            if (e.target === e.currentTarget) {
              setShowVideoModal(false);
            }
          }}
        >
          <button className={styles.closeButton} onClick={() => setShowVideoModal(false)}>✖</button>
          {heroData?.video_type === 'link' ? (
            <iframe
              src={heroData.video_link}
              className={styles.videoPlayer}
              frameBorder="0"
              allowFullScreen
              title="Hero Video"
            />
          ) : (
            <video 
              controls 
              autoPlay 
              className={styles.videoPlayer}
              onError={(e) => {
                console.warn('Hero video failed to load:', e);
                setShowVideoModal(false);
              }}
            >
              <source src={heroData.video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

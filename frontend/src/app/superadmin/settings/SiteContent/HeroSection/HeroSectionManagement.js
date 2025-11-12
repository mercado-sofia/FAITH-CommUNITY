'use client';

import { useState, useEffect } from 'react';
import { FaPlay } from 'react-icons/fa';
import { FiTrash2, FiEdit3, FiUpload } from 'react-icons/fi';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import styles from './HeroSectionManagement.module.css';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import { ConfirmationModal } from '@/components';
import { getImageUrl } from '@/utils/uploadPaths';

export default function HeroSectionManagement({ showSuccessModal }) {
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
  const [iframeError, setIframeError] = useState(false);
  
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
            // Reset iframe error when new data is loaded
            setIframeError(false);
          }
        }
      } catch (error) {
        console.error('Load error:', error);
        let errorMessage = 'Failed to load hero section data';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
        }
        
        showAuthError(errorMessage);
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
        
        let errorMessage = `Failed to update ${field}`;
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
      let errorMessage = `Failed to update ${field}`;
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };


  // Helper function to convert YouTube URLs to embed format
  const convertToEmbedUrl = (url) => {
    if (!url) return '';
    
    // Handle YouTube watch URLs
    if (url.includes('youtube.com/watch')) {
      const videoId = url.match(/[?&]v=([^&]+)/);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId[1]}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
      }
    } 
    // Handle YouTube short URLs
    else if (url.includes('youtu.be/')) {
      const videoId = url.match(/youtu\.be\/([^?&]+)/);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId[1]}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
      }
    } 
    // Handle YouTube embed URLs (already in embed format)
    else if (url.includes('youtube.com/embed/')) {
      return url.includes('?') ? url : `${url}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
    }
    // Handle Vimeo URLs
    else if (url.includes('vimeo.com/')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/);
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId[1]}`;
      }
    }
    // Handle Vimeo player URLs (already in embed format)
    else if (url.includes('player.vimeo.com/video/')) {
      return url;
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
        return null;
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
          return data.data.url;
        } else {
          setHeroData(prev => ({
            ...prev,
            [`${type}_url`]: data.data[`${type}_url`],
            video_link: type === 'video' ? null : prev.video_link, // Clear video link when uploading video
            video_type: type === 'video' ? 'upload' : prev.video_type
          }));
          showSuccessModal(`${type === 'video' ? 'Video' : 'File'} uploaded successfully!`);
          return data.data[`${type}_url`];
        }
      } else {
        // Handle 401 responses
        if (response.status === 401) {
          showSuccessModal('Authentication expired. Please log in again.');
          return null;
        }
        
        // Handle CORS errors (status 0)
        if (response.status === 0) {
          console.error('CORS or network error detected');
          showSuccessModal(`CORS error: Unable to connect to backend. Please check:\n1. Backend URL is correct (${baseUrl})\n2. CORS is configured on backend\n3. Backend is running`);
          return null;
        }
        
        let errorMessage = `Failed to upload ${type}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Upload error response:', errorData);
        } catch (e) {
          errorMessage = response.statusText || `Server error (${response.status})`;
          console.error('Non-JSON error response:', response.status, response.statusText);
        }
        showSuccessModal(`${errorMessage} (Status: ${response.status})`);
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
    } finally {
      // Clear loading state
      if (type === 'video') {
        setIsUploadingVideo(false);
      } else if (type === 'image' && imageId) {
        setIsUploadingImages(prev => ({ ...prev, [imageId]: false }));
      }
    }
  };

  // Handle immediate video upload when file is selected
  const handleVideoFileSelect = async (file) => {
    if (!file) return;
    
    setSelectedVideoFile(file);
    
    // Upload video immediately
    try {
      const videoUrl = await handleFileUpload(file, 'video');
      if (videoUrl) {
        // Update temp data with the uploaded video URL
        setTempHeroData(prev => ({
          ...prev,
          video_url: videoUrl,
          video_link: null,
          video_type: 'upload'
        }));
        setSelectedVideoFile(null); // Clear selected file since it's now uploaded
      } else {
        setSelectedVideoFile(null); // Clear on failure
      }
    } catch (error) {
      setSelectedVideoFile(null); // Clear on error
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
        
        let errorMessage = `Failed to delete ${deleteType.type}`;
        try {
        const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Delete error response:', errorData);
        } catch (e) {
          errorMessage = response.statusText || `Server error (${response.status})`;
          console.error('Non-JSON error response:', response.status, response.statusText);
        }
        showSuccessModal(`${errorMessage} (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      let errorMessage = `Failed to delete ${deleteType.type}`;
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
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
    setIsUploadingVideo(false);
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
      try {
        setIsUpdatingHero(true);
        
        let finalHeroData = { ...tempHeroData };
        
        // Set video_type based on what's being used
        if (finalHeroData.video_link && !finalHeroData.video_url) {
          finalHeroData.video_type = 'link';
        } else if (finalHeroData.video_url && !finalHeroData.video_link) {
          finalHeroData.video_type = 'upload';
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
          
          let errorMessage = 'Failed to update hero section';
          try {
          const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error('Update hero error response:', errorData);
          } catch (e) {
            errorMessage = response.statusText || `Server error (${response.status})`;
            console.error('Non-JSON error response:', response.status, response.statusText);
          }
          showSuccessModal(`${errorMessage} (Status: ${response.status})`);
        }
      } catch (error) {
        console.error('Update hero error:', error);
        let errorMessage = 'Failed to update hero section';
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
        }
        
        showSuccessModal(errorMessage);
      } finally {
        setIsUpdatingHero(false);
        setShowHeroModal(false);
      }
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
          {/* Main Video Layout: Video container on left, fields on right */}
          <div className={styles.videoMainLayout}>
            {/* Video Container - Left Side */}
            <div className={styles.videoContainer}>
              <div className={styles.itemHeader}>
                <span className={styles.itemLabel}>Hero Video</span>
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
                  {iframeError ? (
                    <div className={styles.emptyState}>
                      <span style={{ color: '#dc2626', fontSize: '12px', textAlign: 'center', padding: '1rem' }}>
                        Video embed failed. The video may be private, have embedding disabled, or the URL is invalid.
                        <br />
                        <button 
                          onClick={() => {
                            setIframeError(false);
                            window.location.reload();
                          }}
                          style={{ 
                            marginTop: '0.5rem', 
                            padding: '0.5rem 1rem', 
                            background: '#3b82f6', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Retry
                        </button>
                      </span>
                    </div>
                  ) : (
                    <>
                      <iframe
                        src={convertToEmbedUrl(heroData.video_link)}
                        style={{ width: '100%', height: '200px', border: 'none' }}
                        title="Video Preview"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        onError={() => setIframeError(true)}
                        onLoad={() => {
                          // Reset error state when iframe loads
                          setIframeError(false);
                        }}
                      />
                      <div className={styles.videoPlayOverlay} onClick={() => setShowVideoModal(true)}>
                        <FaPlay size={24} />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <FaPlay size={24} />
                  <span>No video uploaded or linked</span>
                </div>
              )}
            </div>

            {/* Video Fields - Right Side */}
            <div className={styles.videoFieldsSection}>
              {isEditingHero ? (
                <>
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
                  {!selectedVideoFile && !isUploadingVideo ? (
                    <div className={styles.fileInputContainer}>
                      <input
                        type="file"
                        id="video-upload"
                        accept="video/*"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            handleVideoFileSelect(e.target.files[0]);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="video-upload" className={styles.uploadBtn}>
                        <FiUpload /> Choose Video File
                      </label>
                    </div>
                  ) : selectedVideoFile && isUploadingVideo ? (
                    <div className={styles.uploadActions}>
                      <div className={styles.selectedFileInfo}>
                        <div className={styles.uploadingIndicator}>
                          <div className={styles.spinner}></div>
                          <span>Uploading video...</span>
                        </div>
                        <span className={styles.fileName}>{selectedVideoFile.name}</span>
                        <span className={styles.fileSize}>
                          {(selectedVideoFile.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                  ) : tempHeroData.video_url ? (
                    <div className={styles.uploadActions}>
                      <div className={styles.videoPreviewContainer}>
                        <video 
                          src={tempHeroData.video_url} 
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                          controls
                        />
                        <div className={styles.videoOverlay}>
                          <button
                            onClick={() => handleFileDelete('video')}
                            className={styles.deleteVideoBtn}
                            title="Delete uploaded video"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className={styles.uploadedVideoInfo}>
                        <span className={styles.uploadSuccess}>✓ Video uploaded successfully</span>
                        <span className={styles.uploadNote}>
                          Video is ready and will be saved with your changes
                        </span>
                      </div>
                    </div>
                  ) : null}
                </>
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
          </div>
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
                    {(() => {
                      // Use the same fallback logic as the public portal
                      const isFirst = index === 0;
                      const defaultImageSrc = isFirst ? "/samples/sample2.jpg" : index === 1 ? "/samples/sample8.jpg" : "/samples/sample3.jpeg";
                      
                      if (image.url) {
                        return (
                          <div className={styles.preview}>
                            <Image 
                              src={getImageUrl(image.url, 'hero', 'images')} 
                              alt={`Banner image ${index + 1}`} 
                              width={200}
                              height={150}
                              unoptimized
                              style={{ maxWidth: '100%', height: 'auto', objectFit: 'cover' }}
                            />
                            {/* Hover Overlay for Upload */}
                            <div className={styles.imageOverlay}>
                              <label htmlFor={`image-upload-${image.id}`} className={styles.uploadButton}>
                                <FiUpload size={14} />
                                {selectedImageFiles[image.id] ? 'Change Image' : 'Upload Image'}
                              </label>
                              <input
                                type="file"
                                id={`image-upload-${image.id}`}
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files[0]) {
                                    setSelectedImageFiles(prev => ({ ...prev, [image.id]: e.target.files[0] }));
                                  }
                                }}
                                className={styles.fileInput}
                                style={{ display: 'none' }}
                              />
                            </div>
                          </div>
                        );
                      } else if (selectedImageFiles[image.id]) {
                        return (
                          <div className={styles.preview}>
                            <Image 
                              src={URL.createObjectURL(selectedImageFiles[image.id])} 
                              alt={`Banner image ${index + 1} preview`} 
                              width={200}
                              height={150}
                              unoptimized
                              style={{ maxWidth: '100%', height: 'auto', objectFit: 'cover' }}
                            />
                            {/* Hover Overlay for Upload */}
                            <div className={styles.imageOverlay}>
                              <label htmlFor={`image-upload-${image.id}`} className={styles.uploadButton}>
                                <FiUpload size={14} />
                                Change Image
                              </label>
                              <input
                                type="file"
                                id={`image-upload-${image.id}`}
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files[0]) {
                                    setSelectedImageFiles(prev => ({ ...prev, [image.id]: e.target.files[0] }));
                                  }
                                }}
                                className={styles.fileInput}
                                style={{ display: 'none' }}
                              />
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className={styles.preview}>
                            <Image 
                              src={defaultImageSrc} 
                              alt={`Banner image ${index + 1} (default)`} 
                              width={200}
                              height={150}
                              unoptimized
                              style={{ maxWidth: '100%', height: 'auto', objectFit: 'cover' }}
                            />
                            <div className={styles.fallbackIndicator}>
                              <span>Using default image</span>
                            </div>
                            {/* Hover Overlay for Upload */}
                            <div className={styles.imageOverlay}>
                              <label htmlFor={`image-upload-${image.id}`} className={styles.uploadButton}>
                                <FiUpload size={14} />
                                Upload Image
                              </label>
                              <input
                                type="file"
                                id={`image-upload-${image.id}`}
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files[0]) {
                                    setSelectedImageFiles(prev => ({ ...prev, [image.id]: e.target.files[0] }));
                                  }
                                }}
                                className={styles.fileInput}
                                style={{ display: 'none' }}
                              />
                            </div>
                          </div>
                        );
                      }
                    })()}
                    
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
                    
                    {/* Selected File Info - Show below image when file is selected */}
                    {selectedImageFiles[image.id] && (
                      <div className={styles.selectedFileInfo}>
                        <span className={styles.fileName}>{selectedImageFiles[image.id].name}</span>
                        <span className={styles.fileSize}>
                          {(selectedImageFiles[image.id].size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <span className={styles.uploadNote}>
                          Image will be uploaded when you save changes
                        </span>
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
                    )}
                  </>
                ) : (
                  <div className={styles.readOnlyContent}>
                    {(() => {
                      // Use the same fallback logic as the public portal
                      const isFirst = index === 0;
                      const fallbackImageSrc = isFirst ? "/samples/sample2.jpg" : index === 1 ? "/samples/sample8.jpg" : "/samples/sample3.jpeg";
                      const imageSrc = image.url || fallbackImageSrc;
                      
                      // Use getImageUrl for uploaded images, direct path for fallbacks
                      const finalImageSrc = image.url ? getImageUrl(image.url, 'hero', 'images') : fallbackImageSrc;
                      
                      return (
                        <div className={styles.preview}>
                          <Image 
                            src={finalImageSrc} 
                            alt={`Banner image ${index + 1}`} 
                            width={200}
                            height={150}
                            unoptimized
                            style={{ maxWidth: '100%', height: 'auto', objectFit: 'cover' }}
                          />
                          {!image.url && (
                            <div className={styles.fallbackIndicator}>
                              <span>Using default image</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
          {heroData?.video_link ? (
            iframeError ? (
              <div style={{ 
                color: 'white', 
                textAlign: 'center', 
                padding: '2rem',
                background: 'rgba(220, 38, 38, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(220, 38, 38, 0.3)'
              }}>
                <p style={{ fontSize: '16px', marginBottom: '1rem' }}>
                  Video embed failed to load
                </p>
                <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '1rem' }}>
                  The video may be private, have embedding disabled, or the URL is invalid.
                </p>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Video URL: {heroData.video_link}
                </p>
                <button 
                  onClick={() => {
                    setIframeError(false);
                    setShowVideoModal(false);
                  }}
                  style={{ 
                    marginTop: '1rem', 
                    padding: '0.75rem 1.5rem', 
                    background: '#3b82f6', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <iframe
                src={convertToEmbedUrl(heroData.video_link)}
                className={styles.videoPlayer}
                frameBorder="0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title="Hero Video"
                onError={() => setIframeError(true)}
                onLoad={() => {
                  // Reset error state when iframe loads
                  setIframeError(false);
                }}
              />
            )
          ) : (
            <video 
              controls 
              autoPlay 
              className={styles.videoPlayer}
              onError={(e) => {
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

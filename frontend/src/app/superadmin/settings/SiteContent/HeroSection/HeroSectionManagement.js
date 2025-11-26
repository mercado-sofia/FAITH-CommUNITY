'use client';

import { useState, useEffect } from 'react';
import { FaPlay } from 'react-icons/fa';
import { FiTrash2, FiEdit3, FiUpload } from 'react-icons/fi';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import styles from './HeroSectionManagement.module.css';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/shared/portalAuth';
import { ConfirmationModal } from '@/components';
import { getImageUrl } from '@/utils/shared/uploadPaths';

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
  const [mounted, setMounted] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  
  // Upload loading states
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState({});
  
  // Separate edit states for each section
  const [isEditingText, setIsEditingText] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [isEditingImages, setIsEditingImages] = useState(false);
  
  // Temp data for each section
  const [tempTextData, setTempTextData] = useState({ tag: '', heading: '' });
  const [tempVideoData, setTempVideoData] = useState({ video_url: null, video_link: null, video_type: 'upload' });
  const [tempImagesData, setTempImagesData] = useState([]);
  
  // Modals for each section
  const [showTextModal, setShowTextModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showImagesModal, setShowImagesModal] = useState(false);
  
  // Video player modal (for fullscreen video viewing)
  const [showVideoPlayerModal, setShowVideoPlayerModal] = useState(false);
  
  // Loading states for each section
  const [isUpdatingText, setIsUpdatingText] = useState(false);
  const [isUpdatingVideo, setIsUpdatingVideo] = useState(false);
  const [isUpdatingImages, setIsUpdatingImages] = useState(false);
  
  // File selection states for video and images
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [selectedImageFiles, setSelectedImageFiles] = useState({});
  // Track images that should be deleted (images that had URLs but are now removed)
  const [imagesToDelete, setImagesToDelete] = useState(new Set());

  // Load hero data - only on mount to prevent race conditions
  useEffect(() => {
    let isMounted = true;
    
    const loadHeroData = async () => {
      try {
        const { API_BASE_URL } = await import('@/config/api');
        const baseUrl = API_BASE_URL || '';
        const response = await makeAuthenticatedRequest(
          `${baseUrl}/api/superadmin/hero-section`,
          { method: 'GET' },
          'superadmin'
        );

        if (!isMounted) return;

        if (response && response.ok) {
          const data = await response.json();
          if (data.data && isMounted) {
            // Use defaults if data is missing or empty (matching auto-insert values)
            const defaultHeroData = {
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
            };
            
            // Merge API data with defaults to ensure all fields have values
            const mergedHeroData = {
              tag: data.data.tag || defaultHeroData.tag,
              heading: data.data.heading || defaultHeroData.heading,
              video_url: data.data.video_url || defaultHeroData.video_url,
              video_link: data.data.video_link || defaultHeroData.video_link,
              video_type: data.data.video_type || defaultHeroData.video_type,
              images: data.data.images && data.data.images.length > 0 
                ? data.data.images.map((img, index) => ({
                    id: img.id || (index + 1),
                    url: img.url || null,
                    heading: img.heading || (defaultHeroData.images[index]?.heading || ''),
                    subheading: img.subheading || (defaultHeroData.images[index]?.subheading || '')
                  }))
                : defaultHeroData.images
            };
            
            setHeroData(mergedHeroData);
            // Reset iframe error when new data is loaded
            setIframeError(false);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Load error:', error);
          let errorMessage = 'Failed to load hero section data';
          
          if (error.message) {
            errorMessage = error.message;
          } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
          }
          
          showAuthError(errorMessage);
        }
      }
    };

    loadHeroData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Only run on mount

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showVideoPlayerModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showVideoPlayerModal]);

  // Handle ESC key to close video player
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showVideoPlayerModal) {
        setShowVideoPlayerModal(false);
      }
    };

    if (showVideoPlayerModal) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showVideoPlayerModal]);

  // Text Content Section Handlers
  const handleTextEditToggle = () => {
    if (!isEditingText) {
      setTempTextData({
        tag: heroData.tag,
        heading: heroData.heading
      });
    }
    setIsEditingText(!isEditingText);
  };

  const handleTextCancel = () => {
    setIsEditingText(false);
    setTempTextData({ tag: '', heading: '' });
  };

  const handleTextSave = () => {
    if (!tempTextData.tag?.trim()) {
      showSuccessModal('Tag cannot be empty');
      return;
    }
    if (!tempTextData.heading?.trim()) {
      showSuccessModal('Heading cannot be empty');
      return;
    }
    setShowTextModal(true);
  };

  const handleTextConfirm = async () => {
    try {
      setIsUpdatingText(true);
      const { API_BASE_URL } = await import('@/config/api');
      const baseUrl = API_BASE_URL || '';
      
      // Update both tag and heading in one request
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/hero-section`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...heroData,
            tag: tempTextData.tag.trim(),
            heading: tempTextData.heading.trim()
          }),
        },
        'superadmin'
      );

      if (response && response.ok) {
        const data = await response.json();
        setHeroData(prev => ({
          ...prev,
          tag: data.data.tag,
          heading: data.data.heading
        }));
        setIsEditingText(false);
        setTempTextData({ tag: '', heading: '' });
        showSuccessModal('Text content updated successfully! The changes will be visible on the public site immediately.');
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
        
        let errorMessage = 'Failed to update text content';
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
      let errorMessage = 'Failed to update text content';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
    } finally {
      setIsUpdatingText(false);
      setShowTextModal(false);
    }
  };

  const handleTextCancelModal = () => {
    setShowTextModal(false);
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
  // silent: if true, don't show success modal or update heroData (for batch operations)
  const handleFileUpload = async (file, type, imageId = null, silent = false) => {
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

      const { API_BASE_URL } = await import('@/config/api');
      const baseUrl = API_BASE_URL || '';
      
      const endpoint = imageId 
        ? `${baseUrl}/api/superadmin/hero-section/upload-image`
        : `${baseUrl}/api/superadmin/hero-section/upload-${type}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        // Don't set Content-Type - browser will set it with boundary for FormData
        body: formData,
      });


      if (response.ok) {
        const data = await response.json();
        if (imageId) {
          // Only update heroData and show modal if not in silent mode (batch operation)
          if (!silent) {
            setHeroData(prev => ({
              ...prev,
              images: prev.images.map(img => 
                img.id === imageId ? { ...img, url: data.data.url } : img
              )
            }));
            showSuccessModal('Image uploaded successfully!');
          }
          return data.data.url;
        } else {
          // Only update heroData and show modal if not in silent mode (batch operation)
          if (!silent) {
            setHeroData(prev => ({
              ...prev,
              [`${type}_url`]: data.data[`${type}_url`],
              video_link: type === 'video' ? null : prev.video_link, // Clear video link when uploading video
              video_type: type === 'video' ? 'upload' : prev.video_type
            }));
            showSuccessModal(`${type === 'video' ? 'Video' : 'File'} uploaded successfully!`);
          }
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

  // Video Content Section Handlers
  const handleVideoEditToggle = () => {
    if (!isEditingVideo) {
      setTempVideoData({
        video_url: heroData.video_url,
        video_link: heroData.video_link,
        video_type: heroData.video_type
      });
    }
    setIsEditingVideo(!isEditingVideo);
  };

  const handleVideoCancel = () => {
    setIsEditingVideo(false);
    setTempVideoData({ video_url: null, video_link: null, video_type: 'upload' });
    setSelectedVideoFile(null);
  };

  const handleVideoSave = () => {
    setShowVideoModal(true);
  };

  const handleVideoConfirm = async () => {
    try {
      setIsUpdatingVideo(true);
      const { API_BASE_URL } = await import('@/config/api');
      const baseUrl = API_BASE_URL || '';
      
      let finalVideoData = { ...tempVideoData };
      
      // Set video_type based on what's being used
      if (finalVideoData.video_link && !finalVideoData.video_url) {
        finalVideoData.video_type = 'link';
      } else if (finalVideoData.video_url && !finalVideoData.video_link) {
        finalVideoData.video_type = 'upload';
      }
      
      // Upload video if a new file is selected
      if (selectedVideoFile) {
        try {
          const videoUrl = await handleFileUpload(selectedVideoFile, 'video');
          if (videoUrl) {
            finalVideoData.video_url = videoUrl;
            finalVideoData.video_link = null;
            finalVideoData.video_type = 'upload';
            setSelectedVideoFile(null);
          } else {
            showSuccessModal('Failed to upload video. Please try again.');
            return;
          }
        } catch (error) {
          showSuccessModal('Failed to upload video. Please try again.');
          return;
        }
      }
      
      // Save video data
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/hero-section`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...heroData,
            video_url: finalVideoData.video_url,
            video_link: finalVideoData.video_link,
            video_type: finalVideoData.video_type
          }),
        },
        'superadmin'
      );

      if (response && response.ok) {
        const data = await response.json();
        setHeroData(prev => ({
          ...prev,
          video_url: data.data.video_url,
          video_link: data.data.video_link,
          video_type: data.data.video_type
        }));
        setIsEditingVideo(false);
        setTempVideoData({ video_url: null, video_link: null, video_type: 'upload' });
        showSuccessModal('Video content updated successfully! The changes will be visible on the public site immediately.');
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
        
        let errorMessage = 'Failed to update video content';
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
      let errorMessage = 'Failed to update video content';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
    } finally {
      setIsUpdatingVideo(false);
      setShowVideoModal(false);
    }
  };

  const handleVideoCancelModal = () => {
    setShowVideoModal(false);
  };

  // Handle immediate video upload when file is selected (only in edit mode)
  const handleVideoFileSelect = async (file) => {
    if (!file) return;
    
    setSelectedVideoFile(file);
    
    // Upload video immediately
    try {
      const videoUrl = await handleFileUpload(file, 'video');
      if (videoUrl) {
        // Update temp data with the uploaded video URL
        setTempVideoData(prev => ({
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

  // Banner Images Section Handlers
  const handleImagesEditToggle = () => {
    if (!isEditingImages) {
      setTempImagesData([...heroData.images]);
    }
    setIsEditingImages(!isEditingImages);
  };

  const handleImagesCancel = () => {
    setIsEditingImages(false);
    setTempImagesData([]);
    setSelectedImageFiles({});
    setImagesToDelete(new Set());
  };

  const handleImagesSave = () => {
    setShowImagesModal(true);
  };

  const handleImagesConfirm = async () => {
    try {
      setIsUpdatingImages(true);
      const { API_BASE_URL } = await import('@/config/api');
      const baseUrl = API_BASE_URL || '';
      
      let finalImagesData = [...tempImagesData];
      
      // First, delete images that were marked for deletion
      const deletePromises = Array.from(imagesToDelete).map(async (imageId) => {
        try {
          const endpoint = `${baseUrl}/api/superadmin/hero-section/image/${imageId}`;
          
          const response = await makeAuthenticatedRequest(
            endpoint,
            { method: 'DELETE' },
            'superadmin'
          );
          
          if (response && response.ok) {
            // Remove from finalImagesData
            finalImagesData = finalImagesData.map(img => 
              img.id === imageId ? { ...img, url: null } : img
            );
          } else {
            console.warn(`Failed to delete image ${imageId}, continuing with update`);
          }
        } catch (error) {
          console.error(`Error deleting image ${imageId}:`, error);
          // Continue with update even if deletion fails
        }
      });
      
      await Promise.all(deletePromises);
      
      // Upload new images (this will automatically replace old ones on the backend)
      // Only upload images that have selected files
      // Use silent=true to avoid showing modals and updating heroData during batch operation
      for (const [imageId, file] of Object.entries(selectedImageFiles)) {
        try {
          // The backend upload function will handle deleting the old image
          // Pass silent=true to prevent modal popups and state updates during batch save
          const imageUrl = await handleFileUpload(file, 'image', parseInt(imageId), true);
          if (imageUrl) {
            finalImagesData = finalImagesData.map(img => 
              img.id === parseInt(imageId) ? { ...img, url: imageUrl } : img
            );
            // Remove from imagesToDelete if it was there (since we're replacing, not deleting)
            setImagesToDelete(prev => {
              const newSet = new Set(prev);
              newSet.delete(parseInt(imageId));
              return newSet;
            });
          } else {
            showSuccessModal(`Failed to upload image ${imageId}. Please try again.`);
            return;
          }
        } catch (error) {
          showSuccessModal(`Failed to upload image ${imageId}. Please try again.`);
          return;
        }
      }
      
      // Clear selected files and deletion tracking
      setSelectedImageFiles({});
      setImagesToDelete(new Set());
      
      // Save images data
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/hero-section`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...heroData,
            images: finalImagesData
          }),
        },
        'superadmin'
      );

      if (response && response.ok) {
        const data = await response.json();
        setHeroData(prev => ({
          ...prev,
          images: data.data.images
        }));
        setIsEditingImages(false);
        setTempImagesData([]);
        showSuccessModal('Banner images updated successfully! The changes will be visible on the public site immediately.');
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
        
        let errorMessage = 'Failed to update banner images';
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
      let errorMessage = 'Failed to update banner images';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = `Network error: Cannot connect to backend. Please check:\n1. Backend is running\n2. NEXT_PUBLIC_API_URL is set correctly\n3. CORS is configured on backend`;
      }
      
      showSuccessModal(errorMessage);
    } finally {
      setIsUpdatingImages(false);
      setShowImagesModal(false);
    }
  };

  const handleImagesCancelModal = () => {
    setShowImagesModal(false);
  };

  // Handle video deletion in video edit mode
  const handleVideoDelete = () => {
    setDeleteType({ type: 'video' });
    setShowDeleteModal(true);
  };

  const handleVideoDeleteConfirm = async () => {
    if (!isEditingVideo) {
      // If not in edit mode, delete immediately
      try {
        setIsDeleting(true);
        const { API_BASE_URL } = await import('@/config/api');
        const baseUrl = API_BASE_URL || '';
        const endpoint = `${baseUrl}/api/superadmin/hero-section/video`;
        
        const response = await makeAuthenticatedRequest(
          endpoint,
          { method: 'DELETE' },
          'superadmin'
        );

        if (response && response.ok) {
          setHeroData(prev => ({
            ...prev,
            video_url: null,
            video_link: null,
            video_type: 'upload'
          }));
          showSuccessModal('Video deleted successfully!');
        } else {
          // Handle errors
          if (response.status === 401) {
            showSuccessModal('Authentication expired. Please log in again.');
            return;
          }
          
          if (response.status === 0) {
            showSuccessModal(`CORS error: Unable to connect to backend.`);
            return;
          }
          
          let errorMessage = 'Failed to delete video';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = response.statusText || `Server error (${response.status})`;
          }
          showSuccessModal(`${errorMessage} (Status: ${response.status})`);
        }
      } catch (error) {
        showSuccessModal('Failed to delete video. Please try again.');
      } finally {
        setIsDeleting(false);
        setShowDeleteModal(false);
        setDeleteType(null);
      }
    } else {
      // If in edit mode, just mark for deletion
      setTempVideoData(prev => ({
        ...prev,
        video_url: null,
        video_link: null,
        video_type: 'upload'
      }));
      setSelectedVideoFile(null);
      setShowDeleteModal(false);
      setDeleteType(null);
      showSuccessModal('Video will be deleted when you save changes');
    }
  };

  // Handle image deletion in images edit mode
  const handleImageDelete = (imageId) => {
    setDeleteType({ type: 'image', imageId });
    setShowDeleteModal(true);
  };

  const handleImageDeleteConfirm = async () => {
    if (!deleteType || !deleteType.imageId) return;
    
    if (!isEditingImages) {
      // If not in edit mode, delete immediately
      try {
        setIsDeleting(true);
        const { API_BASE_URL } = await import('@/config/api');
        const baseUrl = API_BASE_URL || '';
        const endpoint = `${baseUrl}/api/superadmin/hero-section/image/${deleteType.imageId}`;
        
        const response = await makeAuthenticatedRequest(
          endpoint,
          { method: 'DELETE' },
          'superadmin'
        );

        if (response && response.ok) {
          setHeroData(prev => ({
            ...prev,
            images: prev.images.map(img => 
              img.id === deleteType.imageId ? { ...img, url: null } : img
            )
          }));
          showSuccessModal('Image deleted successfully!');
        } else {
          // Handle errors
          if (response.status === 401) {
            showSuccessModal('Authentication expired. Please log in again.');
            return;
          }
          
          if (response.status === 0) {
            showSuccessModal(`CORS error: Unable to connect to backend.`);
            return;
          }
          
          let errorMessage = 'Failed to delete image';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            errorMessage = response.statusText || `Server error (${response.status})`;
          }
          showSuccessModal(`${errorMessage} (Status: ${response.status})`);
        }
      } catch (error) {
        showSuccessModal('Failed to delete image. Please try again.');
      } finally {
        setIsDeleting(false);
        setShowDeleteModal(false);
        setDeleteType(null);
      }
    } else {
      // If in edit mode, mark for deletion
      setImagesToDelete(prev => new Set(prev).add(deleteType.imageId));
      setTempImagesData(prev => prev.map(img => 
        img.id === deleteType.imageId ? { ...img, url: null } : img
      ));
      setSelectedImageFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[deleteType.imageId];
        return newFiles;
      });
      setShowDeleteModal(false);
      setDeleteType(null);
      showSuccessModal('Image will be deleted when you save changes');
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteType(null);
  };


  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Hero Section</h2>
          <p>Manage the main hero section content, including tag, heading, video, and banner images</p>
        </div>
      </div>

      <div className={styles.panelContent}>
        {/* Text Content Section */}
        <div className={styles.textContentSection}>
          <div className={styles.sectionHeader}>
            <h3>Text Content</h3>
            <div className={styles.headerActions}>
              {isEditingText ? (
                <>
                  <button
                    onClick={handleTextCancel}
                    className={styles.cancelBtn}
                    disabled={isUpdatingText}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTextSave}
                    disabled={isUpdatingText}
                    className={styles.saveBtn}
                  >
                    {isUpdatingText ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleTextEditToggle}
                  className={styles.editToggleBtn}
                  disabled={isUpdatingText}
                >
                  <FiEdit3 size={16} />
                  Edit
                </button>
              )}
            </div>
          </div>
          
          {isEditingText ? (
            <>
              {/* Tag */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Tag (Yellow text)</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={tempTextData.tag || ''}
                  onChange={(e) => setTempTextData(prev => ({ ...prev, tag: e.target.value }))}
                  placeholder="Enter tag text..."
                />
              </div>

              {/* Heading */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Main Heading</label>
                <textarea
                  className={styles.textInput}
                  rows={3}
                  value={tempTextData.heading || ''}
                  onChange={(e) => setTempTextData(prev => ({ ...prev, heading: e.target.value }))}
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
            <div className={styles.headerActions}>
              {isEditingVideo ? (
                <>
                  <button
                    onClick={handleVideoCancel}
                    className={styles.cancelBtn}
                    disabled={isUpdatingVideo}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVideoSave}
                    disabled={isUpdatingVideo || isUploadingVideo}
                    className={styles.saveBtn}
                  >
                    {isUpdatingVideo ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleVideoEditToggle}
                  className={styles.editToggleBtn}
                  disabled={isUpdatingVideo}
                >
                  <FiEdit3 size={16} />
                  Edit
                </button>
              )}
            </div>
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
                  <div className={styles.videoPlayOverlay} onClick={() => setShowVideoPlayerModal(true)}>
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
                      <div className={styles.videoPlayOverlay} onClick={() => setShowVideoPlayerModal(true)}>
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
              {isEditingVideo ? (
                <>
                  {/* Video Link Input */}
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Video Link (YouTube, Vimeo, etc.)</label>
                    <input
                      type="url"
                      className={styles.textInput}
                      value={tempVideoData.video_link || ''}
                      onChange={(e) => setTempVideoData(prev => ({ ...prev, video_link: e.target.value }))}
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
                  ) : tempVideoData.video_url ? (
                    <div className={styles.uploadActions}>
                      <div className={styles.videoPreviewContainer}>
                        <video 
                          src={tempVideoData.video_url} 
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }}
                          controls
                        />
                        <div className={styles.videoOverlay}>
                          <button
                            onClick={handleVideoDelete}
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
          <div className={styles.sectionHeader}>
            <h3>Banner Images</h3>
            <div className={styles.headerActions}>
              {isEditingImages ? (
                <>
                  <button
                    onClick={handleImagesCancel}
                    className={styles.cancelBtn}
                    disabled={isUpdatingImages}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImagesSave}
                    disabled={isUpdatingImages}
                    className={styles.saveBtn}
                  >
                    {isUpdatingImages ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleImagesEditToggle}
                  className={styles.editToggleBtn}
                  disabled={isUpdatingImages}
                >
                  <FiEdit3 size={16} />
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className={styles.imagesGrid}>
            {(isEditingImages ? tempImagesData : heroData.images || []).map((image, index) => (
              <div key={image.id} className={styles.imageItem}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemLabel}>Image {index + 1}</span>
                  <div className={styles.itemActions}>
                    {isEditingImages && image.url && !imagesToDelete.has(image.id) && (
                          <button 
                            className={styles.removeBtn}
                            onClick={() => handleImageDelete(image.id)}
                            title="Remove image"
                          >
                            <FiTrash2 color="#dc2626" />
                          </button>
                    )}
                  </div>
                </div>
                
                {isEditingImages ? (
                  <>
                    {/* Image Preview */}
                    {(() => {
                      // Use the same fallback logic as the public portal
                      const isFirst = index === 0;
                      const defaultImageSrc = isFirst ? "/samples/sample2.jpg" : index === 1 ? "/samples/sample8.jpg" : "/samples/sample3.jpeg";
                      
                      // Check if image is marked for deletion
                      const isMarkedForDeletion = imagesToDelete.has(image.id);
                      
                      // Prioritize newly selected file over existing image URL
                      // This ensures the new selection immediately replaces the old preview
                      if (selectedImageFiles[image.id]) {
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
                                    const newFile = e.target.files[0];
                                    // Set the new file - preview logic will prioritize this over image.url
                                    setSelectedImageFiles(prev => ({ ...prev, [image.id]: newFile }));
                                    // Clear deletion flag since we're replacing, not deleting
                                    setImagesToDelete(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(image.id);
                                      return newSet;
                                    });
                                    // Don't clear the URL - let the preview logic handle it
                                    // The selectedImageFiles check happens first, so new file will show
                                    // Old URL will be replaced when we save
                                  }
                                  // Reset input value to allow selecting the same file again
                                  e.target.value = '';
                                }}
                                className={styles.fileInput}
                                style={{ display: 'none' }}
                              />
                            </div>
                          </div>
                        );
                      } else if (image.url && !isMarkedForDeletion) {
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
                                Replace Image
                              </label>
                              <input
                                type="file"
                                id={`image-upload-${image.id}`}
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files[0]) {
                                    const newFile = e.target.files[0];
                                    // Set the new file - preview logic will prioritize this over image.url
                                    setSelectedImageFiles(prev => ({ ...prev, [image.id]: newFile }));
                                    // Clear deletion flag since we're replacing, not deleting
                                    setImagesToDelete(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(image.id);
                                      return newSet;
                                    });
                                    // Don't clear the URL - let the preview logic handle it
                                    // The selectedImageFiles check happens first, so new file will show
                                    // Old URL will be replaced when we save
                                  }
                                  // Reset input value to allow selecting the same file again
                                  e.target.value = '';
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
                                    const newFile = e.target.files[0];
                                    // Set the new file - preview logic will prioritize this over image.url
                                    setSelectedImageFiles(prev => ({ ...prev, [image.id]: newFile }));
                                    // Clear deletion flag since we're replacing, not deleting
                                    setImagesToDelete(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(image.id);
                                      return newSet;
                                    });
                                    // Don't clear the URL - let the preview logic handle it
                                    // The selectedImageFiles check happens first, so new file will show
                                    // Old URL will be replaced when we save
                                  }
                                  // Reset input value to allow selecting the same file again
                                  e.target.value = '';
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
                          value={tempImagesData[index]?.heading || ''}
                          onChange={(e) => {
                            const newImages = [...tempImagesData];
                            newImages[index].heading = e.target.value;
                            setTempImagesData(newImages);
                          }}
                          placeholder="Enter image heading..."
                        />
                      </div>
                      
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Subheading</label>
                        <input
                          type="text"
                          className={styles.textInput}
                          value={tempImagesData[index]?.subheading || ''}
                          onChange={(e) => {
                            const newImages = [...tempImagesData];
                            newImages[index].subheading = e.target.value;
                            setTempImagesData(newImages);
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
                          onClick={() => {
                            setSelectedImageFiles(prev => {
                              const newFiles = { ...prev };
                              delete newFiles[image.id];
                              return newFiles;
                            });
                            // If there was an original image, it will show again
                            // If not, it will show the default
                          }}
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
        onConfirm={deleteType?.imageId ? handleImageDeleteConfirm : handleVideoDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
      
      {/* Text Content Update Modal */}
      <ConfirmationModal
        isOpen={showTextModal}
        itemName="Text Content"
        itemType="text content"
        actionType="update"
        onConfirm={handleTextConfirm}
        onCancel={handleTextCancelModal}
        isDeleting={isUpdatingText}
        customMessage="This will update the text content (tag and heading) across the entire public website. The changes will be visible immediately."
      />
      
      {/* Video Content Update Modal */}
      <ConfirmationModal
        isOpen={showVideoModal}
        itemName="Video Content"
        itemType="video content"
        actionType="update"
        onConfirm={handleVideoConfirm}
        onCancel={handleVideoCancelModal}
        isDeleting={isUpdatingVideo}
        customMessage="This will update the video content across the entire public website. The changes will be visible immediately."
      />
      
      {/* Banner Images Update Modal */}
      <ConfirmationModal
        isOpen={showImagesModal}
        itemName="Banner Images"
        itemType="banner images"
        actionType="update"
        onConfirm={handleImagesConfirm}
        onCancel={handleImagesCancelModal}
        isDeleting={isUpdatingImages}
        customMessage="This will update the banner images across the entire public website. The changes will be visible immediately."
      />

      {/* Full Viewport Video Player Modal */}
      {showVideoPlayerModal && mounted && (heroData?.video_url || heroData?.video_link) && createPortal(
        <div 
          className={styles.videoOverlay}
          onClick={(e) => {
            // Close video when clicking on overlay (not on video itself)
            if (e.target === e.currentTarget) {
              setShowVideoPlayerModal(false);
            }
          }}
        >
          <button className={styles.closeButton} onClick={() => setShowVideoPlayerModal(false)}>✖</button>
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
                    setShowVideoPlayerModal(false);
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
                setShowVideoPlayerModal(false);
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

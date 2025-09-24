'use client';

import { useState, useEffect } from 'react';
import { FaUpload, FaPlay, FaEdit } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import Image from 'next/image';
import styles from './HeroSectionManagement.module.css';
import { makeAuthenticatedRequest, showAuthError } from '@/utils/adminAuth';
import ConfirmationModal from '../../../components/ConfirmationModal';

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
  const [heroLoading, setHeroLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Edit states for each section
  const [isEditingText, setIsEditingText] = useState(false);
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [isEditingImages, setIsEditingImages] = useState({});
  const [editingImage, setEditingImage] = useState(null);

  // Load hero data
  useEffect(() => {
    const loadHeroData = async () => {
      try {
        setHeroLoading(true);
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
        setHeroLoading(false);
      }
    };

    loadHeroData();
  }, [showSuccessModal]);

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

  // Edit state handlers
  const toggleTextEdit = () => setIsEditingText(!isEditingText);
  const toggleVideoEdit = () => setIsEditingVideo(!isEditingVideo);
  const toggleImageEdit = (imageId) => {
    setIsEditingImages(prev => ({
      ...prev,
      [imageId]: !prev[imageId]
    }));
  };

  // Cancel edit handlers
  const cancelTextEdit = () => setIsEditingText(false);
  const cancelVideoEdit = () => setIsEditingVideo(false);
  const cancelImageEdit = (imageId) => {
    setIsEditingImages(prev => ({
      ...prev,
      [imageId]: false
    }));
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

  // Update video link
  const handleVideoLinkUpdate = async (videoLink, videoType) => {
    try {
      setIsUpdating(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/hero-section/video-link`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ video_link: videoLink, video_type: videoType }),
        },
        'superadmin'
      );

      if (response && response.ok) {
        setHeroData(prev => ({
          ...prev,
          video_link: videoLink,
          video_type: videoType,
          video_url: null // Clear uploaded video when using link
        }));
        showSuccessModal('Video link updated successfully!');
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || 'Failed to update video link');
      }
    } catch (error) {
      console.error('Error updating video link:', error);
      showSuccessModal('Failed to update video link. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Update image text content
  const handleImageTextUpdate = async (imageId, field, value) => {
    try {
      setIsUpdating(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await makeAuthenticatedRequest(
        `${baseUrl}/api/superadmin/hero-section/image-text`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageId, field, value }),
        },
        'superadmin'
      );

      if (response && response.ok) {
        setHeroData(prev => ({
          ...prev,
          images: prev.images.map(img => 
            img.id === imageId ? { ...img, [field]: value } : img
          )
        }));
        showSuccessModal('Image text updated successfully!');
      } else {
        const errorData = await response.json();
        showSuccessModal(errorData.message || 'Failed to update image text');
      }
    } catch (error) {
      console.error('Error updating image text:', error);
      showSuccessModal('Failed to update image text. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // File upload handlers
  const handleFileUpload = async (file, type, imageId = null) => {
    try {
      console.log('Starting file upload:', { type, imageId, fileName: file.name, fileSize: file.size, fileType: file.type });
      
      const formData = new FormData();
      formData.append(type, file);
      if (imageId) {
        formData.append('imageId', imageId);
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Get the token for manual request
      const token = localStorage.getItem('superAdminToken');
      if (!token) {
        console.log('No token found');
        showSuccessModal('Authentication required. Please log in again.');
        return;
      }

      const endpoint = imageId 
        ? `${baseUrl}/api/superadmin/hero-section/upload-image`
        : `${baseUrl}/api/superadmin/hero-section/upload-${type}`;

      console.log('Making request to:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Response received:', { status: response.status, statusText: response.statusText });

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

  if (heroLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading hero section settings...</p>
      </div>
    );
  }

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
            <button className={styles.editBtn} onClick={toggleTextEdit}>
              <FaEdit /> Edit
            </button>
          </div>
          
          {isEditingText ? (
            <>
              {/* Tag */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Tag (Yellow text)</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={heroData.tag}
                  onChange={(e) => setHeroData(prev => ({ ...prev, tag: e.target.value }))}
                  placeholder="Enter tag text..."
                />
              </div>

              {/* Heading */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Main Heading</label>
                <textarea
                  className={styles.textInput}
                  rows={3}
                  value={heroData.heading}
                  onChange={(e) => setHeroData(prev => ({ ...prev, heading: e.target.value }))}
                  placeholder="Enter main heading..."
                />
              </div>

              {/* Action Buttons */}
              <div className={styles.actionButtons}>
                <button className={styles.cancelBtn} onClick={cancelTextEdit}>
                  Cancel
                </button>
                <button className={styles.saveBtn} onClick={async () => {
                  // Save both tag and heading
                  await handleTextUpdate('tag', heroData.tag);
                  await handleTextUpdate('heading', heroData.heading);
                  setIsEditingText(false);
                }}>
                  Save Changes
                </button>
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
            <button className={styles.editBtn} onClick={toggleVideoEdit}>
              <FaEdit /> Edit
            </button>
          </div>
          {/* Video Preview - Always Visible */}
          <div className={styles.mediaItem}>
            <div className={styles.itemHeader}>
              <span className={styles.itemLabel}>Hero Video</span>
              {(heroData.video_url || heroData.video_link) && (
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
                  controls
                  style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                />
              </div>
            ) : heroData.video_link ? (
              <div className={styles.videoPreview}>
                <iframe
                  src={convertToEmbedUrl(heroData.video_link)}
                  style={{ width: '100%', height: '200px', border: 'none' }}
                  title="Video Preview"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className={styles.emptyState}>
                <FaPlay size={24} />
                <span>No video uploaded or linked</span>
              </div>
            )}
          </div>

          {isEditingVideo ? (
            <div className={styles.mediaItem}>
              {/* Video Link Input */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Video Link (YouTube, Vimeo, etc.)</label>
                <input
                  type="url"
                  className={styles.textInput}
                  value={heroData.video_link || ''}
                  onChange={(e) => setHeroData(prev => ({ ...prev, video_link: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              
              <div className={styles.orSeparator}>
                <span className={styles.orText}>OR</span>
              </div>
              
              {/* Video Upload */}
              <input
                type="file"
                id="video-upload"
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    handleFileUpload(e.target.files[0], 'video');
                  }
                }}
                style={{ display: 'none' }}
              />
              <label htmlFor="video-upload" className={styles.uploadBtn}>
                <FaUpload /> Upload Video File
              </label>

              {/* Action Buttons */}
              <div className={styles.actionButtons}>
                <button className={styles.cancelBtn} onClick={cancelVideoEdit}>
                  Cancel
                </button>
                <button className={styles.saveBtn} onClick={async () => {
                  // Save video link if it exists
                  if (heroData.video_link) {
                    await handleVideoLinkUpdate(heroData.video_link, 'link');
                  }
                  setIsEditingVideo(false);
                }}>
                  Save Changes
                </button>
              </div>
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
                    <button className={styles.editBtn} onClick={() => toggleImageEdit(image.id)}>
                      <FaEdit /> Edit
                    </button>
                    {image.url && (
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
                
                {isEditingImages[image.id] ? (
                  <>
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
                    
                    {/* Image Text Content */}
                    <div className={styles.imageTextContent}>
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Heading</label>
                        <input
                          type="text"
                          className={styles.textInput}
                          value={image.heading}
                          onChange={(e) => {
                            const newImages = [...heroData.images];
                            newImages[index].heading = e.target.value;
                            setHeroData(prev => ({ ...prev, images: newImages }));
                          }}
                          placeholder="Enter image heading..."
                        />
                      </div>
                      
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Subheading</label>
                        <input
                          type="text"
                          className={styles.textInput}
                          value={image.subheading}
                          onChange={(e) => {
                            const newImages = [...heroData.images];
                            newImages[index].subheading = e.target.value;
                            setHeroData(prev => ({ ...prev, images: newImages }));
                          }}
                          placeholder="Enter image subheading..."
                        />
                      </div>
                    </div>
                    
                    <input
                      type="file"
                      id={`image-upload-${image.id}`}
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleFileUpload(e.target.files[0], 'image', image.id);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor={`image-upload-${image.id}`} className={styles.uploadBtn}>
                      <FaUpload /> Upload Image
                    </label>

                    {/* Action Buttons */}
                    <div className={styles.actionButtons}>
                      <button className={styles.cancelBtn} onClick={() => cancelImageEdit(image.id)}>
                        Cancel
                      </button>
                      <button className={styles.saveBtn} onClick={async () => {
                        // Save both heading and subheading
                        await handleImageTextUpdate(image.id, 'heading', image.heading);
                        await handleImageTextUpdate(image.id, 'subheading', image.subheading);
                        setIsEditingImages(prev => ({ ...prev, [image.id]: false }));
                      }}>
                        Save Changes
                      </button>
                    </div>
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
    </div>
  );
}

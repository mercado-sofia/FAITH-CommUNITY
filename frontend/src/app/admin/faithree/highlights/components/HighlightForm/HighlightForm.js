'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FaSpinner, FaTimes, FaUpload, FaImage, FaVideo, FaFile, FaEye } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';
import styles from './HighlightForm.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function HighlightForm({ mode = 'create', highlight = null, onCancel, onSubmit }) {
  const isEditMode = mode === 'edit';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    media: []
  });
  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState({ images: false, videos: false });
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Initialize form data
  useEffect(() => {
    if (isEditMode && highlight) {
      setFormData({
        title: highlight.title || '',
        description: highlight.description || '',
        media: highlight.media || []
      });
    }
  }, [isEditMode, highlight]);

  // Handle input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  }, [errors]);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle file upload
  const uploadFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'highlight');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      return {
        filename: result.filename,
        url: result.url,
        public_id: result.filePath,
        mimetype: file.type,
        size: file.size
      };
    } catch (error) {
      throw error;
    }
  }, []);

  // Handle file selection for images
  const handleImageFiles = useCallback(async (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Check file type (images only)
      const validImageTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
      ];
      
      if (!validImageTypes.includes(file.type)) {
        alert(`File ${file.name} is not a valid image format.`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Add files to uploading state
    setUploadingFiles(prev => [...prev, ...validFiles.map(f => f.name)]);

    try {
      const uploadPromises = validFiles.map(file => uploadFile(file));
      const uploadedFiles = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        media: [...prev.media, ...uploadedFiles]
      }));
    } catch (error) {
      alert('Some files failed to upload. Please try again.');
    } finally {
      setUploadingFiles(prev => prev.filter(name => !validFiles.some(f => f.name === name)));
    }
  }, [uploadFile]);

  // Handle file selection for videos
  const handleVideoFiles = useCallback(async (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Check file size (5MB minimum for videos)
      if (file.size < 5 * 1024 * 1024) {
        alert(`Video ${file.name} is too small. Minimum size is 5MB.`);
        return false;
      }
      
      // Check file type (videos only)
      const validVideoTypes = [
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'
      ];
      
      if (!validVideoTypes.includes(file.type)) {
        alert(`File ${file.name} is not a valid video format.`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Add files to uploading state
    setUploadingFiles(prev => [...prev, ...validFiles.map(f => f.name)]);

    try {
      const uploadPromises = validFiles.map(file => uploadFile(file));
      const uploadedFiles = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        media: [...prev.media, ...uploadedFiles]
      }));
    } catch (error) {
      alert('Some files failed to upload. Please try again.');
    } finally {
      setUploadingFiles(prev => prev.filter(name => !validFiles.some(f => f.name === name)));
    }
  }, [uploadFile]);

  // Handle drag events for images
  const handleImageDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, images: true }));
  }, []);

  const handleImageDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, images: false }));
  }, []);

  const handleImageDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleImageDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, images: false }));
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageFiles(files);
    }
  }, [handleImageFiles]);

  // Handle drag events for videos
  const handleVideoDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, videos: true }));
  }, []);

  const handleVideoDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, videos: false }));
  }, []);

  const handleVideoDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleVideoDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, videos: false }));
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleVideoFiles(files);
    }
  }, [handleVideoFiles]);

  // Handle file input change for images
  const handleImageInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleImageFiles(files);
    }
  }, [handleImageFiles]);

  // Handle file input change for videos
  const handleVideoInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleVideoFiles(files);
    }
  }, [handleVideoFiles]);

  // Remove media file
  const removeMedia = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  }, []);

  // Preview media file
  const previewMedia = useCallback((file) => {
    setPreviewFile(file);
  }, []);

  // Close preview
  const closePreview = useCallback(() => {
    setPreviewFile(null);
  }, []);

  // Get file icon
  const getFileIcon = (file) => {
    if (file.mimetype?.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm)$/i.test(file.filename || file.url)) {
      return <FaVideo />;
    } else if (file.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.filename || file.url)) {
      return <FaImage />;
    } else {
      return <FaFile />;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
    } catch (error) {
      // Handle error silently
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <FiArrowLeft />
          Back to Highlights
        </button>
        <h1 className={styles.title}>
          {isEditMode ? 'Edit Highlight' : 'Add New Highlight'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Left Column - Form Fields */}
          <div className={styles.formColumn}>
            {/* Title */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Title <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
                placeholder="Enter highlight title"
                disabled={isSubmitting}
              />
              {errors.title && (
                <span className={styles.errorText}>{errors.title}</span>
              )}
            </div>

            {/* Description */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Description <span className={styles.required}>*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                placeholder="Enter detailed description of the success story"
                rows={6}
                disabled={isSubmitting}
              />
              {errors.description && (
                <span className={styles.errorText}>{errors.description}</span>
              )}
            </div>
          </div>

          {/* Right Column - Media Upload */}
          <div className={styles.mediaColumn}>
            {/* Image Upload Area */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Image Upload
              </label>
              <div
                className={`${styles.uploadArea} ${dragActive.images ? styles.dragActive : ''}`}
                onDragEnter={handleImageDragEnter}
                onDragLeave={handleImageDragLeave}
                onDragOver={handleImageDragOver}
                onDrop={handleImageDrop}
              >
                <div className={styles.uploadContent}>
                  <FaImage className={styles.uploadIcon} />
                  <p className={styles.uploadText}>
                    Choose images or drag & drop them here
                  </p>
                  <p className={styles.uploadSubtext}>
                    Images in JPG, PNG, GIF, or WebP format
                  </p>
                  <button
                    type="button"
                    className={styles.uploadButton}
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    Select Images
                  </button>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageInputChange}
                  className={styles.fileInput}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Video Upload Area */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Video Upload
              </label>
              <div
                className={`${styles.uploadArea} ${dragActive.videos ? styles.dragActive : ''}`}
                onDragEnter={handleVideoDragEnter}
                onDragLeave={handleVideoDragLeave}
                onDragOver={handleVideoDragOver}
                onDrop={handleVideoDrop}
              >
                <div className={styles.uploadContent}>
                  <FaVideo className={styles.uploadIcon} />
                  <p className={styles.uploadText}>
                    Choose videos or drag & drop them here
                  </p>
                  <p className={styles.uploadSubtext}>
                    Videos minimum 5MB in MP4, AVI, MOV, WMV, FLV, or WebM format
                  </p>
                  <button
                    type="button"
                    className={styles.uploadButton}
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    Select Videos
                  </button>
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleVideoInputChange}
                  className={styles.fileInput}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Uploading Files */}
            {uploadingFiles.length > 0 && (
              <div className={styles.uploadingSection}>
                <h4 className={styles.uploadingTitle}>Uploading files...</h4>
                {uploadingFiles.map((fileName, index) => (
                  <div key={index} className={styles.uploadingItem}>
                    <FaSpinner className={styles.uploadingSpinner} />
                    <span className={styles.uploadingName}>{fileName}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Media Preview */}
            {formData.media.length > 0 && (
              <div className={styles.mediaPreview}>
                <h4 className={styles.previewTitle}>
                  Uploaded Files ({formData.media.length})
                </h4>
                <div className={styles.mediaList}>
                  {formData.media.map((file, index) => (
                    <div key={index} className={styles.mediaItem}>
                      <div className={styles.mediaIcon}>
                        {getFileIcon(file)}
                      </div>
                      <div className={styles.mediaInfo}>
                        <div className={styles.mediaName}>
                          {file.filename || file.originalName || `File ${index + 1}`}
                        </div>
                        <div className={styles.mediaDetails}>
                          {file.mimetype && (
                            <span className={styles.mediaType}>{file.mimetype}</span>
                          )}
                          {file.size && (
                            <span className={styles.mediaSize}>{formatFileSize(file.size)}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.mediaActions}>
                        <button
                          type="button"
                          className={styles.previewButton}
                          onClick={() => previewMedia(file)}
                          disabled={isSubmitting}
                          title="Preview file"
                        >
                          <FaEye />
                        </button>
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => removeMedia(index)}
                          disabled={isSubmitting}
                          title="Remove file"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className={styles.spinner} />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditMode ? 'Update Highlight' : 'Create Highlight'
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      {previewFile && (
        <div className={styles.previewModal} onClick={closePreview}>
          <div className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.previewHeader}>
              <h3 className={styles.previewTitle}>
                {previewFile.filename || previewFile.originalName || 'Preview'}
              </h3>
              <button
                type="button"
                className={styles.closePreviewButton}
                onClick={closePreview}
              >
                <FaTimes />
              </button>
            </div>
            <div className={styles.previewBody}>
              {previewFile.mimetype?.startsWith('image/') ? (
                <Image
                  src={previewFile.url}
                  alt={previewFile.filename || 'Preview'}
                  className={styles.previewImage}
                  width={400}
                  height={300}
                  style={{ objectFit: 'cover' }}
                />
              ) : previewFile.mimetype?.startsWith('video/') ? (
                <video
                  src={previewFile.url}
                  controls
                  className={styles.previewVideo}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className={styles.previewUnsupported}>
                  <FaFile className={styles.previewIcon} />
                  <p>Preview not available for this file type</p>
                </div>
              )}
            </div>
            <div className={styles.previewFooter}>
              <div className={styles.previewInfo}>
                {previewFile.mimetype && (
                  <span className={styles.previewType}>{previewFile.mimetype}</span>
                )}
                {previewFile.size && (
                  <span className={styles.previewSize}>{formatFileSize(previewFile.size)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

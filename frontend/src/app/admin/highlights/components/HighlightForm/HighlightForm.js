'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FaSpinner, FaTimes, FaImage, FaVideo, FaFile, FaEye, FaExclamationTriangle, FaCheckCircle, FaChevronDown } from 'react-icons/fa';
import { LuUpload } from 'react-icons/lu';
import { getProgramStatusByDates } from '@/utils/shared/programStatusUtils';
import { ContentEditor } from '@/app/admin/components';
import DOMPurify from 'dompurify';
import styles from './HighlightForm.module.css';
import { API_BASE_URL } from '@/config/api';

// Custom Dropdown Component (similar to DateSelectionField)
const CustomDropdown = ({ options, value, onChange, disabled, placeholder, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  // Use loose comparison to handle number/string type mismatches
  const selectedOption = options.find(option => Number(option.value) === Number(value));

  return (
    <div className={styles.customDropdown} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.dropdownButton} ${isOpen ? styles.dropdownOpen : ''} ${disabled ? styles.disabled : ''} ${error ? styles.inputError : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={styles.dropdownValue}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <FaChevronDown className={`${styles.dropdownArrow} ${isOpen ? styles.arrowUp : ''}`} />
      </button>
      
      {isOpen && (
        <div className={styles.dropdownOptions}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.dropdownOption} ${Number(value) === Number(option.value) ? styles.optionSelected : ''}`}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function HighlightForm({ mode = 'create', highlight = null, onCancel, onSubmit, headerTitle }) {
  const isEditMode = mode === 'edit';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    media: [],
    program_id: null,
    year: null
  });
  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState({ media: false });
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const mediaInputRef = useRef(null);

  // Fetch programs for dropdown
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setIsLoadingPrograms(true);
        // Check if admin is authenticated (using httpOnly cookies)
        const adminData = typeof window !== 'undefined' ? localStorage.getItem('adminData') : null;
        if (!adminData) {
          // Admin not authenticated, but don't redirect here - let the layout handle it
          setIsLoadingPrograms(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL || ''}/api/admin/programs`, {
          credentials: 'include', // CRITICAL: Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header needed - httpOnly cookies handle authentication
          },
        });

        if (!response.ok) {
          // Only log error, don't redirect - let the layout handle auth errors
          if (response.status === 401) {
            console.error('Authentication failed while fetching programs');
            // The layout will handle the redirect
          } else {
            console.error('Failed to fetch programs:', response.status);
          }
          setIsLoadingPrograms(false);
          return;
        }

        const result = await response.json();
        const programsData = result.data || result.programs || [];
        
        // Filter to only show:
        // 1. Completed programs (using getProgramStatusByDates to respect manual_status_override)
        // 2. That have an approved Post Act Report (has_approved_post_act_report === true)
        // Upcoming and Active programs cannot have highlights
        let eligiblePrograms = programsData.filter(program => {
          const programStatus = getProgramStatusByDates(program);
          return programStatus === 'Completed' && 
                 (program.has_approved_post_act_report === true || program.has_approved_post_act_report === 1);
        });
        
        // In edit mode, if the highlight's associated program is not in the filtered list,
        // include it anyway so the dropdown can show the current selection
        if (isEditMode && highlight && highlight.program_id) {
          // Convert highlight.program_id to number for comparison
          const highlightProgramId = typeof highlight.program_id === 'string' 
            ? parseInt(highlight.program_id, 10) 
            : highlight.program_id;
          
          // Find the associated program using loose comparison to handle type mismatches
          const associatedProgram = programsData.find(p => Number(p.id) === Number(highlightProgramId));
          
          if (associatedProgram) {
            // Check if it's already in eligiblePrograms using loose comparison
            const isAlreadyIncluded = eligiblePrograms.some(p => Number(p.id) === Number(associatedProgram.id));
            
            if (!isAlreadyIncluded) {
              // Add the associated program at the beginning even if it doesn't meet the filter criteria
              eligiblePrograms = [associatedProgram, ...eligiblePrograms];
            } else {
              // If already included, move it to the top for better visibility
              eligiblePrograms = eligiblePrograms.filter(p => Number(p.id) !== Number(associatedProgram.id));
              eligiblePrograms = [associatedProgram, ...eligiblePrograms];
            }
          }
        }
        
        setPrograms(eligiblePrograms);
      } catch (error) {
        console.error('Error fetching programs:', error);
        setPrograms([]);
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, [isEditMode, highlight]);

  // Initialize form data
  useEffect(() => {
    if (isEditMode && highlight) {
      // Edit mode: populate form with existing highlight data
      // Ensure program_id is properly converted to number if it exists
      const programId = highlight.program_id 
        ? (typeof highlight.program_id === 'string' ? parseInt(highlight.program_id, 10) : highlight.program_id)
        : null;
      
      setFormData({
        title: highlight.title || '',
        description: highlight.description || '',
        media: highlight.media || [],
        program_id: programId,
        year: highlight.year !== null && highlight.year !== undefined ? highlight.year : null
      });
    } else {
      // Create mode: reset form to empty state
      setFormData({
        title: '',
        description: '',
        media: [],
        program_id: null,
        year: null
      });
    }
    // Clear any existing errors when switching modes
    setErrors({});
  }, [isEditMode, highlight]);

  // Re-initialize program_id when programs are loaded in edit mode
  // This ensures the dropdown shows the correct value even if programs loaded after form data
  useEffect(() => {
    if (isEditMode && highlight && !isLoadingPrograms && programs.length > 0) {
      const programId = highlight.program_id 
        ? (typeof highlight.program_id === 'string' ? parseInt(highlight.program_id, 10) : highlight.program_id)
        : null;
      
      // Update program_id if it exists and is different from current, or if current is null/undefined
      setFormData(prev => {
        if (programId !== null && programId !== undefined && prev.program_id !== programId) {
          return {
            ...prev,
            program_id: programId
          };
        }
        return prev;
      });
    }
  }, [isEditMode, highlight, isLoadingPrograms, programs.length]); // highlight is needed because it's used in the condition

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

  // Generate year options (from 1900 to current year - only past and current years)
  // Note: Uses new Date().getFullYear() to automatically include the current year
  // This means the dropdown will automatically update when the year changes (e.g., 2025 -> 2026)
  const generateYearOptions = useCallback(() => {
    const currentYear = new Date().getFullYear(); // Dynamically gets the current year
    const startYear = 1900;
    const endYear = currentYear; // Only up to current year, no future years
    const years = [];
    
    for (let year = endYear; year >= startYear; year--) {
      years.push({
        value: year,
        label: year.toString()
      });
    }
    
    return years;
  }, []); // Empty deps - function is called on every render anyway, so it always gets current year

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    if (!formData.program_id) {
      newErrors.program_id = 'Associated Program is required';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    // Check if description has actual text content (not just HTML tags)
    if (!formData.description || !formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (typeof document !== 'undefined') {
      // Check if there's actual text content (strip HTML tags)
      const textContent = document.createElement('div');
      textContent.innerHTML = DOMPurify.sanitize(formData.description);
      const plainText = (textContent.textContent || textContent.innerText || '').trim();
      if (!plainText) {
        newErrors.description = 'Description is required';
      }
    }
    
    // Year is required
    if (!formData.year || formData.year === null || formData.year === undefined) {
      newErrors.year = 'Year is required';
    } else {
      const yearNum = parseInt(formData.year, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
        newErrors.year = 'Year must be between 1900 and ' + currentYear;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle file upload
  const uploadFile = useCallback(async (file) => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      throw new Error('Cannot upload file on server side');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'highlight');
    
    try {
      // Send uploadType in query params for multer to use before parsing body
      const response = await fetch(`${API_BASE_URL || ''}/api/upload?type=highlight`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        // Don't set Content-Type - browser will set it with boundary for FormData
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
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

  // Handle file selection for media (images and videos)
  const handleMediaFiles = useCallback(async (files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];
    
    const validImageTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
    ];
    
    const validVideoTypes = [
      'video/mp4', 'video/mpeg', // MP4
      'video/quicktime', // MOV (QuickTime)
      'video/x-msvideo', // AVI
      'video/x-ms-wmv', // WMV
      'video/x-flv', // FLV
      'video/webm' // WebM
    ];
    
    fileArray.forEach(file => {
      const isImage = validImageTypes.includes(file.type);
      const isVideo = validVideoTypes.includes(file.type);
      
      if (!isImage && !isVideo) {
        errors.push(`${file.name}: Invalid file format. Allowed: Images (JPEG, PNG, GIF, WebP) or Videos (MP4, MOV, AVI, WMV, FLV, WebM)`);
        return;
      }
      
      // Check file size (5MB minimum for videos)
      if (isVideo && file.size < 5 * 1024 * 1024) {
        errors.push(`${file.name}: Video must be at least 5MB`);
        return;
      }
      
      validFiles.push(file);
    });

    // Show errors if any
    if (errors.length > 0) {
      alert('Media upload errors:\n' + errors.join('\n'));
    }

    if (validFiles.length === 0) return;

    // Add files to uploading state
    setUploadingFiles(prev => [...prev, ...validFiles.map(f => f.name)]);

    try {
      setUploadComplete(false);
      const uploadPromises = validFiles.map(file => uploadFile(file));
      const uploadedFiles = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        media: [...prev.media, ...uploadedFiles]
      }));
      
      // Show success message after upload completes
      setUploadComplete(true);
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadComplete(false);
      }, 3000);
    } catch (error) {
      // Files failed to upload - show error message
      console.error('Media upload failed:', error);
      alert(`Failed to upload media file(s): ${error.message || 'Unknown error'}`);
      setUploadComplete(false);
    } finally {
      setUploadingFiles(prev => prev.filter(name => !validFiles.some(f => f.name === name)));
    }
  }, [uploadFile]);

  // Handle drag events for media
  const handleMediaDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, media: true }));
  }, []);

  const handleMediaDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, media: false }));
  }, []);

  const handleMediaDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleMediaDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, media: false }));
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleMediaFiles(files);
    }
  }, [handleMediaFiles]);

  // Handle file input change for media
  const handleMediaInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleMediaFiles(files);
    }
  }, [handleMediaFiles]);

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
      // Ensure program_id and year are properly formatted before submission
      const submissionData = {
        ...formData,
        program_id: formData.program_id != null ? Number(formData.program_id) : null,
        year: formData.year != null ? Number(formData.year) : null
      };
      
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Error submitting highlight form:', error);
      // Handle error silently
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit]);

  return (
    <>
      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Header with Title and Action Buttons */}
        <div className={styles.formHeader}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.backLink}
              disabled={isSubmitting}
            >
              Go Back
            </button>
            <h1>{headerTitle || (isEditMode ? 'Edit Highlight' : 'Create Highlight')}</h1>
          </div>
          <div className={styles.headerActions}>
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
        </div>

        <div className={styles.formLayout}>
          {/* Left Container - Form Fields */}
          <div className={styles.leftContainer}>
            {/* Program Selection */}
            <div className={styles.container}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Associated Program
                </label>
                {isLoadingPrograms ? (
                  <div className={styles.loadingPrograms}>
                    <FaSpinner className={styles.spinner} />
                    <span>Loading programs...</span>
                  </div>
                ) : programs.length === 0 ? (
                  <div className={styles.noProgramsMessage}>
                    <p className={styles.noProgramsText}>
                      No eligible programs found. Only <strong>Completed</strong> programs with an <strong>approved Post Act Report</strong> can have highlights.
                    </p>
                    <div className={styles.errorText}>
                      You must have at least one Completed program with an approved Post Act Report to create a highlight.
                    </div>
                  </div>
                ) : (
                  <>
                    <CustomDropdown
                      options={programs.map(program => ({
                        value: Number(program.id), // Ensure value is always a number
                        label: program.title || `Program #${program.id}`
                      }))}
                      value={formData.program_id != null ? Number(formData.program_id) : ''}
                      onChange={(value) => handleInputChange('program_id', value != null && value !== '' ? parseInt(value, 10) : null)}
                      disabled={isSubmitting}
                      placeholder="Select a program"
                      error={errors.program_id}
                    />
                    <p className={styles.helperText}>
                      Only Completed programs with approved Post Act Reports are eligible for highlights.
                    </p>
                  </>
                )}
                {errors.program_id && (
                  <span className={styles.errorText}>{errors.program_id}</span>
                )}
              </div>
            </div>

            {/* Title and Description */}
            <div className={styles.container}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Title
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
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Description
                </label>
                <div className={errors.description ? styles.editorError : ''}>
                  <ContentEditor
                  value={formData.description}
                    onChange={(value) => handleInputChange('description', value)}
                  placeholder="Enter detailed description of the success story"
                    showHeadings={false}
                    showAlignment={false}
                    showLink={false}
                    showQuote={false}
                    compact={true}
                />
                </div>
                {errors.description && (
                  <span className={styles.errorText}>{errors.description}</span>
                )}
              </div>
            </div>

          </div>

          {/* Right Panel - Media Upload */}
          <div className={styles.rightPanel}>
            {/* Year Selection */}
            <div className={styles.container}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  Year
                </label>
                <CustomDropdown
                  options={generateYearOptions()}
                  value={formData.year != null ? Number(formData.year) : ''}
                  onChange={(value) => handleInputChange('year', value != null && value !== '' ? parseInt(value, 10) : null)}
                  disabled={isSubmitting}
                  placeholder="Select year when highlight happened"
                  error={errors.year}
                />
                <p className={styles.helperText}>
                  Select the year when this highlight occurred.
                </p>
                {errors.year && (
                  <span className={styles.errorText}>{errors.year}</span>
                )}
              </div>
            </div>

            {/* Media Upload Container */}
            <div className={styles.container}>
              <h3 className={styles.containerTitle}>Media Upload</h3>
              <div
                className={`${styles.uploadArea} ${dragActive.media ? styles.dragActive : ''}`}
                onDragEnter={handleMediaDragEnter}
                onDragLeave={handleMediaDragLeave}
                onDragOver={handleMediaDragOver}
                onDrop={handleMediaDrop}
              >
                <div className={styles.uploadContent}>
                  <button
                    type="button"
                    className={styles.uploadButton}
                    onClick={() => mediaInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    <LuUpload className={styles.uploadIcon} />
                    Upload
                  </button>
                  <input
                    ref={mediaInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleMediaInputChange}
                    className={styles.hiddenInput}
                    disabled={isSubmitting}
                  />
                  <p className={styles.uploadText}>
                    Choose images or videos or drag & drop them here.
                  </p>
                  <p className={styles.uploadSubtext}>
                    Images: JPG, JPEG, PNG, GIF, WebP. Videos: MP4, MOV, AVI, WMV, FLV, WebM (min 5 MB).
                  </p>
                </div>
              </div>
            </div>

            {/* Uploading Files */}
            {uploadingFiles.length > 0 && (
              <div className={styles.container}>
                <div className={styles.uploadingSection}>
                  <div className={styles.uploadingHeader}>
                    <FaExclamationTriangle className={styles.cautionIcon} />
                    <h4 className={styles.uploadingTitle}>Uploading files...</h4>
                  </div>
                  <p className={styles.uploadingCaution}>
                    Please wait while your files are being uploaded. Do not close this page or navigate away.
                  </p>
                  {uploadingFiles.map((fileName, index) => (
                    <div key={index} className={styles.uploadingItem}>
                      <FaSpinner className={styles.uploadingSpinner} />
                      <span className={styles.uploadingName}>{fileName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Media Preview */}
            {formData.media.length > 0 && (
              <div className={styles.container}>
                <h3 className={styles.containerTitle}>
                  Uploaded Files ({formData.media.length})
                </h3>
                <div className={styles.mediaPreview}>
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
              </div>
            )}
          </div>
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

      {/* Upload Complete Toast Overlay */}
      {uploadComplete && uploadingFiles.length === 0 && (
        <div className={styles.uploadCompleteToast}>
          <div className={styles.uploadCompleteToastContent}>
            <div className={styles.uploadCompleteHeader}>
              <FaCheckCircle className={styles.successIcon} />
              <h4 className={styles.uploadCompleteTitle}>Upload complete!</h4>
            </div>
            <p className={styles.uploadCompleteMessage}>
              Your files have been successfully uploaded and are ready to use.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import { FiUpload } from 'react-icons/fi';
import Image from 'next/image';
import ContentEditor from './ContentEditor';
import DatePickerPopover from './DatePickerPopover';
import DOMPurify from 'dompurify';
import { formatDateForInput, getCurrentDateISO } from '../../../../utils/dateUtils.js';
import styles from './styles/CreatePostForm.module.css';

const CreatePostForm = ({ onCancel, onSubmit, isSubmitting = false, initialData = null, isEditMode = false, existingNews = [] }) => {
  const getCurrentLocalDate = () => {
    return getCurrentDateISO();
  };

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featuredImage: null,
    publishedAt: getCurrentLocalDate(),
  });
  
  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);

  // Initialize form data when in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      setFormData({
        title: initialData.title || '',
        slug: initialData.slug || '',
        content: initialData.content || '',
        excerpt: initialData.excerpt || '',
        featuredImage: null, // Don't pre-populate file input
        publishedAt: formatDateForInput(initialData.published_at || initialData.date) || getCurrentLocalDate(),
      });

      // Set image preview if there's an existing featured image
      if (initialData.featured_image) {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        setImagePreview(`${API_BASE_URL}/${initialData.featured_image}`);
      }
    }
  }, [isEditMode, initialData]);

  // Auto-generate slug from title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  // Check for duplicate title within the same organization
  const checkDuplicateTitle = useCallback(async (title) => {
    if (!title || !title.trim() || isEditMode) return false;
    
    setIsCheckingTitle(true);
    try {
      // Check against existing news in the same organization
      const duplicateExists = existingNews.some(news => 
        news.title.toLowerCase().trim() === title.toLowerCase().trim() && 
        news.id !== (initialData?.id || null)
      );
      
      if (duplicateExists) {
        setErrors(prev => ({ 
          ...prev, 
          title: 'A post with this title already exists in your organization. Please choose a different title.' 
        }));
        return true;
      } else {
        setErrors(prev => ({ ...prev, title: '' }));
        return false;
      }
    } catch (error) {
      console.error('Error checking duplicate title:', error);
      return false;
    } finally {
      setIsCheckingTitle(false);
    }
  }, [existingNews, isEditMode, initialData?.id]);

  // Generate excerpt from content
  const generateExcerpt = useCallback(() => {
    if (!formData.content) {
      setErrors(prev => ({ ...prev, content: 'Content is required to generate excerpt' }));
      return;
    }

    // Sanitize and strip HTML tags
    const sanitized = DOMPurify.sanitize(formData.content, { ALLOWED_TAGS: [] });
    const plainText = sanitized.replace(/\s+/g, ' ').trim();
    
    if (plainText.length === 0) {
      setErrors(prev => ({ ...prev, content: 'Content must contain text to generate excerpt' }));
      return;
    }

    // Generate excerpt (max 180 characters, trim to last whole word)
    let excerpt = plainText.substring(0, 180);
    if (plainText.length > 180) {
      const lastSpaceIndex = excerpt.lastIndexOf(' ');
      if (lastSpaceIndex > 0) {
        excerpt = excerpt.substring(0, lastSpaceIndex);
      }
      excerpt += '…';
    }

    setFormData(prev => ({ ...prev, excerpt }));
    setErrors(prev => ({ ...prev, excerpt: '' }));
  }, [formData.content]);

  // Handle form field changes
  const handleInputChange = (field, value) => {
    const newFormData = {
      ...formData,
      [field]: value,
      // Auto-generate slug when title changes
      ...(field === 'title' && { slug: generateSlug(value) })
    };
    
    setFormData(newFormData);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear slug error when slug is auto-generated from title
    if (field === 'title' && errors.slug && newFormData.slug.trim()) {
      setErrors(prev => ({ ...prev, slug: '' }));
    }

    // Check for duplicate title when title changes (with debounce)
    if (field === 'title' && value && value.trim()) {
      const timeoutId = setTimeout(() => {
        checkDuplicateTitle(value);
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  };

  // Handle file upload
  const handleFileUpload = (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, featuredImage: 'Please select an image file' }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, featuredImage: 'Image must be less than 5MB' }));
      return;
    }

    setFormData(prev => ({ ...prev, featuredImage: file }));
    setErrors(prev => ({ ...prev, featuredImage: '' }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  // Validate form
  const validateForm = async () => {
    const newErrors = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
    if (!formData.content.trim()) newErrors.content = 'Content is required';
    if (!formData.excerpt.trim()) newErrors.excerpt = 'Excerpt is required';
    if (!formData.featuredImage && !imagePreview) newErrors.featuredImage = 'Featured image is required';
    if (!formData.publishedAt) newErrors.publishedAt = 'Published date is required';

    // Check for duplicate title if not in edit mode
    if (formData.title.trim() && !isEditMode) {
      const hasDuplicate = await checkDuplicateTitle(formData.title);
      if (hasDuplicate) {
        newErrors.title = 'A post with this title already exists in your organization. Please choose a different title.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;
    
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formLayout}>
        {/* Left Panel - Main Container */}
        <div className={styles.leftContainer}>
          <div className={styles.formContainer}>
            {/* Title */}
            <div className={styles.field}>
              <label className={styles.label}>
                Title <span className={styles.required}>*</span>
                {isCheckingTitle && <span className={styles.checkingIndicator}>Checking...</span>}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
                placeholder="Enter post title"
                disabled={isCheckingTitle}
              />
              {errors.title && <span className={styles.errorText}>{errors.title}</span>}
            </div>

            {/* Slug */}
            <div className={styles.field}>
              <label className={styles.label}>
                Slug <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                className={`${styles.input} ${errors.slug ? styles.inputError : ''}`}
                placeholder="post-slug-url"
              />
              {errors.slug && <span className={styles.errorText}>{errors.slug}</span>}
            </div>

            {/* Content */}
            <div className={styles.field}>
              <label className={styles.label}>
                Content <span className={styles.required}>*</span>
              </label>
              <div className={errors.content ? styles.editorError : ''}>
                <ContentEditor
                  value={formData.content}
                  onChange={(value) => handleInputChange('content', value)}
                  placeholder="Write your post content here..."
                />
              </div>
              {errors.content && <span className={styles.errorText}>{errors.content}</span>}
            </div>

            {/* Excerpt */}
            <div className={styles.field}>
              <label className={styles.label}>
                Excerpt <span className={styles.required}>*</span>
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                className={`${styles.textarea} ${errors.excerpt ? styles.inputError : ''}`}
                placeholder="Brief description of the post (max 180 characters)"
                rows={3}
                maxLength={180}
              />
              <div className={styles.excerptControls}>
                <button
                  type="button"
                  onClick={generateExcerpt}
                  className={styles.generateButton}
                  disabled={!formData.content}
                >
                  Generate excerpt
                </button>
                <span className={styles.charCount}>
                  {formData.excerpt.length}/180
                </span>
              </div>
              {errors.excerpt && <span className={styles.errorText}>{errors.excerpt}</span>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.publishButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? (isEditMode ? 'Saving...' : 'Publishing...') : (isEditMode ? 'Save Changes' : 'Publish')}
            </button>
          </div>
        </div>

        {/* Right Panel - Separate Containers */}
        <div className={styles.rightPanel}>
          {/* Featured Image Container */}
          <div className={styles.container}>
            <h3 className={styles.containerTitle}>
              Featured Image <span className={styles.required}>*</span>
            </h3>
            <div
              className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${errors.featuredImage ? styles.uploadError : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className={styles.imagePreview}>
                  <Image 
                    src={imagePreview} 
                    alt="Preview" 
                    width={280}
                    height={200}
                    className={styles.previewImage}
                    style={{ objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setFormData(prev => ({ ...prev, featuredImage: null }));
                    }}
                    className={styles.removeImage}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className={styles.uploadContent}>
                  <FiUpload className={styles.uploadIcon} />
                  <p className={styles.uploadText}>
                    Drag & Drop your files or{' '}
                    <label className={styles.browseLink}>
                      Browse
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files[0])}
                        className={styles.hiddenInput}
                      />
                    </label>
                  </p>
                </div>
              )}
            </div>
            {errors.featuredImage && <span className={styles.errorText}>{errors.featuredImage}</span>}
          </div>

          {/* Published At Container */}
          <div className={styles.container}>
            <h3 className={styles.containerTitle}>
              Published at <span className={styles.required}>*</span>
            </h3>
            <DatePickerPopover
              value={formData.publishedAt}
              onChange={(value) => handleInputChange('publishedAt', value)}
              placeholder="Select published date"
            />
            {errors.publishedAt && <span className={styles.errorText}>{errors.publishedAt}</span>}
          </div>
        </div>
      </div>
    </form>
  );
};

export default CreatePostForm;
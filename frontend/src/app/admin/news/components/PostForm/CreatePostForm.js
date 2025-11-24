'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { FiUpload } from 'react-icons/fi';
import { FaCaretDown } from 'react-icons/fa6';
import Image from 'next/image';
import ContentEditor from '../ContentEditor/ContentEditor';
import DatePickerPopover from '../DatePickerPopover/DatePickerPopover';
import UnsaveChangesModal from '../UnsaveChangesModal/UnsaveChangesModal';
import DOMPurify from 'dompurify';
import { formatDateTimeForInput, formatDateTime, getRelativeTime } from '@/utils/dateUtils.js';
import { API_BASE_URL } from '@/config/api';
import styles from './CreatePostForm.module.css';

const CreatePostForm = ({ onCancel, onSubmit, isSubmitting = false, initialData = null, isEditMode = false, existingNews = [], headerTitle }) => {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featuredImage: null,
    publishedAt: null, // Don't initialize with date - let user choose when scheduling
    status: 'draft',
  });
  
  // Store read-only fields for edit mode
  // Initialize with initialData if available to prevent flickering
  const [readOnlyFields, setReadOnlyFields] = useState(() => {
    if (isEditMode && initialData) {
      const currentStatus = initialData.status || 'draft';
      const hasPublishedAt = initialData.published_at || initialData.date;
      const shouldShowPublishedDate = currentStatus === 'published' || 
                                      (currentStatus === 'archived' && hasPublishedAt);
      
      return {
        // Always use published_at (it has full datetime with time)
        // For published/archived news, published_at should always exist
        // Do NOT fall back to date field - published_at is the source of truth
        originalPublishedAt: shouldShowPublishedDate ? (initialData.published_at || null) : null,
        // Use content_updated_at instead of updated_at - only tracks actual content edits
        updatedAt: initialData.content_updated_at || null,
        status: currentStatus,
        createdAt: initialData.created_at || null,
      };
    }
    return {
      originalPublishedAt: null,
      updatedAt: null, // Will use content_updated_at when available
      status: null,
      createdAt: null,
    };
  });
  
  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);
  const [submitAction, setSubmitAction] = useState(null); // 'draft', 'schedule', 'publish', or null
  const [isValidating, setIsValidating] = useState(false); // Track validation state
  // Initialize publishActionType based on initialData status if in edit mode
  const [publishActionType, setPublishActionType] = useState(() => {
    if (isEditMode && initialData) {
      const status = (initialData.status || 'draft').toLowerCase();
      // If editing scheduled news, default to 'schedule'
      if (status === 'scheduled') {
        return 'schedule';
      }
    }
    return 'publish'; // Default to 'publish' for create mode or non-scheduled edit mode
  });
  const [showPublishDropdown, setShowPublishDropdown] = useState(false);
  const publishDropdownRef = useRef(null);
  const submitActionRef = useRef(null); // Use ref to store action synchronously
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  
  // Store initial form data for comparison
  const initialFormDataRef = useRef(null);
  const initialPublishActionTypeRef = useRef(null);
  const initialImagePreviewRef = useRef(null);
  
  // Initialize initial form data ref for create mode (use useEffect to avoid render issues)
  useEffect(() => {
    if (!isEditMode && initialFormDataRef.current === null) {
      initialFormDataRef.current = {
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        featuredImage: null,
        publishedAt: null,
        status: 'draft',
      };
      initialPublishActionTypeRef.current = 'publish';
      initialImagePreviewRef.current = null;
    }
  }, [isEditMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (publishDropdownRef.current && !publishDropdownRef.current.contains(event.target)) {
        setShowPublishDropdown(false);
      }
    };
    if (showPublishDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPublishDropdown]);

  // Helper function to convert datetime to ISO format for DatePickerPopover
  // Handles both timezone-aware (UTC) and timezone-naive (DATETIME) strings
  const convertToISOFormat = (dateTimeString) => {
    if (!dateTimeString) return null;
    
    const normalizedString = dateTimeString.trim();
    
    // Check if the string has timezone info (Z or offset like +08:00)
    const hasTimezone = normalizedString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalizedString);
    
    if (hasTimezone) {
      // This is a timezone-aware string (likely UTC from JSON serialization of Date object)
      // Parse as UTC and convert to local time
      const date = new Date(normalizedString);
      if (isNaN(date.getTime())) {
        // If parsing fails, fall back to formatDateTimeForInput
        return formatDateTimeForInput(dateTimeString) || null;
      }
      
      // Get local time components from the Date object
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // This is a timezone-naive string (DATETIME field) - parse components directly
    // Use formatDateTimeForInput which extracts components without timezone conversion
    return formatDateTimeForInput(dateTimeString) || null;
  };

  // Initialize form data when in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      const currentStatus = (initialData.status || 'draft').toLowerCase();
      const publishedAt = initialData.published_at || initialData.date;
      
      // For scheduled news, convert the scheduled date/time to ISO format for DatePickerPopover
      let publishedAtValue = null;
      if (currentStatus === 'scheduled' && publishedAt) {
        publishedAtValue = convertToISOFormat(publishedAt);
      }
      
      const initialFormData = {
        title: initialData.title || '',
        slug: initialData.slug || '',
        content: initialData.content || '',
        excerpt: initialData.excerpt || '',
        featuredImage: null,
        publishedAt: publishedAtValue,
        status: 'draft',
      };
      
      setFormData(initialFormData);
      // Store initial form data for change detection (deep copy to prevent reference issues)
      initialFormDataRef.current = { ...initialFormData };
      
      // Set publishActionType to 'schedule' if editing scheduled news
      const initialActionType = currentStatus === 'scheduled' ? 'schedule' : 'publish';
      // Update state to match initial action type
      setPublishActionType(initialActionType);
      // Always update the ref to track the initial value
      initialPublishActionTypeRef.current = initialActionType;

      // Store read-only fields (published_at is immutable, updated_at is auto-set)
      // Only set originalPublishedAt if the news has actually been published (status = 'published')
      // or if it was published before being archived (status = 'archived' but has published_at)
      // Note: readOnlyFields is already initialized in useState, but we update here for consistency
      // Reuse currentStatus from above (line 112)
      const hasPublishedAt = initialData.published_at || initialData.date;
      const shouldShowPublishedDate = currentStatus === 'published' || 
                                      (currentStatus === 'archived' && hasPublishedAt);
      
      setReadOnlyFields({
        // Always use published_at (it has full datetime with time)
        // For published/archived news, published_at should always exist
        // Do NOT fall back to date field - published_at is the source of truth
        originalPublishedAt: shouldShowPublishedDate ? (initialData.published_at || null) : null,
        // Use content_updated_at instead of updated_at - only tracks actual content edits
        updatedAt: initialData.content_updated_at || null,
        status: currentStatus,
        createdAt: initialData.created_at || null,
      });

      // Set image preview if there's an existing featured image
      if (initialData.featured_image) {
        // Check if it's already a full URL (Cloudinary or other)
        const imageUrl = initialData.featured_image.startsWith('http') 
          ? initialData.featured_image 
          : `${API_BASE_URL || ''}/${initialData.featured_image}`;
        setImagePreview(imageUrl);
        initialImagePreviewRef.current = imageUrl;
      } else {
        initialImagePreviewRef.current = null;
      }
    }
  }, [isEditMode, initialData]);
  
  // Detect if form has unsaved changes
  const hasChanges = useMemo(() => {
    // Don't check for changes if initial data hasn't been set yet
    if (!initialFormDataRef.current) return false;
    
    const initial = initialFormDataRef.current;
    const current = formData;
    
    // Compare text fields (trim whitespace for accurate comparison)
    if ((initial.title || '').trim() !== (current.title || '').trim()) return true;
    if ((initial.slug || '').trim() !== (current.slug || '').trim()) return true;
    if ((initial.content || '').trim() !== (current.content || '').trim()) return true;
    if ((initial.excerpt || '').trim() !== (current.excerpt || '').trim()) return true;
    
    // Compare publishedAt (handle null/undefined cases)
    const initialPublishedAt = initial.publishedAt || null;
    const currentPublishedAt = current.publishedAt || null;
    if (initialPublishedAt !== currentPublishedAt) return true;
    
    // Compare featured image - only true if a NEW file was selected or existing image was removed
    // In edit mode: check if new file was selected OR if existing image was removed
    // In create mode: check if a file was selected
    if (isEditMode) {
      // In edit mode, check if:
      // 1. A new file was selected (current.featuredImage is a File object)
      // 2. Existing image was removed (had image before, now imagePreview is null and no new file)
      const hadInitialImage = initialImagePreviewRef.current !== null;
      const hasCurrentImage = imagePreview !== null;
      const hasNewFile = current.featuredImage instanceof File;
      
      if (hasNewFile) return true; // New file selected
      // If we had an image initially but don't have one now (and no new file), image was removed
      if (hadInitialImage && !hasCurrentImage && !hasNewFile) return true;
    } else {
      // In create mode, only check if a file was selected
      if (current.featuredImage instanceof File) return true;
    }
    
    // Compare publishActionType
    const initialActionType = initialPublishActionTypeRef.current || 'publish';
    if (publishActionType !== initialActionType) return true;
    
    return false;
  }, [formData, publishActionType, isEditMode, imagePreview]);
  
  // Handle back button click - check for unsaved changes
  const handleBackClick = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedModal(true);
      return;
    }
    onCancel();
  }, [hasChanges, onCancel]);
  
  // Handle unsaved changes modal confirm (discard changes)
  const handleUnsavedModalConfirm = useCallback(() => {
    setShowUnsavedModal(false);
    onCancel();
  }, [onCancel]);
  
  // Handle unsaved changes modal cancel (keep editing)
  const handleUnsavedModalCancel = useCallback(() => {
    setShowUnsavedModal(false);
  }, []);

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

    // Check for document to avoid SSR errors
    if (typeof document === 'undefined') {
      setErrors(prev => ({ ...prev, content: 'Cannot generate excerpt in server environment' }));
      return;
    }

    // Sanitize HTML and extract text while preserving logical spaces for line breaks
    const container = document.createElement('div');
    container.innerHTML = DOMPurify.sanitize(formData.content);
    // textContent captures line breaks from <br> and block elements as newlines
    const rawText = (container.textContent || container.innerText || '')
      .replace(/\u00A0/g, ' '); // convert non-breaking spaces

    // Collapse any sequence of whitespace/newlines into single spaces
    const plainText = rawText.replace(/\s+/g, ' ').trim();
    
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
      setTimeout(() => {
        checkDuplicateTitle(value);
      }, 500);
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
  const validateForm = async (action = null) => {
    const newErrors = {};
    const isDraft = action === 'draft';
    const isSchedule = action === 'schedule';
    const isPublish = action === 'publish';
    
    // For draft saves, only validate title and slug (minimal requirements)
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
    
    // For schedule/publish, validate all required fields
    if (!isDraft) {
      if (!formData.content.trim()) newErrors.content = 'Content is required';
      if (!formData.excerpt.trim()) newErrors.excerpt = 'Excerpt is required';
      if (!formData.featuredImage && !imagePreview) newErrors.featuredImage = 'Featured image is required';
      
      // Only validate publishedAt on create (it's immutable in edit mode)
      if (!isEditMode) {
        // For schedule action, publishedAt is REQUIRED and must be in the future
        if (isSchedule) {
          if (!formData.publishedAt) {
            newErrors.publishedAt = 'Please select a date and time for scheduling';
          } else {
            try {
              // Parse the datetime string properly
              let scheduledDateTime;
              if (formData.publishedAt.includes('T')) {
                // Parse ISO format: yyyy-MM-ddTHH:mm
                const parts = formData.publishedAt.split('T');
                if (parts.length === 2) {
                  const [datePart, timePart] = parts;
                  const [hours, minutes] = timePart.split(':').map(Number);
                  const [year, month, day] = datePart.split('-').map(Number);
                  
                  // Create Date object using components to avoid timezone interpretation issues
                  // This treats the datetime as local time, matching backend behavior
                  scheduledDateTime = new Date(year, month - 1, day, hours, minutes || 0, 0);
                } else {
                  newErrors.publishedAt = 'Invalid date and time format';
                  scheduledDateTime = null;
                }
              } else {
                newErrors.publishedAt = 'Please select a date and time for scheduling';
                scheduledDateTime = null;
              }
              
              // Validate that scheduled date is valid and in the future
              if (scheduledDateTime) {
                if (isNaN(scheduledDateTime.getTime())) {
                  newErrors.publishedAt = 'Invalid date and time format';
                } else {
                  const now = new Date();
                  // Add 1 minute buffer to account for processing time
                  const bufferTime = new Date(now.getTime() + 60000);
                  if (scheduledDateTime <= bufferTime) {
                    newErrors.publishedAt = 'Scheduled date and time must be at least 1 minute in the future';
                  }
                }
              }
            } catch (dateError) {
              newErrors.publishedAt = 'Invalid date and time format. Please select a valid date and time.';
            }
          }
        }
        // For publish action, publishedAt is NOT required (will use current time)
        // No validation needed for publish action
      }
    }

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

  // Handle button click to set action and submit
  const handleButtonClick = (action, e) => {
    e.preventDefault();
    
    // Additional safety check: prevent schedule submission without date
    if (action === 'schedule') {
      if (!formData.publishedAt) {
        setErrors(prev => ({
          ...prev,
          publishedAt: 'Please select a date and time for scheduling'
        }));
        // Scroll to error if needed
        setTimeout(() => {
          const errorElement = document.querySelector(`[data-field="publishedAt"]`) || 
                             document.querySelector('.errorText');
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }
      
      // Validate that the selected date is in the future
      try {
        let scheduledDateTime;
        if (formData.publishedAt && formData.publishedAt.includes('T')) {
          // Parse ISO format: yyyy-MM-ddTHH:mm
          const parts = formData.publishedAt.split('T');
          if (parts.length === 2) {
            const [datePart, timePart] = parts;
            const [hours, minutes] = timePart.split(':').map(Number);
            const [year, month, day] = datePart.split('-').map(Number);
            
            // Create Date object using components to avoid timezone interpretation issues
            scheduledDateTime = new Date(year, month - 1, day, hours, minutes || 0, 0);
          } else {
            setErrors(prev => ({
              ...prev,
              publishedAt: 'Invalid date and time format'
            }));
            return;
          }
        } else {
          setErrors(prev => ({
            ...prev,
            publishedAt: 'Please select a date and time for scheduling'
          }));
          return;
        }
        
        if (isNaN(scheduledDateTime.getTime())) {
          setErrors(prev => ({
            ...prev,
            publishedAt: 'Invalid date and time format'
          }));
          return;
        }
        
        const now = new Date();
        const bufferTime = new Date(now.getTime() + 60000); // 1 minute buffer
        if (scheduledDateTime <= bufferTime) {
          setErrors(prev => ({
            ...prev,
            publishedAt: 'Scheduled date and time must be at least 1 minute in the future'
          }));
          return;
        }
      } catch (dateError) {
        setErrors(prev => ({
          ...prev,
          publishedAt: 'Invalid date and time format. Please select a valid date and time.'
        }));
        return;
      }
    }
    
    // Store action in both state and ref (ref for synchronous access, state for UI updates)
    submitActionRef.current = action;
    setSubmitAction(action);
    
    // Trigger form submission - use setTimeout to ensure state is set
    setTimeout(() => {
      const form = e.target.closest('form');
      if (form) {
        form.requestSubmit();
      }
    }, 0);
  };

  // Helper function to normalize datetime format
  const normalizeDateTime = (dateTimeString) => {
    if (!dateTimeString) return null;
    
    // Remove timezone info if present at the end (Z, +HH:MM, -HH:MM)
    // Only remove if it's at the end, not dashes in the date part
    let cleanDateTime = dateTimeString.trim();
    // Remove Z at the end
    if (cleanDateTime.endsWith('Z')) {
      cleanDateTime = cleanDateTime.slice(0, -1);
    }
    // Remove timezone offset at the end (+HH:MM or -HH:MM)
    const timezoneMatch = cleanDateTime.match(/([+-]\d{2}:\d{2})$/);
    if (timezoneMatch) {
      cleanDateTime = cleanDateTime.slice(0, timezoneMatch.index);
    }
    cleanDateTime = cleanDateTime.trim();
    
    // Declare variables outside the if/else blocks to avoid const redeclaration issues
    let datePart, timePart, timeParts, hours, minutes, seconds, hoursNum, minutesNum, secondsNum;
    
    // Check if it's ISO format (with T) or MySQL format (with space)
    if (cleanDateTime.includes('T')) {
      // ISO format: yyyy-MM-ddTHH:mm or yyyy-MM-ddTHH:mm:ss
      [datePart, timePart] = cleanDateTime.split('T');
      
      // Validate date part
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        throw new Error(`Invalid date format: ${datePart}`);
      }
      
      // Normalize time part
      timeParts = timePart.split(':');
      if (timeParts.length < 2 || timeParts.length > 3) {
        throw new Error(`Invalid time format: ${timePart}`);
      }
      
      hours = timeParts[0].padStart(2, '0');
      minutes = timeParts[1].padStart(2, '0');
      seconds = timeParts.length === 3 ? timeParts[2].padStart(2, '0') : '00';
      
      // Validate time values
      hoursNum = parseInt(hours, 10);
      minutesNum = parseInt(minutes, 10);
      secondsNum = parseInt(seconds, 10);
      if (isNaN(hoursNum) || isNaN(minutesNum) || isNaN(secondsNum) ||
          hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59 || secondsNum < 0 || secondsNum > 59) {
        throw new Error(`Invalid time values: ${hours}:${minutes}:${seconds}`);
      }
      
      // Return ISO format: yyyy-MM-ddTHH:mm:ss (backend will convert to MySQL format)
      return `${datePart}T${hours}:${minutes}:${seconds}`;
    } else if (cleanDateTime.includes(' ')) {
      // MySQL format: yyyy-MM-dd HH:mm:ss or yyyy-MM-dd HH:mm
      [datePart, timePart] = cleanDateTime.split(' ');
      
      // Validate date part
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        throw new Error(`Invalid date format: ${datePart}`);
      }
      
      // Normalize time part
      timeParts = timePart.split(':');
      if (timeParts.length < 2 || timeParts.length > 3) {
        throw new Error(`Invalid time format: ${timePart}`);
      }
      
      hours = timeParts[0].padStart(2, '0');
      minutes = timeParts[1].padStart(2, '0');
      seconds = timeParts.length === 3 ? timeParts[2].padStart(2, '0') : '00';
      
      // Validate time values
      hoursNum = parseInt(hours, 10);
      minutesNum = parseInt(minutes, 10);
      secondsNum = parseInt(seconds, 10);
      if (isNaN(hoursNum) || isNaN(minutesNum) || isNaN(secondsNum) ||
          hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59 || secondsNum < 0 || secondsNum > 59) {
        throw new Error(`Invalid time values: ${hours}:${minutes}:${seconds}`);
      }
      
      // Convert MySQL format to ISO format
      return `${datePart}T${hours}:${minutes}:${seconds}`;
    } else {
      throw new Error(`Invalid datetime format: ${dateTimeString}. Expected format: yyyy-MM-ddTHH:mm or yyyy-MM-dd HH:mm`);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get action from ref first (synchronous), then fall back to state, then default
    // For edit mode: if published or archived, use 'save'; if draft/scheduled, require action like create mode
    const isPublishedInEditMode = isEditMode && readOnlyFields.status === 'published';
    const isArchivedInEditMode = isEditMode && readOnlyFields.status === 'archived';
    const isReadOnlyStatusInEditMode = isPublishedInEditMode || isArchivedInEditMode;
    const action = submitActionRef.current || submitAction || (isReadOnlyStatusInEditMode ? 'save' : (isEditMode ? null : 'publish'));
    
    // Validate that we have an action for create mode or draft/scheduled edit mode
    if ((!isEditMode || (isEditMode && !isReadOnlyStatusInEditMode)) && !action) {
      setErrors(prev => ({
        ...prev,
        _general: 'Please select an action (Save as Draft, Publish Now, or Schedule)'
      }));
      setIsValidating(false);
      return;
    }
    
    // Set validating state to show loading indicator
    setIsValidating(true);
    
    try {
      // Validate form first
      const isValid = await validateForm(action);
      if (!isValid) {
        setIsValidating(false);
        return;
      }
    
      // Convert date and time to datetime format for backend
      const submitData = { ...formData };
      
      // Include action for create mode or edit mode for drafts/scheduled
      if (!isEditMode || (isEditMode && !isReadOnlyStatusInEditMode)) {
        // Ensure action is always set - this is required!
        if (!action || (action !== 'draft' && action !== 'publish' && action !== 'schedule')) {
          throw new Error(`Invalid action: ${action}. Action must be 'draft', 'publish', or 'schedule'.`);
        }
        submitData.action = action;
        
        if (action === 'draft') {
          // For draft, set published_at to null
          submitData.publishedAt = null;
        } else if (action === 'publish') {
          // For publish now, always use current datetime
          // Format as ISO datetime string: yyyy-MM-ddTHH:mm:ss
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const seconds = String(now.getSeconds()).padStart(2, '0');
          submitData.publishedAt = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        } else if (action === 'schedule') {
          // For schedule, ensure we have a valid datetime
          if (!submitData.publishedAt) {
            throw new Error('Published date and time are required for scheduling');
          }
          
          // Normalize the datetime format
          try {
            submitData.publishedAt = normalizeDateTime(submitData.publishedAt);
            
            // Validate that scheduled date is in the future
            // Parse the datetime string to create Date object with components (avoiding timezone issues)
            if (submitData.publishedAt.includes('T')) {
              const parts = submitData.publishedAt.split('T');
              if (parts.length === 2) {
                const [datePart, timePart] = parts;
                const [hours, minutes, seconds = '00'] = timePart.split(':').map(Number);
                const [year, month, day] = datePart.split('-').map(Number);
                const scheduledDate = new Date(year, month - 1, day, hours, minutes, seconds || 0);
            const now = new Date();
            if (scheduledDate <= now) {
              throw new Error('Scheduled date and time must be in the future');
                }
              } else {
                throw new Error('Invalid date and time format for scheduling');
              }
            } else {
              throw new Error('Invalid date and time format for scheduling');
            }
          } catch (dateError) {
            throw new Error(dateError.message || 'Invalid date and time format for scheduling');
          }
        }
      } else {
        // Edit mode for published or archived news - action is 'save', no published_at changes, status remains unchanged
        submitData.action = 'save';
      }
      
      // Clean up - remove any unused fields
      
      // Keep submitAction and isValidating set during submission so buttons show correct loading state
      // Call onSubmit with the prepared data
      await onSubmit(submitData);
      
      // Reset states after successful submission
      setIsValidating(false);
      submitActionRef.current = null;
      setSubmitAction(null);
    } catch (error) {
      // Reset validating state on error
      setIsValidating(false);
      // Display error message to user
      const errorMessage = error.message || 'An error occurred. Please try again.';
      setErrors(prev => ({
        ...prev,
        publishedAt: errorMessage,
        _general: errorMessage
      }));
      // Reset ref and state on error
      submitActionRef.current = null;
      setSubmitAction(null);
      
      // Scroll to error if needed
      setTimeout(() => {
        const errorElement = document.querySelector(`[data-field="publishedAt"]`) || 
                           document.querySelector('.errorText') ||
                           document.querySelector('[data-field="_general"]');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

    return (
    <form onSubmit={handleSubmit} className={styles.form} onKeyDown={(e) => {
      // Prevent form submission on Enter key (user must click a button)
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    }}>
      {/* Header with Title and Action Buttons */}
      <div className={styles.formHeader}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            onClick={handleBackClick}
            className={styles.backLink}
          >
            Go Back
          </button>
          <h1>{headerTitle || (isEditMode ? 'Edit Post' : 'Create New Post')}</h1>
        </div>
        <div className={styles.headerActions}>
          {isEditMode && ((readOnlyFields.status === 'published' || initialData?.status === 'published') || 
                          (readOnlyFields.status === 'archived' || initialData?.status === 'archived')) ? (
            // Edit mode for published or archived news: Only Save Changes button (keeps current status)
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isSubmitting}
              onClick={(e) => handleButtonClick('save', e)}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            // Create mode: Draft button + Split button (Schedule/Publish with dropdown) - inline row
            <>
              <button
                type="button"
                onClick={(e) => handleButtonClick('draft', e)}
                className={styles.draftButton}
                disabled={isSubmitting || (isValidating && submitAction === 'draft')}
              >
                {(isSubmitting || (isValidating && submitAction === 'draft')) && submitAction === 'draft' ? 'Saving...' : 'Save as Draft'}
              </button>
              <div className={styles.splitButtonGroup} ref={publishDropdownRef}>
                <button
                  type="button"
                  onClick={(e) => handleButtonClick(publishActionType, e)}
                  className={styles.publishButton}
                  disabled={
                    isSubmitting || 
                    (isValidating && submitAction === publishActionType) ||
                    (publishActionType === 'schedule' && !formData.publishedAt) // Disable Schedule button if no date selected
                  }
                  title={publishActionType === 'schedule' && !formData.publishedAt ? 'Please select a date and time first' : ''}
                >
                  {(isSubmitting || (isValidating && submitAction === publishActionType)) && submitAction === publishActionType
                    ? (publishActionType === 'publish' ? 'Publishing...' : 'Scheduling...')
                    : (publishActionType === 'publish' ? 'Publish Now' : 'Schedule')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPublishDropdown(!showPublishDropdown)}
                  className={`${publishActionType === 'publish' ? styles.publishDropdownButton : styles.scheduleDropdownButton} ${showPublishDropdown ? styles.dropdownOpen : ''}`}
                  disabled={isSubmitting}
                  aria-label="Choose publish action"
                >
                  <FaCaretDown />
                </button>
                {showPublishDropdown && (
                  <div className={styles.publishDropdown}>
                    <button
                      type="button"
                      className={`${styles.dropdownOption} ${publishActionType === 'schedule' ? styles.dropdownOptionActive : ''}`}
                      onClick={() => {
                        setPublishActionType('schedule');
                        setShowPublishDropdown(false);
                      }}
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      className={`${styles.dropdownOption} ${publishActionType === 'publish' ? styles.dropdownOptionActive : ''}`}
                      onClick={() => {
                        setPublishActionType('publish');
                        // Clear scheduled date/time when switching to Publish Now
                        // (Publish Now doesn't need a date - it uses current time)
                        setFormData(prev => ({
                          ...prev,
                          publishedAt: null
                        }));
                        // Clear any errors related to publishedAt
                        setErrors(prev => ({
                          ...prev,
                          publishedAt: ''
                        }));
                        setShowPublishDropdown(false);
                      }}
                    >
                      Publish Now
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* General Error Display */}
      {errors._general && (
        <div className={styles.errorContainer} data-field="_general">
          <span className={styles.errorText}>{errors._general}</span>
        </div>
      )}

      <div className={styles.formLayout}>
        {/* Left Panel - Main Container */}
        <div className={styles.leftContainer}>
          <div className={styles.formContainer}>
            {/* Title */}
            <div className={styles.field}>
              <label className={styles.label}>
                Title
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
                Slug
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
                Content
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
                Excerpt
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
        </div>

        {/* Right Panel - Separate Containers */}
        <div className={styles.rightPanel}>
          {/* Schedule Publish Date Container - Show when Schedule is selected (create mode or edit mode for drafts/scheduled, but not for published/archived) */}
          {(!isEditMode || (isEditMode && readOnlyFields.status !== 'published' && readOnlyFields.status !== 'archived')) && publishActionType === 'schedule' && (
            <div className={styles.container}>
              <h3 className={styles.containerTitle}>
                Schedule publish date
              </h3>
              <div style={{ position: 'relative' }}>
                <DatePickerPopover
                  value={formData.publishedAt || null}
                  onChange={(value) => {
                    // Value always includes time when showTime=true (format: yyyy-MM-ddTHH:mm)
                    // Store the full datetime string in publishedAt
                    setFormData(prev => ({
                      ...prev,
                      publishedAt: value || null
                    }));
                    // Clear any errors when date is selected
                    if (value) {
                      setErrors(prev => ({
                        ...prev,
                        publishedAt: ''
                      }));
                    }
                  }}
                  placeholder={errors.publishedAt ? "Date and time required" : "Select publish date & time"}
                  showTime={true}
                  minDate={(() => {
                    // Set minDate to start of today to allow selecting today and future dates
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return today;
                  })()}
                />
                {errors.publishedAt && (
                  <span className={styles.errorText} data-field="publishedAt" style={{ display: 'block', marginTop: '8px' }}>
                    {errors.publishedAt}
                  </span>
                )}
                {!formData.publishedAt && !errors.publishedAt && (
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', marginBottom: 0 }}>
                    Please select a date and time to schedule this post
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Featured Image Container */}
          <div className={styles.container}>
            <h3 className={styles.containerTitle}>
              Set Featured Image
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

          {/* History/Activity Log - Show in edit mode only for published or archived news */}
          {isEditMode && readOnlyFields.status && (readOnlyFields.status === 'published' || readOnlyFields.status === 'archived') && (
            <div className={styles.container}>
              <h3 className={styles.containerTitle}>
                History
              </h3>
              <div className={styles.historyList}>
                {/* Published - Only show if status is 'published' or was published before being archived */}
                {readOnlyFields.originalPublishedAt && 
                 (readOnlyFields.status === 'published' || 
                  (readOnlyFields.status === 'archived' && readOnlyFields.originalPublishedAt)) && (
                  <div className={styles.historyItem}>
                    <div className={styles.historyDot}></div>
                    <div className={styles.historyContent}>
                      <div className={styles.historyLabel}>Published</div>
                      <div className={styles.historyDate}>{formatDateTime(readOnlyFields.originalPublishedAt)}</div>
                      <div className={styles.historyRelativeTime}>{getRelativeTime(readOnlyFields.originalPublishedAt)}</div>
                    </div>
                  </div>
                )}

                {/* Last Updated - Only show if content_updated_at exists (meaning there was an actual content edit) */}
                {(() => {
                  // content_updated_at only exists when actual content was edited (title, content, excerpt, featured_image)
                  // It does NOT update when status changes or published_at changes
                  // formatDateTime will handle parsing and validation
                  if (!readOnlyFields.updatedAt) {
                    return null;
                  }
                  
                  // Show content_updated_at if it exists (it only exists when content was actually edited)
                  // formatDateTime uses parseMySQLDateTime which handles local time parsing correctly
                  return (
                    <div className={styles.historyItem}>
                      <div className={styles.historyDot}></div>
                      <div className={styles.historyContent}>
                        <div className={styles.historyLabel}>Last Updated</div>
                        <div className={styles.historyDate}>{formatDateTime(readOnlyFields.updatedAt)}</div>
                        <div className={styles.historyRelativeTime}>{getRelativeTime(readOnlyFields.updatedAt)}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Show message if no history available */}
                {!readOnlyFields.originalPublishedAt && !readOnlyFields.updatedAt && (
                  <div className={styles.historyEmpty}>
                    No history available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Unsaved Changes Modal */}
      <UnsaveChangesModal
        isOpen={showUnsavedModal}
        onConfirm={handleUnsavedModalConfirm}
        onCancel={handleUnsavedModalCancel}
      />
    </form>
  );
};

export default CreatePostForm;
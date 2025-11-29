import { useState, useEffect, useCallback } from 'react';
import { PROGRAM_STATUS, DEFAULT_FORM_DATA, VALIDATION_RULES, ERROR_MESSAGES } from '@/app/admin/programs/constants/programConstants';
import DOMPurify from 'dompurify';

// Function to calculate status based on dates
const calculateStatus = (event_start_date, event_end_date, multiple_dates) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  // Handle multiple dates
  if (multiple_dates && Array.isArray(multiple_dates) && multiple_dates.length > 0) {
    const dates = multiple_dates.map(dateStr => new Date(dateStr));
    const sortedDates = dates.sort((a, b) => a - b);
    const earliestDate = sortedDates[0];
    const latestDate = sortedDates[sortedDates.length - 1];
    
    // If today is before the earliest date, it's upcoming
    if (today < earliestDate) {
      return PROGRAM_STATUS.UPCOMING;
    }
    // If today is after the latest date, it's completed
    if (today > latestDate) {
      return PROGRAM_STATUS.COMPLETED;
    }
    // If today is between or on any of the dates, it's active
    return PROGRAM_STATUS.ACTIVE;
  }

  // Handle single date or date range
  if (event_start_date && event_end_date) {
    const startDate = new Date(event_start_date);
    const endDate = new Date(event_end_date);
    
    // If today is before the start date, it's upcoming
    if (today < startDate) {
      return PROGRAM_STATUS.UPCOMING;
    }
    // If today is after the end date, it's completed
    if (today > endDate) {
      return PROGRAM_STATUS.COMPLETED;
    }
    // If today is between or on the dates, it's active
    return PROGRAM_STATUS.ACTIVE;
  }

  // Default to upcoming if no dates are set
  return PROGRAM_STATUS.UPCOMING;
};

// Validation functions
const validateField = (fieldName, value, rules) => {
  const rule = rules[fieldName];
  if (!rule) return null;

  if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return ERROR_MESSAGES[fieldName]?.required || `${fieldName} is required`;
  }

  if (value && rule.minLength && value.length < rule.minLength) {
    return ERROR_MESSAGES[fieldName]?.minLength || `${fieldName} is too short`;
  }

  if (value && rule.maxLength && value.length > rule.maxLength) {
    return ERROR_MESSAGES[fieldName]?.maxLength || `${fieldName} is too long`;
  }

  return null;
};

const validateImage = (file, rules) => {
  if (!file) return null;

  // Handle base64 data URLs
  if (typeof file === 'string' && file.startsWith('data:image/')) {
    // Extract MIME type from base64 data URL
    const mimeMatch = file.match(/data:image\/(\w+);/);
    if (!mimeMatch) {
      return ERROR_MESSAGES.image.invalidType;
    }
    
    const mimeType = `image/${mimeMatch[1]}`;
    if (!rules.allowedTypes.includes(mimeType)) {
      return ERROR_MESSAGES.image.invalidType;
    }
    
    // Estimate size from base64 string (base64 is ~4/3 the size of binary)
    const base64Size = file.length - file.indexOf(',') - 1;
    const estimatedSize = (base64Size * 3) / 4;
    
    if (estimatedSize > rules.maxSize) {
      return ERROR_MESSAGES.image.maxSize;
    }
    
    return null;
  }

  // Handle File objects (fallback for existing code)
  if (file.size > rules.maxSize) {
    return ERROR_MESSAGES.image.maxSize;
  }

  if (!rules.allowedTypes.includes(file.type)) {
    return ERROR_MESSAGES.image.invalidType;
  }

  return null;
};

export const useProgramForm = (mode = 'create', program = null) => {
  const isEditMode = mode === 'edit';
  
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when program changes (edit mode)
  useEffect(() => {
    if (isEditMode && program) {
      setFormData({
        title: program.title || '',
        description: program.description || '',
        category: program.category || '',
        status: program.status || PROGRAM_STATUS.UPCOMING,
        event_start_date: program.event_start_date || '',
        event_end_date: program.event_end_date || '',
        multiple_dates: program.multiple_dates || [],
        image: null, // Will be handled separately for existing images
        additionalImages: [], // Will be handled separately for existing images
        collaborators: Array.isArray(program.collaborators) ? program.collaborators : [],
        accepts_volunteers: program.accepts_volunteers !== undefined ? program.accepts_volunteers : true,
        edited_by_name: '', // Always reset on each edit - new person responsible for each edit
        edited_by_role: '' // Always reset on each edit - new person responsible for each edit
      });
    }
  }, [isEditMode, program]);

  // Update form data and validate
  const updateFormData = useCallback((updates) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      
      // Calculate status based on dates
      if (updates.event_start_date !== undefined || updates.event_end_date !== undefined || updates.multiple_dates !== undefined) {
        newData.status = calculateStatus(
          newData.event_start_date,
          newData.event_end_date,
          newData.multiple_dates
        );
      }
      
      return newData;
    });
    
    setHasChanges(true);
  }, []);

  // Helper function to check if event date is in the past
  const isEventDateInPast = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check multiple dates
    if (formData.multiple_dates && Array.isArray(formData.multiple_dates) && formData.multiple_dates.length > 0) {
      const dates = formData.multiple_dates.map(dateStr => new Date(dateStr));
      const latestDate = dates.sort((a, b) => b - a)[0];
      latestDate.setHours(0, 0, 0, 0);
      return latestDate < today;
    }
    
    // Check date range or single date
    if (formData.event_end_date) {
      const endDate = new Date(formData.event_end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate < today;
    }
    
    if (formData.event_start_date) {
      const startDate = new Date(formData.event_start_date);
      startDate.setHours(0, 0, 0, 0);
      return startDate < today;
    }
    
    return false;
  }, [formData.event_start_date, formData.event_end_date, formData.multiple_dates]);

  // Validate form
  const validateForm = useCallback((imagePreview = null, postActReportFile = null) => {
    const newErrors = {};
    
    // Validate title and category
    const textFields = ['title', 'category'];
    textFields.forEach(field => {
      const error = validateField(field, formData[field], VALIDATION_RULES);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    // Validate description - check for actual text content (not just HTML tags)
    if (!formData.description || !formData.description.trim()) {
      newErrors.description = ERROR_MESSAGES.description?.required || 'Description is required';
    } else if (typeof document !== 'undefined') {
      // Check if there's actual text content (strip HTML tags)
      const textContent = document.createElement('div');
      textContent.innerHTML = DOMPurify.sanitize(formData.description);
      const plainText = (textContent.textContent || textContent.innerText || '').trim();
      if (!plainText) {
        newErrors.description = ERROR_MESSAGES.description?.required || 'Description is required';
      }
    }

    // Validate officer fields - required for both create and edit mode
    if (!isEditMode) {
      // Validate officer name (create mode)
      const nameError = validateField('submitted_by_name', formData.submitted_by_name, VALIDATION_RULES);
      if (nameError) {
        newErrors.submitted_by_name = nameError;
      }

      // Validate officer role - handle custom role for "Others" (create mode)
      const role = formData.submitted_by_role || '';
      if (!role || role.trim() === '') {
        newErrors.submitted_by_role = ERROR_MESSAGES.submitted_by_role.required;
      } else if (role === 'Others') {
        // If "Others" is selected, the custom role input should have updated formData.submitted_by_role
        // If it's still "Others", it means no custom role was provided
        newErrors.submitted_by_role = 'Please specify the custom role/position';
      } else {
        // Validate role length for non-"Others" roles
        const roleError = validateField('submitted_by_role', role, VALIDATION_RULES);
        if (roleError) {
          newErrors.submitted_by_role = roleError;
        }
      }
    } else {
      // Validate edited by fields (edit mode)
      const editedNameError = validateField('submitted_by_name', formData.edited_by_name, VALIDATION_RULES);
      if (editedNameError) {
        newErrors.edited_by_name = editedNameError;
      }

      // Validate edited by role - handle custom role for "Others" (edit mode)
      const editedRole = formData.edited_by_role || '';
      if (!editedRole || editedRole.trim() === '') {
        newErrors.edited_by_role = ERROR_MESSAGES.submitted_by_role.required;
      } else if (editedRole === 'Others') {
        // If "Others" is selected, the custom role input should have updated formData.edited_by_role
        // If it's still "Others", it means no custom role was provided
        newErrors.edited_by_role = 'Please specify the custom role/position';
      } else {
        // Validate role length for non-"Others" roles
        const roleError = validateField('submitted_by_role', editedRole, VALIDATION_RULES);
        if (roleError) {
          newErrors.edited_by_role = roleError;
        }
      }
    }

    // Validate main image - required for both create and edit mode
    if (!isEditMode) {
      // Create mode: image is required
      if (!formData.image) {
        newErrors.image = ERROR_MESSAGES.image.required;
      } else {
        const imageError = validateImage(formData.image, VALIDATION_RULES.image);
        if (imageError) {
          newErrors.image = imageError;
        }
      }
    } else {
      // Edit mode: image is required (either existing image preview or new image)
      if (!imagePreview && !formData.image) {
        newErrors.image = ERROR_MESSAGES.image.required;
      } else if (formData.image) {
        // Validate new image if provided
        const imageError = validateImage(formData.image, VALIDATION_RULES.image);
        if (imageError) {
          newErrors.image = imageError;
        }
      }
    }

    // Validate additional images (optional)
    if (formData.additionalImages && formData.additionalImages.length > VALIDATION_RULES.additionalImages.maxCount) {
      newErrors.additionalImages = ERROR_MESSAGES.additionalImages.maxCount;
    } else if (formData.additionalImages && formData.additionalImages.length > 0) {
      formData.additionalImages.forEach((file, index) => {
        const imageError = validateImage(file, VALIDATION_RULES.additionalImages);
        if (imageError) {
          newErrors[`additionalImage_${index}`] = imageError;
        }
      });
    }

    // Validate post-act report if event date is in the past (create mode only)
    if (!isEditMode && isEventDateInPast()) {
      if (!postActReportFile) {
        newErrors.postActReport = ERROR_MESSAGES.postActReport.required;
      } else {
        // Validate file size
        if (postActReportFile.size > VALIDATION_RULES.postActReport.maxSize) {
          newErrors.postActReport = ERROR_MESSAGES.postActReport.maxSize;
        }
        // Validate file type
        if (!VALIDATION_RULES.postActReport.allowedTypes.includes(postActReportFile.type)) {
          newErrors.postActReport = ERROR_MESSAGES.postActReport.invalidType;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEditMode, isEventDateInPast]);

  // Clear specific error
  const clearError = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Reset form to default state
  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    setHasChanges(false);
  }, []);

  return {
    formData,
    errors,
    hasChanges,
    isEditMode,
    updateFormData,
    validateForm,
    clearError,
    clearAllErrors,
    setFormData,
    setHasChanges,
    resetForm
  };
};


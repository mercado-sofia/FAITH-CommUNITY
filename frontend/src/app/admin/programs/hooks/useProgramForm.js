import { useState, useEffect, useCallback } from 'react';
import { PROGRAM_STATUS, DEFAULT_FORM_DATA, VALIDATION_RULES, ERROR_MESSAGES } from '../constants/programConstants';

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
        collaborators: Array.isArray(program.collaborators) ? program.collaborators : []
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

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    // Validate text fields
    Object.keys(VALIDATION_RULES).forEach(field => {
      if (field !== 'image' && field !== 'additionalImages') {
        const error = validateField(field, formData[field], VALIDATION_RULES);
        if (error) {
          newErrors[field] = error;
        }
      }
    });

    // Validate main image
    if (formData.image) {
      const imageError = validateImage(formData.image, VALIDATION_RULES.image);
      if (imageError) {
        newErrors.image = imageError;
      }
    } else if (!isEditMode) {
      // Main image is required for new programs
      newErrors.image = ERROR_MESSAGES.image.required;
    }

    // Validate additional images
    if (formData.additionalImages.length > VALIDATION_RULES.additionalImages.maxCount) {
      newErrors.additionalImages = ERROR_MESSAGES.additionalImages.maxCount;
    } else {
      formData.additionalImages.forEach((file, index) => {
        const imageError = validateImage(file, VALIDATION_RULES.additionalImages);
        if (imageError) {
          newErrors[`additionalImage_${index}`] = imageError;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEditMode]);

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
    setHasChanges
  };
};

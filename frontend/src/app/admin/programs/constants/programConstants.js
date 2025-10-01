// Program status constants
export const PROGRAM_STATUS = {
  ACTIVE: 'Active',
  UPCOMING: 'Upcoming',
  COMPLETED: 'Completed'
};

// Default form values
export const DEFAULT_FORM_DATA = {
  title: '',
  description: '',
  category: '',
  status: PROGRAM_STATUS.UPCOMING,
  image: null,
  additionalImages: [],
  event_start_date: null,
  event_end_date: null,
  multiple_dates: null,
  collaborators: []
};

// Form validation rules
export const VALIDATION_RULES = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 100
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 1000
  },
  category: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  event_start_date: {
    required: false
  },
  image: {
    required: true,
    maxSize: 20 * 1024 * 1024, // 20MB in bytes
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  },
  additionalImages: {
    maxSize: 20 * 1024 * 1024, // 20MB in bytes
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxCount: 10
  }
};

// Error messages
export const ERROR_MESSAGES = {
  title: {
    required: 'Title is required',
    minLength: 'Title must be at least 3 characters long',
    maxLength: 'Title must be less than 100 characters'
  },
  description: {
    required: 'Description is required',
    minLength: 'Description must be at least 10 characters long',
    maxLength: 'Description must be less than 1000 characters'
  },
  category: {
    required: 'Category is required',
    minLength: 'Category must be at least 2 characters long',
    maxLength: 'Category must be less than 50 characters'
  },
  event_start_date: {
    required: 'Event date is required'
  },
  image: {
    required: 'Highlight image is required',
    maxSize: 'Image size must be less than 20MB',
    invalidType: 'Only JPG, JPEG, PNG and WEBP images are allowed'
  },
  additionalImages: {
    maxSize: 'Image size must be less than 20MB',
    invalidType: 'Only JPG, JPEG, PNG and WEBP images are allowed',
    maxCount: 'Maximum 10 additional images allowed'
  }
};


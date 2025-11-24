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
  collaborators: [],
  accepts_volunteers: false, // Default to closed volunteers on create
  submitted_by_name: '',
  submitted_by_role: ''
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
  submitted_by_name: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  submitted_by_role: {
    required: true,
    minLength: 2,
    maxLength: 100
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
  },
  postActReport: {
    required: false, // Required only if event date is in the past
    maxSize: 50 * 1024 * 1024, // 50MB in bytes
    allowedTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
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
  submitted_by_name: {
    required: 'Officer name is required',
    minLength: 'Officer name must be at least 2 characters long',
    maxLength: 'Officer name must be less than 100 characters'
  },
  submitted_by_role: {
    required: 'Officer role/position is required',
    minLength: 'Role/position must be at least 2 characters long',
    maxLength: 'Role/position must be less than 100 characters'
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
  },
  postActReport: {
    required: 'Post Act Report is required for completed programs',
    maxSize: 'File size must be less than 50MB',
    invalidType: 'Only PDF, JPG, PNG, WEBP, HEIC, DOC, and DOCX files are allowed'
  }
};


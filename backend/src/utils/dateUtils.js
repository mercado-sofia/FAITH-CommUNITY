/**
 * Centralized date utilities for consistent date handling across the backend
 * Following the existing utility pattern in the project
 */

/**
 * Calculate age from birth date
 * @param {string} birthDate - Birth date string in YYYY-MM-DD format
 * @returns {number|null} Age in years or null if invalid
 */
export const calculateAge = (birthDate) => {
  try {
    if (!birthDate) return null;
    
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
      return null;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Error in calculateAge:', error, { birthDate });
    return null;
  }
};

/**
 * Validate birth date format and range
 * @param {string} dateString - Date string to validate
 * @returns {Object} Validation result with isValid and error message
 */
export const validateBirthDate = (dateString) => {
  try {
    if (!dateString || typeof dateString !== 'string') {
      return { isValid: false, error: 'Birth date is required' };
    }
    
    // Check if it's already in ISO format (YYYY-MM-DD)
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);
      
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
        return { isValid: true, error: null };
      } else {
        return { isValid: false, error: 'Invalid birth date' };
      }
    }
    
    // Handle legacy MM/DD/YYYY format for backward compatibility
    const dateParts = dateString.split('/');
    if (dateParts.length === 3) {
      const [month, day, year] = dateParts;
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);
      const yearNum = parseInt(year, 10);
      
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
        return { isValid: true, error: null };
      } else {
        return { isValid: false, error: 'Invalid birth date' };
      }
    }
    
    return { isValid: false, error: 'Invalid birth date format' };
  } catch (error) {
    console.error('Error in validateBirthDate:', error, { dateString });
    return { isValid: false, error: 'Invalid birth date format' };
  }
};

/**
 * Format birth date for database storage (YYYY-MM-DD)
 * @param {string} dateString - Date string in any valid format
 * @returns {string|null} Formatted date string or null if invalid
 */
export const formatBirthDateForDB = (dateString) => {
  try {
    if (!dateString) return null;
    
    // Check if it's already in ISO format (YYYY-MM-DD)
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const validation = validateBirthDate(dateString);
      return validation.isValid ? dateString : null;
    }
    
    // Handle legacy MM/DD/YYYY format for backward compatibility
    const dateParts = dateString.split('/');
    if (dateParts.length === 3) {
      const [month, day, year] = dateParts;
      const validation = validateBirthDate(dateString);
      
      if (validation.isValid) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in formatBirthDateForDB:', error, { dateString });
    return null;
  }
};

/**
 * Format birth date for display (long format) - Alias for consistency with frontend
 * @param {string} dateString - Date string in any valid format
 * @returns {string} Formatted date string or 'Not provided'
 */
export const formatBirthDate = (dateString) => {
  try {
    if (!dateString) return 'Not provided';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error in formatBirthDate:', error, { dateString });
    return 'Invalid date';
  }
};

/**
 * Format date for API response
 * @param {string} dateString - Date string in any valid format
 * @returns {string} Formatted date string or null
 */
export const formatDateForResponse = (dateString) => {
  try {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toISOString();
  } catch (error) {
    console.error('Error in formatDateForResponse:', error, { dateString });
    return null;
  }
};

/**
 * Check if a date is in the past
 * @param {string} dateString - Date string to check
 * @returns {boolean} True if date is in the past
 */
export const isDateInPast = (dateString) => {
  try {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    date.setHours(0, 0, 0, 0); // Reset time to start of day
    
    return date < today;
  } catch (error) {
    console.error('Error in isDateInPast:', error, { dateString });
    return false;
  }
};

/**
 * Check if a date is in the future
 * @param {string} dateString - Date string to check
 * @returns {boolean} True if date is in the future
 */
export const isDateInFuture = (dateString) => {
  try {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    date.setHours(0, 0, 0, 0); // Reset time to start of day
    
    return date > today;
  } catch (error) {
    console.error('Error in isDateInFuture:', error, { dateString });
    return false;
  }
};

/**
 * Get current date in ISO format (YYYY-MM-DD)
 * @returns {string} Current date in ISO format
 */
export const getCurrentDateISO = () => {
  try {
    const today = new Date();
    return today.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error in getCurrentDateISO:', error);
    return '';
  }
};

/**
 * Get date X days from now
 * @param {number} days - Number of days to add (negative for past dates)
 * @returns {string} Date in ISO format (YYYY-MM-DD)
 */
export const getDateFromNow = (days) => {
  try {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error in getDateFromNow:', error, { days });
    return '';
  }
};

/**
 * Validate date range
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {Object} Validation result with isValid and error message
 */
export const validateDateRange = (startDate, endDate) => {
  try {
    if (!startDate || !endDate) {
      return { isValid: false, error: 'Both start and end dates are required' };
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { isValid: false, error: 'Invalid date format' };
    }
    
    if (start > end) {
      return { isValid: false, error: 'Start date must be before end date' };
    }
    
    return { isValid: true, error: null };
  } catch (error) {
    console.error('Error in validateDateRange:', error, { startDate, endDate });
    return { isValid: false, error: 'Invalid date range' };
  }
};

/**
 * Format timestamp for database
 * @param {Date|string} date - Date object or string
 * @returns {string} MySQL formatted timestamp
 */
export const formatTimestampForDB = (date) => {
  try {
    if (!date) return null;
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return null;
    }
    
    return dateObj.toISOString().slice(0, 19).replace('T', ' ');
  } catch (error) {
    console.error('Error in formatTimestampForDB:', error, { date });
    return null;
  }
};

/**
 * Check if a date is today
 * @param {string} dateString - Date string to check
 * @returns {boolean} True if date is today
 */
export const isDateToday = (dateString) => {
  try {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    
    return date.toDateString() === today.toDateString();
  } catch (error) {
    console.error('Error in isDateToday:', error, { dateString });
    return false;
  }
};

/**
 * Check if a date is tomorrow
 * @param {string} dateString - Date string to check
 * @returns {boolean} True if date is tomorrow
 */
export const isDateTomorrow = (dateString) => {
  try {
    if (!dateString) return false;
    const date = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return date.toDateString() === tomorrow.toDateString();
  } catch (error) {
    console.error('Error in isDateTomorrow:', error, { dateString });
    return false;
  }
};

/**
 * Check if a date is yesterday
 * @param {string} dateString - Date string to check
 * @returns {boolean} True if date is yesterday
 */
export const isDateYesterday = (dateString) => {
  try {
    if (!dateString) return false;
    const date = new Date(dateString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return date.toDateString() === yesterday.toDateString();
  } catch (error) {
    console.error('Error in isDateYesterday:', error, { dateString });
    return false;
  }
};

/**
 * Get relative time string (e.g., "2 days ago", "in 3 hours")
 * @param {string} dateString - Date string to format
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateString) => {
  try {
    if (!dateString) return 'Not specified';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months === 1 ? '' : 's'} ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} year${years === 1 ? '' : 's'} ago`;
    }
  } catch (error) {
    console.error('Error in getRelativeTime:', error, { dateString });
    return 'Invalid date';
  }
};

/**
 * Format date with time for display
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (dateString) => {
  try {
    if (!dateString) return 'Not specified';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error in formatDateTime:', error, { dateString });
    return 'Invalid date';
  }
};

/**
 * Format program dates with support for multiple dates arrays and various date formats
 * Handles three types of program dates:
 * 1. Single date: event_start_date only
 * 2. Date range: event_start_date + event_end_date
 * 3. Multiple dates: stored in program_event_dates table or multiple_dates array
 * @param {Object} program - Program object with various date properties
 * @returns {string} Formatted program dates
 */
export const formatProgramDates = (program) => {
  try {
    if (!program) return 'Not specified';
    
    // 1. Handle multiple dates array (from frontend admin creation flow)
    if (program.multiple_dates && Array.isArray(program.multiple_dates) && program.multiple_dates.length > 0) {
      if (program.multiple_dates.length === 1) {
        return new Date(program.multiple_dates[0]).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } else if (program.multiple_dates.length === 2) {
        const date1 = new Date(program.multiple_dates[0]).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        const date2 = new Date(program.multiple_dates[1]).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        return `${date1} & ${date2}`;
      } else {
        const firstDate = new Date(program.multiple_dates[0]).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        return `${firstDate} +${program.multiple_dates.length - 1} more dates`;
      }
    }
    
    // 2. Handle date range (event_start_date + event_end_date)
    if (program.event_start_date && program.event_end_date) {
      const startDate = new Date(program.event_start_date);
      const endDate = new Date(program.event_end_date);
      
      // Check if dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 'Invalid date range';
      }
      
      // If same day, show single date
      if (startDate.getTime() === endDate.getTime()) {
        return startDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } else {
        const startFormatted = startDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        const endFormatted = endDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        return `${startFormatted} - ${endFormatted}`;
      }
    }
    
    // 3. Handle single date (event_start_date only)
    if (program.event_start_date) {
      return new Date(program.event_start_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    // 4. Handle legacy event_date field
    if (program.event_date) {
      return new Date(program.event_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    // 5. Handle legacy start/end date format (for backward compatibility)
    if (program.startDate && program.endDate) {
      return formatProgramDate(program.startDate, program.endDate);
    }
    
    // 6. Handle single start date (legacy)
    if (program.startDate) {
      return new Date(program.startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    return 'Not specified';
  } catch (error) {
    console.error('Error in formatProgramDates:', error, { program });
    return 'Invalid date';
  }
};

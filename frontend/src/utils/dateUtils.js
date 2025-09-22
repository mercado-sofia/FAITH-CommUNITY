import logger from './logger.js';

/**
 * Centralized date utilities for consistent date handling across the application
 * Following the existing utility pattern in the project
 */

/**
 * Format birth date for display (long format)
 * @param {string} dateString - Date string in any valid format
 * @returns {string} Formatted date string or 'Not provided'
 */
export const formatBirthDate = (dateString) => {
  try {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      logger.warn('Invalid date string provided to formatBirthDate', { dateString });
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    logger.error('Error in formatBirthDate', error, { dateString });
    return 'Invalid date';
  }
};

/**
 * Format date for HTML5 date input (YYYY-MM-DD)
 * Uses local timezone to avoid date shifting issues
 * @param {string} dateString - Date string in any valid format
 * @returns {string} ISO date string (YYYY-MM-DD) or empty string
 */
export const formatDateForInput = (dateString) => {
  try {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      logger.warn('Invalid date string provided to formatDateForInput', { dateString });
      return '';
    }
    
    // Use local timezone to avoid date shifting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    logger.error('Error in formatDateForInput', error, { dateString });
    return '';
  }
};

/**
 * Format date for short display (e.g., "Sep 18, 2004")
 * @param {string} dateString - Date string in any valid format
 * @returns {string} Formatted date string or 'Not specified'
 */
export const formatDateShort = (dateString) => {
  try {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      logger.warn('Invalid date string provided to formatDateShort', { dateString });
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    logger.error('Error in formatDateShort', error, { dateString });
    return 'Invalid date';
  }
};

/**
 * Format date for long display (e.g., "September 18, 2004")
 * @param {string} dateString - Date string in any valid format
 * @returns {string} Formatted date string or 'Not specified'
 */
export const formatDateLong = (dateString) => {
  try {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      logger.warn('Invalid date string provided to formatDateLong', { dateString });
      return 'Invalid date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    logger.error('Error in formatDateLong', error, { dateString });
    return 'Invalid date';
  }
};

/**
 * Format date range for display
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string (optional)
 * @returns {string} Formatted date range or single date
 */
export const formatDateRange = (startDate, endDate) => {
  try {
    if (!startDate) return 'Not specified';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (isNaN(start.getTime())) {
      logger.warn('Invalid start date provided to formatDateRange', { startDate });
      return 'Invalid date';
    }
    
    // If no end date or same day - Single day format
    if (!end || start.toDateString() === end.toDateString()) {
      return formatDateShort(startDate);
    }
    
    // Check if dates are consecutive (within 1 day difference)
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff <= 1) {
      // Consecutive days - Range date format (continuous)
      return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
    } else {
      // Multiple separate dates - use "and" for two dates
      return `${formatDateShort(startDate)} and ${formatDateShort(endDate)}`;
    }
  } catch (error) {
    logger.error('Error in formatDateRange', error, { startDate, endDate });
    return 'Invalid date';
  }
};

/**
 * Format program date range (specialized for program dates)
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string (optional)
 * @returns {string} Formatted program date range
 */
export const formatProgramDate = (startDate, endDate) => {
  try {
    if (!startDate) return null;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (isNaN(start.getTime())) {
      logger.warn('Invalid start date provided to formatProgramDate', { startDate });
      return null;
    }
    
    // If no end date or same day - Single day format
    if (!end || start.toDateString() === end.toDateString()) {
      return formatDateShort(startDate);
    }
    
    // Check if dates are consecutive (within 1 day difference)
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff <= 1) {
      // Consecutive days - Range date format (continuous)
      return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
    } else {
      // Multiple separate dates - use "and" for two dates
      return `${formatDateShort(startDate)} and ${formatDateShort(endDate)}`;
    }
  } catch (error) {
    logger.error('Error in formatProgramDate', error, { startDate, endDate });
    return null;
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
        return formatDateShort(program.multiple_dates[0]);
      } else if (program.multiple_dates.length === 2) {
        return `${formatDateShort(program.multiple_dates[0])} and ${formatDateShort(program.multiple_dates[1])}`;
      } else {
        // For 3+ dates: use commas and "and" before the last date
        const formattedDates = program.multiple_dates.map(date => formatDateShort(date));
        const lastDate = formattedDates.pop();
        return `${formattedDates.join(', ')}, and ${lastDate}`;
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
        return formatDateShort(program.event_start_date);
      } else {
        return `${formatDateShort(program.event_start_date)} - ${formatDateShort(program.event_end_date)}`;
      }
    }
    
    // 3. Handle single date (event_start_date only)
    if (program.event_start_date) {
      return formatDateShort(program.event_start_date);
    }
    
    // 4. Handle legacy event_date field
    if (program.event_date) {
      return formatDateShort(program.event_date);
    }
    
    // 5. Handle legacy start/end date format (for backward compatibility)
    if (program.startDate && program.endDate) {
      return formatProgramDate(program.startDate, program.endDate);
    }
    
    // 6. Handle single start date (legacy)
    if (program.startDate) {
      return formatDateShort(program.startDate);
    }
    
    return 'Not specified';
  } catch (error) {
    logger.error('Error in formatProgramDates', error, { program });
    return 'Invalid date';
  }
};

/**
 * Validate if a date string is valid
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date
 */
export const isValidDate = (dateString) => {
  try {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (error) {
    logger.error('Error in isValidDate', error, { dateString });
    return false;
  }
};

/**
 * Check if a date is within a specified range
 * @param {string} date - Date to check
 * @param {string} minDate - Minimum date (optional)
 * @param {string} maxDate - Maximum date (optional)
 * @returns {boolean} True if date is within range
 */
export const isDateInRange = (date, minDate, maxDate) => {
  try {
    const checkDate = new Date(date);
    if (isNaN(checkDate.getTime())) return false;
    
    if (minDate) {
      const min = new Date(minDate);
      if (isNaN(min.getTime()) || checkDate < min) return false;
    }
    
    if (maxDate) {
      const max = new Date(maxDate);
      if (isNaN(max.getTime()) || checkDate > max) return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error in isDateInRange', error, { date, minDate, maxDate });
    return false;
  }
};

/**
 * Calculate age from birth date
 * @param {string} birthDate - Birth date string
 * @returns {number|null} Age in years or null if invalid
 */
export const calculateAge = (birthDate) => {
  try {
    if (!birthDate) return null;
    
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) {
      logger.warn('Invalid birth date provided to calculateAge', { birthDate });
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
    logger.error('Error in calculateAge', error, { birthDate });
    return null;
  }
};

/**
 * Format date for API requests (ISO format)
 * Uses local timezone to avoid date shifting issues
 * @param {string} dateString - Date string in any valid format
 * @returns {string} ISO date string (YYYY-MM-DD) or empty string
 */
export const formatDateForAPI = (dateString) => {
  try {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      logger.warn('Invalid date string provided to formatDateForAPI', { dateString });
      return '';
    }
    
    // Use local timezone to avoid date shifting issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    logger.error('Error in formatDateForAPI', error, { dateString });
    return '';
  }
};

/**
 * Get current date in ISO format (YYYY-MM-DD)
 * Uses local timezone to avoid date shifting issues
 * @returns {string} Current date in ISO format
 */
export const getCurrentDateISO = () => {
  try {
    const today = new Date();
    // Use local timezone to avoid date shifting issues
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    logger.error('Error in getCurrentDateISO', error);
    return '';
  }
};

/**
 * Get date X days from now
 * Uses local timezone to avoid date shifting issues
 * @param {number} days - Number of days to add (negative for past dates)
 * @returns {string} Date in ISO format (YYYY-MM-DD)
 */
export const getDateFromNow = (days) => {
  try {
    const date = new Date();
    date.setDate(date.getDate() + days);
    // Use local timezone to avoid date shifting issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    logger.error('Error in getDateFromNow', error, { days });
    return '';
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
    logger.error('Error in isDateToday', error, { dateString });
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
    logger.error('Error in isDateTomorrow', error, { dateString });
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
    logger.error('Error in isDateYesterday', error, { dateString });
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
    logger.error('Error in getRelativeTime', error, { dateString });
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
      logger.warn('Invalid date string provided to formatDateTime', { dateString });
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
    logger.error('Error in formatDateTime', error, { dateString });
    return 'Invalid date';
  }
};

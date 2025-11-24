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
    
    // Check if this is an ISO format with timezone (TIMESTAMP field from backend)
    const hasTimezone = dateString.trim().endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString.trim());
    
    let date;
    if (hasTimezone) {
      // TIMESTAMP field (timezone-aware) - parse as UTC and convert to local time
      date = new Date(dateString);
      if (isNaN(date.getTime())) {
        logger.warn('Invalid ISO date string with timezone in formatDateShort', { dateString });
        return 'Invalid date';
      }
    } else {
      // DATETIME field (timezone-naive) - parse as local time
      date = parseMySQLDateTime(dateString);
      if (!date || isNaN(date.getTime())) {
        logger.warn('Invalid date string provided to formatDateShort', { dateString });
        return 'Invalid date';
      }
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
    
    // Check if this is an ISO format with timezone (TIMESTAMP field from backend)
    const hasTimezone = dateString.trim().endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateString.trim());
    
    let date;
    if (hasTimezone) {
      // TIMESTAMP field (timezone-aware) - parse as UTC and convert to local time
      date = new Date(dateString);
      if (isNaN(date.getTime())) {
        logger.warn('Invalid ISO date string with timezone in formatDateLong', { dateString });
        return 'Invalid date';
      }
    } else {
      // DATETIME field (timezone-naive) - parse as local time
      date = parseMySQLDateTime(dateString);
      if (!date || isNaN(date.getTime())) {
        logger.warn('Invalid date string provided to formatDateLong', { dateString });
        return 'Invalid date';
      }
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
/**
 * Format program dates for program cards with one-line truncation
 * Limits display to prevent wrapping to multiple lines
 * @param {Object} program - Program object with various date properties
 * @returns {string} Formatted program dates (truncated if too long)
 */
export const formatProgramDatesForCard = (program) => {
  try {
    if (!program) return 'Not specified';
    
    // 1. Handle multiple dates array (from frontend admin creation flow)
    if (program.multiple_dates && Array.isArray(program.multiple_dates) && program.multiple_dates.length > 0) {
      if (program.multiple_dates.length === 1) {
        return formatDateShort(program.multiple_dates[0]);
      } else if (program.multiple_dates.length === 2) {
        return `${formatDateShort(program.multiple_dates[0])} and ${formatDateShort(program.multiple_dates[1])}`;
      } else {
        // For 3+ dates: limit to first 2 dates and add ellipsis
        const firstDate = formatDateShort(program.multiple_dates[0]);
        const secondDate = formatDateShort(program.multiple_dates[1]);
        return `${firstDate}, ${secondDate}...`;
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
        // Different days - show range
        return `${formatDateShort(program.event_start_date)} - ${formatDateShort(program.event_end_date)}`;
      }
    }
    
    // 3. Handle single date (event_start_date only)
    if (program.event_start_date) {
      return formatDateShort(program.event_start_date);
    }
    
    // 4. Handle legacy startDate property
    if (program.startDate) {
      return formatDateShort(program.startDate);
    }
    
    return 'Coming Soon';
  } catch (error) {
    logger.error('Error in formatProgramDatesForCard', error, { program });
    return 'Invalid date';
  }
};

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
    
    return 'Coming Soon';
  } catch (error) {
    logger.error('Error in formatProgramDates', error, { program });
    return 'Invalid date';
  }
};

/**
 * Format program dates for application details modal with support for different property naming conventions
 * Handles three types of program dates:
 * 1. Single date: programStartDate only or same start/end dates
 * 2. Date range: programStartDate + programEndDate (different dates)
 * 3. Multiple dates: multiple_dates array
 * @param {Object} application - Application object with program date properties
 * @returns {string} Formatted program dates
 */
export const formatApplicationProgramDates = (application) => {
  try {
    if (!application) return 'Coming soon';
    
    // 1. Handle multiple dates array (Multiple type)
    if (application.multiple_dates && Array.isArray(application.multiple_dates) && application.multiple_dates.length > 0) {
      if (application.multiple_dates.length === 1) {
        // Single date in multiple_dates array
        return formatDateShort(application.multiple_dates[0]);
      } else if (application.multiple_dates.length === 2) {
        // Check if both dates are the same (single date case)
        const date1 = new Date(application.multiple_dates[0]);
        const date2 = new Date(application.multiple_dates[1]);
        
        // Normalize dates to compare only the date part (remove time components)
        const date1Only = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const date2Only = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
        
        if (date1Only.getTime() === date2Only.getTime()) {
          // Same date, show as single date
          return formatDateShort(application.multiple_dates[0]);
        } else {
          // Two different dates: "Dec 14, 2025 and Dec 20, 2025"
          return `${formatDateShort(application.multiple_dates[0])} and ${formatDateShort(application.multiple_dates[1])}`;
        }
      } else {
        // Multiple dates: "Dec 14, 2025, Dec 24, 2025, Jan 1, 2026, and Jan 20, 2026"
        const formattedDates = application.multiple_dates.map(date => formatDateShort(date));
        const lastDate = formattedDates.pop();
        return `${formattedDates.join(', ')}, and ${lastDate}`;
      }
    }
    
    // 2. Handle date range (Range type: programStartDate + programEndDate)
    if (application.programStartDate && application.programEndDate) {
      const startDate = new Date(application.programStartDate);
      const endDate = new Date(application.programEndDate);
      
      // Check if dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 'Invalid date range';
      }
      
      // Normalize dates to compare only the date part (remove time components)
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      // If same day, show single date (Single type)
      if (startDateOnly.getTime() === endDateOnly.getTime()) {
        return formatDateShort(application.programStartDate);
      } else {
        // Different dates: "Dec 14, 2025 - Dec 20, 2025" (Range type)
        return `${formatDateShort(application.programStartDate)} - ${formatDateShort(application.programEndDate)}`;
      }
    }
    
    // 3. Handle single date (Single type: programStartDate only)
    if (application.programStartDate) {
      return formatDateShort(application.programStartDate);
    }
    
    return 'Coming soon';
  } catch (error) {
    logger.error('Error in formatApplicationProgramDates', error, { application });
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
/**
 * Parse MySQL DATETIME string as local time (no timezone conversion)
 * MySQL DATETIME is timezone-naive, so we treat it as local time
 * @param {string} dateString - MySQL DATETIME format: "YYYY-MM-DD HH:mm:ss" or ISO format
 * @returns {Date} Date object in local time
 */
const parseMySQLDateTime = (dateString) => {
  if (!dateString) return null;
  
  // Handle MySQL DATETIME format: "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm"
  // IMPORTANT: MySQL DATETIME is timezone-naive, so we must parse it as-is without any timezone conversion
  let normalizedString = dateString.trim();
  
  // Remove timezone suffix if present (Z, +HH:MM, -HH:MM)
  if (normalizedString.includes('T')) {
    normalizedString = normalizedString.replace(/Z$/, '');
    normalizedString = normalizedString.replace(/[+-]\d{2}:\d{2}$/, '');
  } else if (normalizedString.includes(' ')) {
    // MySQL format: replace space with 'T' for easier parsing
    normalizedString = normalizedString.replace(' ', 'T');
  }
  
  // Parse components manually to avoid ANY timezone conversion
  // Format: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm
  const match = normalizedString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, minute, second = '00'] = match;
    
    // Create date in local time using Date constructor with individual components
    // This creates a date in the browser's local timezone, treating the input as local time
    // month is 0-indexed in JavaScript Date constructor
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
    
    // Verify the date was created correctly by checking if the components match
    // This helps catch any timezone conversion issues
    if (date.getFullYear() === parseInt(year, 10) &&
        date.getMonth() === parseInt(month, 10) - 1 &&
        date.getDate() === parseInt(day, 10) &&
        date.getHours() === parseInt(hour, 10) &&
        date.getMinutes() === parseInt(minute, 10)) {
      return date;
    }
    
    // If components don't match, log a warning (in development) but return the date anyway
    // This might happen in edge cases with DST transitions
    if (process.env.NODE_ENV === 'development') {
      console.warn('Date component mismatch in parseMySQLDateTime:', {
        input: dateString,
        expected: { year, month, day, hour, minute, second },
        actual: {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
          hour: date.getHours(),
          minute: date.getMinutes(),
          second: date.getSeconds()
        }
      });
    }
    
    return date;
  }
  
  // Fallback: try to parse as-is (this might cause timezone issues, but it's a last resort)
  // Log a warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn('parseMySQLDateTime: Could not parse date string, using fallback:', dateString);
  }
  return new Date(dateString);
};

export const formatDateTime = (dateString) => {
  try {
    if (!dateString) return 'Not specified';
    
    let normalizedString = dateString.trim();
    
    // Check if this is an ISO format with timezone (TIMESTAMP field from backend)
    // Format: "YYYY-MM-DDTHH:mm:ss.sssZ" or "YYYY-MM-DDTHH:mm:ssZ" or with timezone offset
    const hasTimezone = normalizedString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalizedString);
    
    if (hasTimezone) {
      // This is a TIMESTAMP field (timezone-aware) - parse as UTC and convert to local time
      const date = new Date(normalizedString);
      if (isNaN(date.getTime())) {
        logger.warn('Invalid ISO date string with timezone in formatDateTime', { dateString });
        return 'Invalid date';
      }
      
      // Get local time components from the Date object
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth() returns 0-11
      const day = date.getDate();
      let hour = date.getHours();
      const minute = date.getMinutes();
      
      // Format month name
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthName = monthNames[month - 1];
      
      // Convert to 12-hour format
      const originalHour = hour;
      const ampm = originalHour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      hour = hour === 0 ? 12 : hour; // the hour '0' should be '12'
      
      // Format minutes with leading zero
      const minutesStr = minute.toString().padStart(2, '0');
      
      return `${monthName} ${day}, ${year}, ${hour}:${minutesStr} ${ampm}`;
    }
    
    // This is a DATETIME field (timezone-naive) - parse as local time without conversion
    // MySQL DATETIME format: "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm"
    // Or ISO format without timezone: "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DDTHH:mm"
    
    // Try to match both formats: ISO (with T) and MySQL (with space)
    // First try ISO format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
    let match = normalizedString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    
    // If no match, try MySQL format: YYYY-MM-DD HH:mm:ss or YYYY-MM-DD HH:mm
    if (!match) {
      match = normalizedString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    }
    
    if (!match) {
      logger.warn('Invalid date string format in formatDateTime', { 
        dateString, 
        normalizedString,
        hasT: normalizedString.includes('T'),
        hasSpace: normalizedString.includes(' ')
      });
      return 'Invalid date';
    }
    
    const [, year, month, day, hour, minute] = match;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    let hourNum = parseInt(hour, 10);
    const minuteNum = parseInt(minute, 10);
    
    // Validate components
    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || isNaN(hourNum) || isNaN(minuteNum)) {
      logger.warn('Invalid date components in formatDateTime', { dateString, year, month, day, hour, minute });
      return 'Invalid date';
    }
    
    // Additional validation: ensure hour is 0-23 and minute is 0-59
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      logger.warn('Invalid time values in formatDateTime', { dateString, hourNum, minuteNum });
      return 'Invalid date';
    }
    
    // Format month name
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[monthNum - 1]; // month is 1-indexed in the string
    
    // Convert to 12-hour format
    // IMPORTANT: Store original hour for AM/PM determination BEFORE modulo operation
    const originalHour = hourNum;
    const ampm = originalHour >= 12 ? 'PM' : 'AM';
    hourNum = hourNum % 12;
    hourNum = hourNum === 0 ? 12 : hourNum; // the hour '0' should be '12'
    
    // Format minutes with leading zero
    const minutesStr = minuteNum.toString().padStart(2, '0');
    
    return `${monthName} ${dayNum}, ${yearNum}, ${hourNum}:${minutesStr} ${ampm}`;
  } catch (error) {
    logger.error('Error in formatDateTime', error, { dateString });
    return 'Invalid date';
  }
};

export const formatDateTimeForInput = (dateString) => {
  try {
    if (!dateString) return '';
    
    // Parse the date string directly without creating a Date object to avoid timezone conversion
    // MySQL DATETIME format: "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm"
    // Or ISO format: "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DDTHH:mm"
    let normalizedString = dateString.trim();
    
    // Remove timezone suffix if present (Z, +HH:MM, -HH:MM)
    normalizedString = normalizedString.replace(/Z$/, '');
    normalizedString = normalizedString.replace(/[+-]\d{2}:\d{2}$/, '');
    
    // Try to match both formats: ISO (with T) and MySQL (with space)
    // First try ISO format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
    let match = normalizedString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    
    // If no match, try MySQL format: YYYY-MM-DD HH:mm:ss or YYYY-MM-DD HH:mm
    if (!match) {
      match = normalizedString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    }
    
    if (!match) {
      logger.warn('Invalid date string format in formatDateTimeForInput', { 
        dateString, 
        normalizedString,
        hasT: normalizedString.includes('T'),
        hasSpace: normalizedString.includes(' ')
      });
      return '';
    }
    
    const [, year, month, day, hour, minute] = match;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    const hourNum = parseInt(hour, 10);
    const minuteNum = parseInt(minute, 10);
    
    // Validate components
    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum) || isNaN(hourNum) || isNaN(minuteNum)) {
      logger.warn('Invalid date components in formatDateTimeForInput', { dateString, year, month, day, hour, minute });
      return '';
    }
    
    // Additional validation: ensure hour is 0-23 and minute is 0-59
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      logger.warn('Invalid time values in formatDateTimeForInput', { dateString, hourNum, minuteNum });
      return '';
    }
    
    // Return in ISO format: YYYY-MM-DDTHH:mm
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch (error) {
    logger.error('Error in formatDateTimeForInput', error, { dateString });
    return '';
  }
};

/**
 * Get current datetime in ISO format (YYYY-MM-DDTHH:mm)
 * Uses local timezone to avoid date shifting issues
 * @returns {string} Current datetime in ISO format
 */
export const getCurrentDateTimeISO = () => {
  try {
    const now = new Date();
    // Use local timezone to avoid date shifting issues
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    logger.error('Error in getCurrentDateTimeISO', error);
    return '';
  }
};

/**
 * Format datetime for API requests (ISO format with time)
 * Uses local timezone to avoid date shifting issues
 * @param {string} dateString - Date string in any valid format
 * @returns {string} ISO datetime string (YYYY-MM-DD HH:mm:ss) or empty string
 */
export const formatDateTimeForAPI = (dateString) => {
  try {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      logger.warn('Invalid date string provided to formatDateTimeForAPI', { dateString });
      return '';
    }
    
    // Use local timezone to avoid date shifting issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    logger.error('Error in formatDateTimeForAPI', error, { dateString });
    return '';
  }
};

/**
 * Format time only for display (12-hour format with AM/PM)
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted time string (e.g., "9:26 AM")
 */
export const formatTime = (dateString) => {
  try {
    if (!dateString) return 'Not specified';
    
    // Parse the date string directly without creating a Date object to avoid timezone conversion
    // MySQL DATETIME format: "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm"
    // Or ISO format: "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DDTHH:mm"
    let normalizedString = dateString.trim();
    
    // Remove timezone suffix if present (Z, +HH:MM, -HH:MM)
    normalizedString = normalizedString.replace(/Z$/, '');
    normalizedString = normalizedString.replace(/[+-]\d{2}:\d{2}$/, '');
    
    // Try to match both formats: ISO (with T) and MySQL (with space)
    // First try ISO format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
    let match = normalizedString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    
    // If no match, try MySQL format: YYYY-MM-DD HH:mm:ss or YYYY-MM-DD HH:mm
    if (!match) {
      match = normalizedString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    }
    
    if (!match) {
      logger.warn('Invalid date string format in formatTime', { 
        dateString, 
        normalizedString,
        hasT: normalizedString.includes('T'),
        hasSpace: normalizedString.includes(' ')
      });
      return 'Invalid time';
    }
    
    const [, , , , hour, minute] = match;
    let hourNum = parseInt(hour, 10);
    const minuteNum = parseInt(minute, 10);
    
    // Validate components
    if (isNaN(hourNum) || isNaN(minuteNum)) {
      logger.warn('Invalid time components in formatTime', { dateString, hour, minute });
      return 'Invalid time';
    }
    
    // Additional validation: ensure hour is 0-23 and minute is 0-59
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      logger.warn('Invalid time values in formatTime', { dateString, hourNum, minuteNum });
      return 'Invalid time';
    }
    
    // Convert to 12-hour format
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    hourNum = hourNum % 12;
    hourNum = hourNum === 0 ? 12 : hourNum; // the hour '0' should be '12'
    
    // Format minutes with leading zero
    const minutesStr = minuteNum.toString().padStart(2, '0');
    
    return `${hourNum}:${minutesStr} ${ampm}`;
  } catch (error) {
    logger.error('Error in formatTime', error, { dateString });
    return 'Invalid time';
  }
};
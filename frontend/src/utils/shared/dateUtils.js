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
    
    // Handle Date objects by converting to ISO string
    let dateValue = dateString;
    if (dateString instanceof Date) {
      // If it's an Invalid Date, return early
      if (isNaN(dateString.getTime())) {
        logger.warn('Invalid Date object provided to formatDateShort', { dateString });
        return 'Invalid date';
      }
      // Convert Date object to ISO string for processing
      dateValue = dateString.toISOString();
    }
    
    // Ensure we have a string to work with
    const dateStr = String(dateValue).trim();
    if (!dateStr || dateStr === 'Invalid Date') {
      return 'Invalid date';
    }
    
    // Check if this is an ISO format with timezone (TIMESTAMP field from backend)
    const hasTimezone = dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr);
    
    let date;
    if (hasTimezone) {
      // TIMESTAMP field (timezone-aware) - parse as UTC and convert to local time
      date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        logger.warn('Invalid ISO date string with timezone in formatDateShort', { dateString: dateStr });
        return 'Invalid date';
      }
    } else {
      // DATETIME field (timezone-naive) - parse as local time
      date = parseMySQLDateTime(dateStr);
      if (!date || isNaN(date.getTime())) {
        logger.warn('Invalid date string provided to formatDateShort', { dateString: dateStr });
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
    // IMPORTANT: Check for 'Z' at the end (case-insensitive) and timezone offsets
    // The backend should always return scheduled news published_at with 'Z' suffix
    const endsWithZ = normalizedString.endsWith('Z') || normalizedString.endsWith('z');
    const hasTimezoneOffset = /[+-]\d{2}:\d{2}$/.test(normalizedString);
    const hasTimezone = endsWithZ || hasTimezoneOffset;
    
    // Log for debugging in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('[formatDateTime] INPUT:', {
        dateString,
        normalizedString,
        hasTimezone,
        endsWithZ: normalizedString.endsWith('Z'),
        hasTimezoneOffset: /[+-]\d{2}:\d{2}$/.test(normalizedString),
        timestamp: new Date().toISOString()
      });
    }
    
    if (hasTimezone) {
      // This is a TIMESTAMP field (timezone-aware) - parse as UTC and convert to local time
      const date = new Date(normalizedString);
      if (isNaN(date.getTime())) {
        logger.warn('Invalid ISO date string with timezone in formatDateTime', { dateString });
        return 'Invalid date';
      }
      
      // Get local time components from the Date object (automatically converted from UTC)
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth() returns 0-11
      const day = date.getDate();
      let hour = date.getHours();
      const minute = date.getMinutes();
      
      // Log conversion for debugging in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('[formatDateTime] UTC → LOCAL CONVERSION (with timezone):', {
          inputUTC: normalizedString,
          utcDateISO: date.toISOString(),
          utcComponents: {
            year: date.getUTCFullYear(),
            month: date.getUTCMonth() + 1,
            day: date.getUTCDate(),
            hour: date.getUTCHours(),
            minute: date.getUTCMinutes()
          },
          localComponents: {
            year,
            month,
            day,
            hour,
            minute
          },
          timezoneOffset: -date.getTimezoneOffset() / 60,
          timestamp: new Date().toISOString()
        });
      }
      
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
    
    // This is a DATETIME field (timezone-naive)
    // IMPORTANT: For scheduled news, published_at is now stored in UTC
    // We need to treat it as UTC and convert to local time for display
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
    
    const [, year, month, day, hour, minute, second] = match;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    let hourNum = parseInt(hour, 10);
    const minuteNum = parseInt(minute, 10);
    const secondNum = second ? parseInt(second, 10) : 0;
    
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
    
    // IMPORTANT: Treat the stored time as UTC and convert to local time
    // This is necessary because scheduled news published_at is now stored in UTC
    // Create a UTC date string and parse it, which will automatically convert to local time
    const hourStr = hour.padStart ? hour.padStart(2, '0') : String(hour).padStart(2, '0');
    const minuteStr = minute.padStart ? minute.padStart(2, '0') : String(minute).padStart(2, '0');
    const secondStr = String(secondNum).padStart(2, '0');
    const utcDateString = `${year}-${month}-${day}T${hourStr}:${minuteStr}:${secondStr}Z`;
    const date = new Date(utcDateString);
    
    // Log conversion for debugging in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('[formatDateTime] DATETIME (treated as UTC) → LOCAL CONVERSION:', {
        inputDATETIME: normalizedString,
        treatedAsUTC: utcDateString,
        utcDateISO: date.toISOString(),
        utcComponents: {
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
          day: date.getUTCDate(),
          hour: date.getUTCHours(),
          minute: date.getUTCMinutes()
        },
        localComponents: {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
          hour: date.getHours(),
          minute: date.getMinutes()
        },
        timezoneOffset: -date.getTimezoneOffset() / 60,
        timestamp: new Date().toISOString()
      });
    }
    
    if (isNaN(date.getTime())) {
      // Fallback: if UTC parsing fails, use the original logic (for backward compatibility)
      logger.warn('Failed to parse as UTC in formatDateTime, using fallback', { dateString, utcDateString });
      
      // Format month name
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthName = monthNames[monthNum - 1];
      
      // Convert to 12-hour format
      const originalHour = hourNum;
      const ampm = originalHour >= 12 ? 'PM' : 'AM';
      hourNum = hourNum % 12;
      hourNum = hourNum === 0 ? 12 : hourNum;
      
      const minutesStr = minuteNum.toString().padStart(2, '0');
      return `${monthName} ${dayNum}, ${yearNum}, ${hourNum}:${minutesStr} ${ampm}`;
    }
    
    // Get local time components from the converted date
    const localYear = date.getFullYear();
    const localMonth = date.getMonth() + 1;
    const localDay = date.getDate();
    let localHour = date.getHours();
    const localMinute = date.getMinutes();
    
    // Format month name
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[localMonth - 1];
    
    // Convert to 12-hour format
    const originalHour = localHour;
    const ampm = originalHour >= 12 ? 'PM' : 'AM';
    localHour = localHour % 12;
    localHour = localHour === 0 ? 12 : localHour; // the hour '0' should be '12'
    
    // Format minutes with leading zero
    const minutesStr = localMinute.toString().padStart(2, '0');
    
    return `${monthName} ${localDay}, ${localYear}, ${localHour}:${minutesStr} ${ampm}`;
  } catch (error) {
    logger.error('Error in formatDateTime', error, { dateString });
    return 'Invalid date';
  }
};

export const formatDateTimeForInput = (dateString) => {
  try {
    if (!dateString) return '';
    
    let normalizedString = dateString.trim();
    
    // Check if this is an ISO format with timezone (TIMESTAMP field from backend with 'Z' or offset)
    // Format: "YYYY-MM-DDTHH:mm:ss.sssZ" or "YYYY-MM-DDTHH:mm:ssZ" or with timezone offset
    const hasTimezone = normalizedString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalizedString);
    
    if (hasTimezone) {
      // This is a UTC timestamp - parse as UTC and convert to local time for the date picker
      const utcDate = new Date(normalizedString);
      if (isNaN(utcDate.getTime())) {
        logger.warn('Invalid ISO date string with timezone in formatDateTimeForInput', { dateString });
        return '';
      }
      
      // Get local time components from the Date object (automatically converted from UTC)
      const year = utcDate.getFullYear();
      const month = String(utcDate.getMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getDate()).padStart(2, '0');
      const hour = String(utcDate.getHours()).padStart(2, '0');
      const minute = String(utcDate.getMinutes()).padStart(2, '0');
      
      const localTimeString = `${year}-${month}-${day}T${hour}:${minute}`;
      
      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[formatDateTimeForInput] UTC → LOCAL CONVERSION:', {
          inputUTC: normalizedString,
          utcDateISO: utcDate.toISOString(),
          outputLocal: localTimeString,
          utcComponents: {
            year: utcDate.getUTCFullYear(),
            month: utcDate.getUTCMonth() + 1,
            day: utcDate.getUTCDate(),
            hour: utcDate.getUTCHours(),
            minute: utcDate.getUTCMinutes()
          },
          localComponents: {
            year,
            month,
            day,
            hour,
            minute
          },
          timezoneOffset: -utcDate.getTimezoneOffset() / 60,
          timestamp: new Date().toISOString()
        });
      }
      
      // Return in ISO format: YYYY-MM-DDTHH:mm (local time)
      return localTimeString;
    }
    
    // This is a DATETIME field (timezone-naive) - parse components directly
    // IMPORTANT: For scheduled news, published_at is stored in UTC in the database
    // However, if the backend doesn't return it with 'Z' or timezone offset, we need to handle it
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
    
    // IMPORTANT: If the string doesn't have timezone info, we need to determine if it's UTC or local
    // For scheduled news, published_at is stored in UTC, so if we receive a DATETIME without timezone,
    // we should treat it as UTC and convert to local time
    // However, to be safe, we'll treat it as UTC (since scheduled news is always stored in UTC)
    // and convert to local time for display
    // Create a UTC date string and parse it, which will automatically convert to local time
    const hourStr = hour.padStart ? hour.padStart(2, '0') : String(hour).padStart(2, '0');
    const minuteStr = minute.padStart ? minute.padStart(2, '0') : String(minute).padStart(2, '0');
    const utcDateString = `${year}-${month}-${day}T${hourStr}:${minuteStr}:00Z`;
    const utcDate = new Date(utcDateString);
    
    if (!isNaN(utcDate.getTime())) {
      // Successfully parsed as UTC - get local time components
      const localYear = utcDate.getFullYear();
      const localMonth = String(utcDate.getMonth() + 1).padStart(2, '0');
      const localDay = String(utcDate.getDate()).padStart(2, '0');
      const localHour = String(utcDate.getHours()).padStart(2, '0');
      const localMinute = String(utcDate.getMinutes()).padStart(2, '0');
      
      // Log conversion for debugging in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('[formatDateTimeForInput] DATETIME (treated as UTC) → LOCAL CONVERSION:', {
          inputDATETIME: normalizedString,
          treatedAsUTC: utcDateString,
          utcDateISO: utcDate.toISOString(),
          outputLocal: `${localYear}-${localMonth}-${localDay}T${localHour}:${localMinute}`,
          utcComponents: {
            year: utcDate.getUTCFullYear(),
            month: utcDate.getUTCMonth() + 1,
            day: utcDate.getUTCDate(),
            hour: utcDate.getUTCHours(),
            minute: utcDate.getUTCMinutes()
          },
          localComponents: {
            year: localYear,
            month: localMonth,
            day: localDay,
            hour: localHour,
            minute: localMinute
          },
          timezoneOffset: -utcDate.getTimezoneOffset() / 60,
          timestamp: new Date().toISOString()
        });
      }
      
      // Return in ISO format: YYYY-MM-DDTHH:mm (local time)
      return `${localYear}-${localMonth}-${localDay}T${localHour}:${localMinute}`;
    }
    
    // Fallback: if UTC parsing fails, treat as local time (for backward compatibility)
    // This should rarely happen, but we include it for safety
    if (process.env.NODE_ENV === 'development') {
      logger.warn('formatDateTimeForInput: UTC parsing failed, treating as local time', { 
        dateString, 
        normalizedString,
        utcDateString 
      });
    }
    
    // Return in ISO format: YYYY-MM-DDTHH:mm (treating as local time for backward compatibility)
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch (error) {
    logger.error('Error in formatDateTimeForInput', error, { dateString });
    return '';
  }
};

/**
 * ============================================================================
 * TIMEZONE CONVERSION UTILITIES
 * ============================================================================
 * These utilities handle timezone-aware datetime conversions for scheduled news.
 * All scheduled times are stored in UTC in the database (using DATETIME type).
 * 
 * Strategy:
 * - Input: User's local time + timezone offset → Convert to UTC → Store in DB
 * - Output: UTC from DB → Convert to user's timezone → Display
 * - Comparison: Always compare UTC to UTC using UTC_TIMESTAMP()
 */

/**
 * Get browser's timezone offset in standard format
 * Returns timezone offset as "+HH:MM" or "-HH:MM" (e.g., "+08:00", "-05:00")
 * @returns {string} Timezone offset in format "+HH:MM" or "-HH:MM"
 */
export const getBrowserTimezoneOffset = () => {
  try {
    // getTimezoneOffset() returns offset in minutes, negative for timezones ahead of UTC
    // Example: PST (UTC-8) returns 480, EST (UTC-5) returns 300
    // We need to negate it to get the correct sign for ISO format
    const offsetMinutes = -new Date().getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes >= 0 ? '+' : '-';
    
    return `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
  } catch (error) {
    logger.error('Error in getBrowserTimezoneOffset', error);
    // Fallback to UTC
    return '+00:00';
  }
};

/**
 * Validate timezone offset format
 * @param {string} offset - Timezone offset in format "+HH:MM" or "-HH:MM" (e.g., "+08:00", "-05:00")
 * @returns {boolean} True if valid format
 */
export const validateTimezoneOffset = (offset) => {
  if (!offset || typeof offset !== 'string') {
    return false;
  }
  
  // Match format: +HH:MM or -HH:MM
  const offsetPattern = /^[+-]\d{2}:\d{2}$/;
  return offsetPattern.test(offset.trim());
};
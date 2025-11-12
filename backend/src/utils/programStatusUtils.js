/**
 * Utility functions for program status calculations
 * Used during initial program creation to set status based on event dates
 */

/**
 * Calculates initial program status based on event dates
 * This is ONLY used during program creation - after creation, admin manual changes take priority
 * 
 * @param {string|null} event_start_date - Start date of the program (ISO format)
 * @param {string|null} event_end_date - End date of the program (ISO format, optional)
 * @param {Array<string>|null} multiple_dates - Array of event dates (optional)
 * @returns {string} - Initial status: 'Upcoming', 'Active', or 'Completed'
 */
const calculateInitialStatusFromDates = (event_start_date, event_end_date, multiple_dates = null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  // Handle multiple dates
  if (multiple_dates && Array.isArray(multiple_dates) && multiple_dates.length > 0) {
    const dates = multiple_dates
      .filter(date => date) // Filter out null/undefined
      .map(dateStr => {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date;
      })
      .sort((a, b) => a - b); // Sort chronologically
    
    if (dates.length === 0) {
      return 'Upcoming'; // Default if no valid dates
    }
    
    const earliestDate = dates[0];
    const latestDate = dates[dates.length - 1];
    
    // If today is before the earliest date, it's upcoming
    if (today < earliestDate) {
      return 'Upcoming';
    }
    // If today is after the latest date, it's completed
    if (today > latestDate) {
      return 'Completed';
    }
    // If today is between or on any of the dates, it's active
    return 'Active';
  }

  // Handle single date or date range
  if (event_start_date) {
    const startDate = new Date(event_start_date);
    startDate.setHours(0, 0, 0, 0);
    
    if (event_end_date) {
      const endDate = new Date(event_end_date);
      endDate.setHours(0, 0, 0, 0);
      
      // If today is before the start date, it's upcoming
      if (today < startDate) {
        return 'Upcoming';
      }
      // If today is after the end date, it's completed
      if (today > endDate) {
        return 'Completed';
      }
      // If today is between or on the dates, it's active
      return 'Active';
    } else {
      // Only start date provided
      // If today is before the start date, it's upcoming
      if (today < startDate) {
        return 'Upcoming';
      }
      // If today is on or after the start date, it's active
      // (We can't determine completion without an end date)
      return 'Active';
    }
  }

  // Default to upcoming if no dates are set
  return 'Upcoming';
};

export { calculateInitialStatusFromDates };


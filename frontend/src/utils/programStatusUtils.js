/**
 * Utility functions for program status calculations
 * This ensures consistent status determination across all components
 */

/**
 * Determines program status with priority given to admin manual changes
 * This is the single source of truth for program status calculation
 * 
 * @param {Object} program - The program object
 * @param {string} program.event_start_date - Start date of the program
 * @param {string} program.event_end_date - End date of the program (optional)
 * @param {string} program.status - Database status (admin manual override)
 * @param {boolean} program.manual_status_override - Flag indicating if admin manually set status
 * @returns {string} - Calculated status: 'Upcoming', 'Active', or 'Completed'
 */
export const getProgramStatusByDates = (program) => {
  if (!program) {
    return 'Active';
  }

  // Priority 1: If admin has manually set the status, respect it
  if (program.manual_status_override && program.status) {
    // If admin manually set status, use it regardless of dates
    return program.status;
  }

  // Priority 2: If no start date, use the database status as fallback
  if (!program.event_start_date) {
    return program.status || 'Active';
  }

  // Priority 3: Calculate status based on dates (for programs without manual override)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  const startDate = new Date(program.event_start_date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = program.event_end_date ? new Date(program.event_end_date) : null;
  if (endDate) {
    endDate.setHours(23, 59, 59, 999); // Set to end of day
  }

  // If start date is in the future, it's upcoming
  if (startDate > today) {
    return 'Upcoming';
  }
  
  // If end date exists and is in the past, it's completed
  if (endDate && endDate < today) {
    return 'Completed';
  }
  
  // If start date is today or in the past, and either no end date or end date is today or in the future, it's active
  return 'Active';
};

/**
 * Checks if a program is in a specific status
 * 
 * @param {Object} program - The program object
 * @param {string} status - The status to check for
 * @returns {boolean} - True if program is in the specified status
 */
export const isProgramInStatus = (program, status) => {
  return getProgramStatusByDates(program) === status;
};

/**
 * Gets all valid program statuses
 * 
 * @returns {string[]} - Array of valid status strings
 */
export const getValidProgramStatuses = () => {
  return ['Upcoming', 'Active', 'Completed'];
};

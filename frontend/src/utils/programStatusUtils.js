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

  // Priority 2: Programs stay 'Upcoming' until admin manually changes status
  // Only use automated date-based calculation when creating the program initially
  // After that, programs remain in their current status until admin manually changes it
  return program.status || 'Upcoming';
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

// Program utility functions extracted from page.js

/**
 * Helper function to determine program status based on dates
 * @param {Object} program - The program object
 * @returns {string} - Program status ('Active', 'Upcoming', or 'Completed')
 */
export const getProgramStatusByDates = (program) => {
  // ALWAYS prioritize explicit database status over ANY date calculations
  // This allows users to manually override date-based status
  if (program.status === 'Active' || program.status === 'Completed' || program.status === 'Upcoming') {
    return program.status;
  }

  // Only use date-based logic if no explicit status is set
  if (!program.event_start_date) {
    // If no start date, use the database status or default to Active
    return program.status || 'Active';
  }

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
 * Helper function to sort by upcoming program dates
 * @param {Object} a - First collaboration object
 * @param {Object} b - Second collaboration object
 * @returns {number} - Sort comparison result
 */
export const sortByUpcomingDate = (a, b) => {
  const now = new Date();
  
  // Get the next upcoming date for each collaboration
  const getNextUpcomingDate = (collaboration) => {
    const dates = [];
    
    // Add event_start_date if it exists and is in the future
    if (collaboration.event_start_date) {
      const startDate = new Date(collaboration.event_start_date);
      if (startDate > now) {
        dates.push(startDate);
      }
    }
    
    // Add event_end_date if it exists and is in the future
    if (collaboration.event_end_date) {
      const endDate = new Date(collaboration.event_end_date);
      if (endDate > now) {
        dates.push(endDate);
      }
    }
    
    // Return the earliest upcoming date, or null if no upcoming dates
    return dates.length > 0 ? new Date(Math.min(...dates)) : null;
  };
  
  const aNextDate = getNextUpcomingDate(a);
  const bNextDate = getNextUpcomingDate(b);
  
  // If both have upcoming dates, sort by earliest upcoming date
  if (aNextDate && bNextDate) {
    return aNextDate - bNextDate;
  }
  
  // If only one has upcoming dates, prioritize it
  if (aNextDate && !bNextDate) {
    return -1;
  }
  if (!aNextDate && bNextDate) {
    return 1;
  }
  
  // If neither has upcoming dates, sort by creation date (newest first)
  return new Date(b.invited_at) - new Date(a.invited_at);
};

/**
 * Filter and sort programs based on search query, status filter, and sort criteria
 * @param {Array} programs - Array of programs
 * @param {string} searchQuery - Search query string
 * @param {string} statusFilter - Status filter ('Active', 'Upcoming', 'Completed')
 * @param {string} sortBy - Sort criteria ('newest', 'oldest', 'title')
 * @returns {Array} - Filtered and sorted programs
 */
export const filterAndSortPrograms = (programs, searchQuery, statusFilter, sortBy) => {
  let filtered = (programs || []).filter((program) => {
    if (!program || !program.title) return false;
    
    const matchesSearch = 
      (program.title && program.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (program.description && program.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (program.category && program.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Use date-based status instead of database status
    const programStatus = getProgramStatusByDates(program);
    const matchesStatus = programStatus.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Sort programs
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        const dateANew = a.created_at || a.date || new Date(0);
        const dateBNew = b.created_at || b.date || new Date(0);
        return new Date(dateBNew) - new Date(dateANew);
      case 'oldest':
        const dateAOld = a.created_at || a.date || new Date(0);
        const dateBOld = b.created_at || b.date || new Date(0);
        return new Date(dateAOld) - new Date(dateBOld);
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      default:
        return 0;
    }
  });

  return filtered;
};

/**
 * Filter and sort collaborations based on search query, status filter, and sort criteria
 * @param {Array} collaborations - Array of collaborations
 * @param {string} searchQuery - Search query string
 * @param {string} collaborationStatusFilter - Collaboration status filter
 * @param {string} sortBy - Sort criteria
 * @param {Function} getEffectiveStatus - Function to get effective status
 * @returns {Array} - Filtered and sorted collaborations
 */
export const filterAndSortCollaborations = (collaborations, searchQuery, collaborationStatusFilter, sortBy, getEffectiveStatus) => {
  let filtered = collaborations.filter((collaboration) => {
    if (!collaboration) {
      return false;
    }
    
    if (!collaboration.program_title) {
      return false;
    }
    
    const matchesSearch = 
      (collaboration.program_title && collaboration.program_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (collaboration.program_description && collaboration.program_description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (collaboration.program_org_name && collaboration.program_org_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (collaboration.inviter_org_name && collaboration.inviter_org_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (collaboration.invitee_org_name && collaboration.invitee_org_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const effectiveStatus = getEffectiveStatus(collaboration.status, collaboration.program_status);
    const matchesStatus = collaborationStatusFilter === 'all' || effectiveStatus === collaborationStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort collaborations
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.invited_at) - new Date(a.invited_at);
      case 'oldest':
        return new Date(a.invited_at) - new Date(b.invited_at);
      case 'upcoming':
        return sortByUpcomingDate(a, b);
      case 'program_title':
        return (a.program_title || '').localeCompare(b.program_title || '');
      case 'status':
        return (a.status || '').localeCompare(b.status || '');
      default:
        return 0;
    }
  });

  return filtered;
};

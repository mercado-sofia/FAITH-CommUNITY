import { LuCalendarCheck2 } from "react-icons/lu";
import { FiCalendar } from "react-icons/fi";

/**
 * Processes project dates to determine display date, status, and styling
 * @param {Object} project - The project object with date properties
 * @returns {Object} Processed date information
 */
export const processProjectDates = (project) => {
  // Determine the best date to display and program status
  let displayDate = 'Coming Soon';
  let status = 'upcoming';
  let dateColor = '#15803d'; // Default upcoming color
  let CalendarIcon = FiCalendar; // Default upcoming icon
  
  const now = new Date();
  const startDate = project.eventStartDate ? new Date(project.eventStartDate) : null;
  const endDate = project.eventEndDate ? new Date(project.eventEndDate) : null;
  
  // Check for multiple dates first
  if (project.multiple_dates && Array.isArray(project.multiple_dates) && project.multiple_dates.length > 0) {
    // For multiple dates, show the soonest upcoming date
    const upcomingDates = project.multiple_dates
      .map(date => new Date(date))
      .filter(date => date >= now)
      .sort((a, b) => a - b);
    
    if (upcomingDates.length > 0) {
      status = 'upcoming';
      displayDate = upcomingDates[0].toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      dateColor = '#15803d';
      CalendarIcon = FiCalendar;
    } else {
      // All dates are in the past
      status = 'completed';
      const lastDate = project.multiple_dates
        .map(date => new Date(date))
        .sort((a, b) => b - a)[0];
      displayDate = lastDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      dateColor = '#475569';
      CalendarIcon = LuCalendarCheck2;
    }
  } else if (startDate && endDate) {
    // Check if it's a single-day event
    const isSingleDay = startDate.toDateString() === endDate.toDateString();
    
    if (isSingleDay) {
      // Single-day event - show only one date
      if (now > endDate) {
        status = 'completed';
        displayDate = startDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        dateColor = '#475569';
        CalendarIcon = LuCalendarCheck2;
      } else if (now >= startDate && now <= endDate) {
        status = 'active';
        displayDate = 'Currently Active';
        dateColor = '#e77b2d';
        CalendarIcon = FiCalendar;
      } else {
        status = 'upcoming';
        displayDate = startDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        dateColor = '#15803d';
        CalendarIcon = FiCalendar;
      }
    } else {
      // Multi-day event - show date range
      if (now > endDate) {
        status = 'completed';
        displayDate = `${startDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })} - ${endDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}`;
        dateColor = '#475569';
        CalendarIcon = LuCalendarCheck2;
      } else if (now >= startDate && now <= endDate) {
        status = 'active';
        displayDate = 'Currently Active';
        dateColor = '#e77b2d';
        CalendarIcon = FiCalendar;
      } else {
        status = 'upcoming';
        displayDate = `${startDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })} - ${endDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}`;
        dateColor = '#15803d';
        CalendarIcon = FiCalendar;
      }
    }
  } else if (startDate) {
    // Single start date
    if (now >= startDate) {
      status = 'active';
      displayDate = 'Currently Active';
      dateColor = '#e77b2d';
      CalendarIcon = FiCalendar;
    } else {
      status = 'upcoming';
      displayDate = startDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      dateColor = '#15803d';
      CalendarIcon = FiCalendar;
    }
  } else if (endDate) {
    // Single end date
    if (now > endDate) {
      status = 'completed';
      displayDate = endDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      dateColor = '#475569';
      CalendarIcon = LuCalendarCheck2;
    } else {
      status = 'upcoming';
      displayDate = endDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      dateColor = '#15803d';
      CalendarIcon = FiCalendar;
    }
  }

  return {
    displayDate,
    status,
    dateColor,
    CalendarIcon
  };
};

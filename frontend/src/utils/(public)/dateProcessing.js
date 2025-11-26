import { LuCalendarCheck2 } from "react-icons/lu";
import { FiCalendar } from "react-icons/fi";
import { formatDateShort } from '@/utils/shared/dateUtils';

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
    const upcomingDatesWithStrings = project.multiple_dates
      .map(dateString => ({ dateString, date: new Date(dateString) }))
      .filter(({ date }) => !isNaN(date.getTime()) && date >= now)
      .sort((a, b) => a.date - b.date);
    
    if (upcomingDatesWithStrings.length > 0) {
      status = 'upcoming';
      displayDate = formatDateShort(upcomingDatesWithStrings[0].dateString);
      dateColor = '#15803d';
      CalendarIcon = FiCalendar;
    } else {
      // All dates are in the past
      status = 'completed';
      const pastDatesWithStrings = project.multiple_dates
        .map(dateString => ({ dateString, date: new Date(dateString) }))
        .filter(({ date }) => !isNaN(date.getTime()))
        .sort((a, b) => b.date - a.date);
      
      if (pastDatesWithStrings.length > 0) {
        displayDate = formatDateShort(pastDatesWithStrings[0].dateString);
      } else {
        displayDate = 'Invalid date';
      }
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
        displayDate = formatDateShort(project.eventStartDate);
        dateColor = '#475569';
        CalendarIcon = LuCalendarCheck2;
      } else if (now >= startDate && now <= endDate) {
        status = 'active';
        displayDate = 'Currently Active';
        dateColor = '#e77b2d';
        CalendarIcon = FiCalendar;
      } else {
        status = 'upcoming';
        displayDate = formatDateShort(project.eventStartDate);
        dateColor = '#15803d';
        CalendarIcon = FiCalendar;
      }
    } else {
      // Multi-day event - show date range
      if (now > endDate) {
        status = 'completed';
        displayDate = `${formatDateShort(project.eventStartDate)} - ${formatDateShort(project.eventEndDate)}`;
        dateColor = '#475569';
        CalendarIcon = LuCalendarCheck2;
      } else if (now >= startDate && now <= endDate) {
        status = 'active';
        displayDate = 'Currently Active';
        dateColor = '#e77b2d';
        CalendarIcon = FiCalendar;
      } else {
        status = 'upcoming';
        displayDate = `${formatDateShort(project.eventStartDate)} - ${formatDateShort(project.eventEndDate)}`;
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
      displayDate = formatDateShort(project.eventStartDate);
      dateColor = '#15803d';
      CalendarIcon = FiCalendar;
    }
  } else if (endDate) {
    // Single end date
    if (now > endDate) {
      status = 'completed';
      displayDate = formatDateShort(project.eventEndDate);
      dateColor = '#475569';
      CalendarIcon = LuCalendarCheck2;
    } else {
      status = 'upcoming';
      displayDate = formatDateShort(project.eventEndDate);
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

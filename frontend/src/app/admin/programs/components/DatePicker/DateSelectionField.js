'use client';

import { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import MultiDatePicker from 'react-multi-date-picker';
import { FaCalendar, FaChevronDown } from 'react-icons/fa';
import { formatDateShort, formatDateForAPI } from '@/utils/dateUtils.js';
import "react-datepicker/dist/react-datepicker.css";
import './datePickerOverrides.css';
import styles from './DateSelectionField.module.css';

const CustomDropdown = ({ options, value, onChange, disabled, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={styles.customDropdown} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.dropdownButton} ${isOpen ? styles.dropdownOpen : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={styles.dropdownValue}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <FaChevronDown className={`${styles.dropdownArrow} ${isOpen ? styles.arrowUp : ''}`} />
      </button>
      
      {isOpen && (
        <div className={styles.dropdownOptions}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.dropdownOption} ${value === option.value ? styles.optionSelected : ''}`}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DateSelectionField = ({ 
  value, 
  onChange, 
  error, 
  disabled = false,
  label = "Event Dates",
  required = false 
}) => {
  const [scheduleType, setScheduleType] = useState('single');
  const [dateRange, setDateRange] = useState([null, null]);
  const [multipleDates, setMultipleDates] = useState([]);

  const scheduleOptions = [
    { value: 'single', label: 'Single Day' },
    { value: 'range', label: 'Date Range' },
    { value: 'multiple', label: 'Multiple Dates' },
  ];

  // Helper function to convert date to YYYY-MM-DD format using centralized utility
  const formatDateToString = (date) => {
    if (date instanceof Date) {
      return formatDateForAPI(date);
    } else if (date && date.toDate) {
      return formatDateForAPI(date.toDate());
    } else if (date && typeof date === 'object' && date.year) {
      const dateObj = new Date(date.year, date.month - 1, date.day);
      return formatDateForAPI(dateObj);
    }
    return null;
  };

  // Initialize values based on incoming value
  useEffect(() => {
    if (value) {
      if (value.event_start_date && value.event_end_date) {
        const startDate = new Date(value.event_start_date);
        const endDate = new Date(value.event_end_date);
        
        if (startDate.getTime() === endDate.getTime()) {
          // Single day
          setScheduleType('single');
          setDateRange([startDate, null]);
        } else {
          // Date range
          setScheduleType('range');
          setDateRange([startDate, endDate]);
        }
      } else if (value.multiple_dates && Array.isArray(value.multiple_dates)) {
        // Multiple scattered dates
        setScheduleType('multiple');
        setMultipleDates(value.multiple_dates.map(date => new Date(date)));
      }
    }
  }, [value]);

  // Handle schedule type change
  const handleScheduleTypeChange = (type) => {
    setScheduleType(type);
    
    // Clear previous values when switching types
    if (type === 'single') {
      setDateRange([null, null]);
      setMultipleDates([]);
      onChange({
        event_start_date: null,
        event_end_date: null,
        multiple_dates: null
      });
    } else if (type === 'range') {
      setMultipleDates([]);
      onChange({
        event_start_date: null,
        event_end_date: null,
        multiple_dates: null
      });
    } else if (type === 'multiple') {
      setDateRange([null, null]);
      onChange({
        event_start_date: null,
        event_end_date: null,
        multiple_dates: []
      });
    }
  };

  // Handle single date change
  const handleSingleDateChange = (date) => {
    setDateRange([date, null]);
    if (date) {
      const dateString = formatDateForAPI(date);
      onChange({
        event_start_date: dateString,
        event_end_date: dateString,
        multiple_dates: null
      });
    } else {
      onChange({
        event_start_date: null,
        event_end_date: null,
        multiple_dates: null
      });
    }
  };

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    if (dates[0] && dates[1]) {
      const startDate = formatDateForAPI(dates[0]);
      const endDate = formatDateForAPI(dates[1]);
      
      onChange({
        event_start_date: startDate,
        event_end_date: endDate,
        multiple_dates: null
      });
    } else {
      onChange({
        event_start_date: null,
        event_end_date: null,
        multiple_dates: null
      });
    }
  };

  // Handle multiple dates change
  const handleMultipleDatesChange = (dates) => {
    setMultipleDates(dates);
    const dateStrings = dates.map(formatDateToString).filter(Boolean);  
    
    onChange({
      event_start_date: null,
      event_end_date: null,
      multiple_dates: dateStrings
    });
  };

  // Remove a specific date from multiple dates
  const removeDate = (dateToRemove) => {
    const filteredDates = multipleDates.filter(date => {
      // Handle different date formats for comparison
      const date1 = date instanceof Date ? date : (date && date.toDate ? date.toDate() : new Date(date.year, date.month - 1, date.day));
      const date2 = dateToRemove instanceof Date ? dateToRemove : (dateToRemove && dateToRemove.toDate ? dateToRemove.toDate() : new Date(dateToRemove.year, dateToRemove.month - 1, dateToRemove.day));
      return date1.getTime() !== date2.getTime();
    });
    setMultipleDates(filteredDates);
    const dateStrings = filteredDates.map(formatDateToString).filter(Boolean);
    
    onChange({
      event_start_date: null,
      event_end_date: null,
      multiple_dates: dateStrings
    });
  };

  const formatDate = (date) => {
    let dateObj;
    if (date instanceof Date) {
      dateObj = date;
    } else if (date && date.toDate) {
      dateObj = date.toDate();
    } else if (date && typeof date === 'object' && date.year) {
      dateObj = new Date(date.year, date.month - 1, date.day);
    } else {
      return 'Invalid date';
    }
    
    // Use centralized date formatting utility
    return formatDateShort(dateObj);
  };

  return (
    <div className={styles.dateSelectionContainer}>
      <label className={styles.label}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      
      {/* Schedule Type Selection and Date Picker in Same Row */}
      <div className={styles.dateSelectionRow}>
        <div className={styles.dropdownContainer}>
          <CustomDropdown
            options={scheduleOptions}
            value={scheduleType}
            onChange={handleScheduleTypeChange}
            disabled={disabled}
            placeholder="Select schedule type"
          />
        </div>

        <div className={styles.datePickerContainer}>
          {scheduleType === 'single' && (
            <div className={styles.singleDateContainer}>
              <div className={styles.dateInputWrapper}>
                <FaCalendar className={styles.dateIcon} />
                <DatePicker
                  selected={dateRange[0]}
                  onChange={handleSingleDateChange}
                  dateFormat="MMM dd, yyyy"
                  placeholderText="Select a date"
                  disabled={disabled}
                  isClearable
                  popperPlacement="right"
                />
              </div>
            </div>
          )}

          {scheduleType === 'range' && (
            <div className={styles.dateRangeContainer}>
              <div className={styles.dateInputWrapper}>
                <FaCalendar className={styles.dateIcon} />
                <DatePicker
                  selectsRange={true}
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  onChange={handleDateRangeChange}
                  dateFormat="MMM dd, yyyy"
                  placeholderText="Select start and end dates"
                  disabled={disabled}
                  isClearable
                  popperPlacement="right"
                />
              </div>
            </div>
          )}

          {scheduleType === 'multiple' && (
            <div className={styles.multipleDatesContainer}>
              <div className={styles.dateInputWrapper}>
                <FaCalendar className={styles.dateIcon} />
                <MultiDatePicker
                  value={multipleDates}
                  onChange={handleMultipleDatesChange}
                  format="MMM DD, YYYY"
                  placeholder="Select multiple dates"
                  disabled={disabled}
                  sort
                  hideOnEscape={false}
                  hideOnClickOutside={false}
                  position="right"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Date Display - Below the row */}
      <div className={styles.selectedDateDisplayContainer}>
        {scheduleType === 'single' && dateRange[0] && (
          <div className={styles.selectedDateDisplay}>
            Selected: {formatDate(dateRange[0])}
          </div>
        )}

        {scheduleType === 'range' && dateRange[0] && dateRange[1] && (
          <div className={styles.selectedDateDisplay}>
            {formatDate(dateRange[0])} - {formatDate(dateRange[1])}
          </div>
        )}

        {scheduleType === 'multiple' && multipleDates.length > 0 && (
          <div className={styles.selectedDatesList}>
            <div className={styles.selectedDatesHeader}>
              Selected Dates ({multipleDates.length}):
            </div>
            <div className={styles.selectedDatesGrid}>
              {multipleDates.map((date, index) => (
                <div key={index} className={styles.selectedDateTag}>
                  <span>{formatDate(date)}</span>
                  <button
                    type="button"
                    onClick={() => removeDate(date)}
                    className={styles.removeDateButton}
                    disabled={disabled}
                    title="Remove date"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && <span className={styles.errorText}>{error}</span>}
      
      {/* Helper Text */}
      <div className={styles.helperText}>
        {scheduleType === 'single' && 'Select a single date for your program'}
        {scheduleType === 'range' && 'Select a start and end date for continuous programs'}
        {scheduleType === 'multiple' && 'Select multiple scattered dates for recurring programs'}
      </div>
    </div>
  );
};

export default DateSelectionField;

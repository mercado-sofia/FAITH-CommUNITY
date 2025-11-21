"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, parse, isBefore, startOfDay } from 'date-fns';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import styles from './DatePickerPopover.module.css';

// Custom Dropdown Component
function CustomDropdown({ value, options, onChange, placeholder, className, isYear = false }) {
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

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`${styles.customDropdown} ${className || ''}`} ref={dropdownRef}>
      <button
        type="button"
        className={isYear ? styles.yearDropdownButton : styles.dropdownButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <FaChevronDown className={`${styles.dropdownArrow} ${isOpen ? styles.dropdownArrowOpen : ''}`} />
      </button>
      
      {isOpen && (
        <div className={isYear ? styles.yearDropdownOptions : styles.dropdownOptions} role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${isYear ? styles.yearDropdownOption : styles.dropdownOption} ${value === option.value ? (isYear ? styles.yearDropdownOptionSelected : styles.dropdownOptionSelected) : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={value === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DatePickerPopover({
  value,                 // "yyyy-MM-dd" or "yyyy-MM-ddTHH:mm" string
  onChange,              // (val: "yyyy-MM-dd" or "yyyy-MM-ddTHH:mm") => void
  weekStartsOn = 0,      // 0=Sun, 1=Mon
  minYear = 2000,
  maxYear = 2050,
  placeholder = "Select date",
  showTime = false,      // Enable time selection
  minDate = null         // Minimum selectable date (null = no restriction)
}) {
  // Parse value - could be date-only or datetime
  // IMPORTANT: Parse datetime strings as local time to avoid timezone conversion
  // MySQL DATETIME is timezone-naive, so we treat it as local time
  const parseValue = (str) => {
    if (!str) return null;
    
    // Check if it includes time (T separator)
    if (str.includes('T')) {
      // Parse datetime string as local time (no timezone conversion)
      // Format: yyyy-MM-ddTHH:mm or yyyy-MM-ddTHH:mm:ss
      const match = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
      if (match) {
        const [, year, month, day, hour, minute, second = '00'] = match;
        // Create date in local time (month is 0-indexed in JavaScript Date)
        return new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1,
          parseInt(day, 10),
          parseInt(hour, 10),
          parseInt(minute, 10),
          parseInt(second, 10)
        );
      }
      // Fallback to standard parsing if format doesn't match
      return new Date(str);
    }
    
    // Date only - use date-fns parse which handles local time correctly
    return parse(str, "yyyy-MM-dd", new Date());
  };
  
  const selected = parseValue(value);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected ?? new Date()));
  const [draft, setDraft] = useState(selected ? new Date(selected) : null); // choose first, confirm later
  const [draftTime, setDraftTime] = useState(() => {
    if (selected) {
      const hours = String(selected.getHours()).padStart(2, '0');
      const minutes = String(selected.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '09:00'; // Default to 9:00 AM
  });
  const wrapRef = useRef(null);

  // Sync internal draft state with value prop changes
  useEffect(() => {
    const currentSelected = parseValue(value);
    if (currentSelected) {
      setDraft(new Date(currentSelected));
      const hours = String(currentSelected.getHours()).padStart(2, '0');
      const minutes = String(currentSelected.getMinutes()).padStart(2, '0');
      setDraftTime(`${hours}:${minutes}`);
    } else {
      setDraft(null);
    }
  }, [value]); // Update when value prop changes

  // close on outside click / ESC
  useEffect(() => {
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn });
    return eachDayOfInterval({ start, end });
  }, [viewMonth, weekStartsOn]);

  const monthOptions = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ].map((name, index) => ({ value: index, label: name }));
  
  const yearOptions = Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
    const year = minYear + i;
    return { value: year, label: year.toString() };
  });

  const handleConfirm = () => {
    if (!draft) return;
    
    // Check if selected date is in the past (for scheduling)
    if (minDate && isBefore(startOfDay(draft), startOfDay(minDate))) {
      return; // Don't allow confirming past dates
    }
    
    if (showTime) {
      // Combine date and time
      // IMPORTANT: Extract date components from the original draft (date only) to avoid timezone issues
      // Then use the time string directly without Date object manipulation
      const [hours, minutes] = draftTime.split(':');
      
      // Get date components from the original draft date (before time manipulation)
      // This avoids any timezone/DST issues that might occur with setHours/setMinutes
      const year = draft.getFullYear();
      const month = String(draft.getMonth() + 1).padStart(2, '0');
      const day = String(draft.getDate()).padStart(2, '0');
      
      // Create a Date object for validation only (checking if it's in the past)
      const draftDateTime = new Date(draft);
      draftDateTime.setHours(parseInt(hours, 10));
      draftDateTime.setMinutes(parseInt(minutes, 10));
      draftDateTime.setSeconds(0);
      
      // Check if the combined datetime is in the past
      if (minDate && isBefore(draftDateTime, new Date())) {
        return; // Don't allow confirming past datetime
      }
      
      // Format as datetime: yyyy-MM-ddTHH:mm
      // Use date components from original draft and time from draftTime string
      // This ensures no timezone conversion happens
      const formattedTime = `${hours}:${minutes}`;
      onChange?.(`${year}-${month}-${day}T${formattedTime}`);
    } else {
      // Date only
      onChange?.(format(draft, "yyyy-MM-dd"));
    }
    setOpen(false);
  };

  // Update draft when date changes to preserve time
  const handleDateChange = (date) => {
    if (showTime) {
      // Preserve time when changing date
      const newDate = new Date(date);
      const [hours, minutes] = draftTime.split(':');
      newDate.setHours(parseInt(hours, 10));
      newDate.setMinutes(parseInt(minutes, 10));
      setDraft(newDate);
    } else {
      setDraft(date);
    }
  };

  return (
    <div className={styles.wrapper} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.active : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="3" ry="3" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span>
          {selected 
            ? (showTime 
                ? `${format(selected, "MMM d, yyyy")} at ${format(selected, "h:mm a")}`
                : format(selected, "MMM d, yyyy"))
            : placeholder}
        </span>
      </button>

      {open && (
        <div role="dialog" className={styles.popover}>
          <div className={styles.titleRow}>
            <h4 className={styles.heading}>{showTime ? 'Select Date & Time' : 'Select Date'}</h4>
          </div>

          <div className={styles.controls}>
            <div className={styles.selects}>
              <CustomDropdown
                value={viewMonth.getMonth()}
                options={monthOptions}
                onChange={(monthValue) => {
                  const m = new Date(viewMonth);
                  m.setMonth(monthValue);
                  setViewMonth(startOfMonth(m));
                }}
                placeholder="Month"
              />
              
              <CustomDropdown
                value={viewMonth.getFullYear()}
                options={yearOptions}
                onChange={(yearValue) => {
                  const y = new Date(viewMonth);
                  y.setFullYear(yearValue);
                  setViewMonth(startOfMonth(y));
                }}
                placeholder="Year"
                isYear={true}
              />
            </div>
          </div>

          <div className={styles.weekdays}>
            {["SUN","MON","TUE","WED","THU","FRI","SAT"]
              .slice(weekStartsOn)
              .concat(["SUN","MON","TUE","WED","THU","FRI","SAT"].slice(0,weekStartsOn))
              .map((w, i) => (
                <div key={w} className={`${styles.weekday} ${i===0 ? styles.sun : ""}`}>{w}</div>
              ))}
          </div>

          <div className={styles.grid} role="grid" aria-label="Calendar">
            {days.map((d, i) => {
              const outside = !isSameMonth(d, viewMonth);
              const sel = draft && isSameDay(d, draft);
              const today = isToday(d);
              // Check if date is in the past (disabled)
              // Only disable dates that are strictly BEFORE minDate (not including today)
              const minDateStart = minDate ? startOfDay(minDate) : null;
              const dayStart = startOfDay(d);
              const isPast = minDateStart ? isBefore(dayStart, minDateStart) : false;
              const isDisabled = isPast && !outside;
              
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  className={`${styles.day} ${
                    outside ? styles.outside : ''
                  } ${
                    sel ? styles.selected : ''
                  } ${
                    today ? styles.today : ''
                  } ${
                    isDisabled ? styles.disabled : ''
                  }`.trim()}
                  onClick={() => !isDisabled && handleDateChange(d)}
                  disabled={isDisabled}
                  aria-label={format(d, "PPP")}
                  aria-disabled={isDisabled}
                >
                  {format(d, "dd")}
                </button>
              );
            })}
          </div>

          {showTime && (
            <div className={styles.timeSection}>
              <label className={styles.timeLabel}>Time</label>
              <input
                type="time"
                value={draftTime}
                onChange={(e) => {
                  setDraftTime(e.target.value);
                  // Update draft to include new time
                  if (draft) {
                    const [hours, minutes] = e.target.value.split(':');
                    const newDraft = new Date(draft);
                    newDraft.setHours(parseInt(hours, 10));
                    newDraft.setMinutes(parseInt(minutes, 10));
                    setDraft(newDraft);
                  }
                }}
                className={styles.timeInput}
                step="60"
                min={minDate && draft && isSameDay(draft, new Date()) ? format(new Date(), 'HH:mm') : undefined}
              />
              {minDate && draft && isSameDay(draft, new Date()) && (
                <p className={styles.timeHint}>Please select a time in the future</p>
              )}
            </div>
          )}

          <div className={styles.footer}>
            <button 
              type="button" 
              className={styles.confirm} 
              onClick={handleConfirm} 
              disabled={(() => {
                if (!draft) return true;
                // Check if date is in the past
                if (minDate && isBefore(startOfDay(draft), startOfDay(minDate))) return true;
                // If showTime is enabled, check if datetime is in the past
                if (showTime && minDate) {
                  const [hours, minutes] = draftTime.split(':');
                  const draftDateTime = new Date(draft);
                  draftDateTime.setHours(parseInt(hours, 10));
                  draftDateTime.setMinutes(parseInt(minutes, 10));
                  if (isBefore(draftDateTime, new Date())) return true;
                }
                return false;
              })()}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { FaCalendarAlt, FaClock } from 'react-icons/fa';
import styles from './DateTimePicker.module.css';
import { formatDateTimeForInput, getCurrentDateTimeISO } from '@/utils/dateUtils';

export default function DateTimePicker({
  value,                 // "yyyy-MM-ddTHH:mm" string
  onChange,              // (val: "yyyy-MM-ddTHH:mm") => void
  placeholder = "Select date and time",
  min = null,            // Minimum datetime (ISO string)
  max = null             // Maximum datetime (ISO string)
}) {
  const [open, setOpen] = useState(false);
  const [dateValue, setDateValue] = useState(value || getCurrentDateTimeISO());
  const [timeValue, setTimeValue] = useState(() => {
    if (value) {
      const date = new Date(value);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const wrapRef = useRef(null);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const formatted = formatDateTimeForInput(value);
      if (formatted) {
        setDateValue(formatted.split('T')[0]);
        const timePart = formatted.split('T')[1];
        if (timePart) {
          setTimeValue(timePart);
        }
      }
    }
  }, [value]);

  // Close on outside click / ESC
  useEffect(() => {
    const onDoc = (e) => { 
      if (!wrapRef.current?.contains(e.target)) setOpen(false); 
    };
    const onKey = (e) => { 
      if (e.key === "Escape") setOpen(false); 
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setDateValue(newDate);
    updateValue(newDate, timeValue);
  };

  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
    updateValue(dateValue, newTime);
  };

  const updateValue = (date, time) => {
    if (date && time) {
      const datetimeString = `${date}T${time}`;
      onChange?.(datetimeString);
    }
  };

  const handleConfirm = () => {
    if (dateValue && timeValue) {
      const datetimeString = `${dateValue}T${timeValue}`;
      onChange?.(datetimeString);
      setOpen(false);
    }
  };

  const displayValue = () => {
    if (!value) return placeholder;
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return placeholder;
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return placeholder;
    }
  };

  // Get min/max attributes for inputs
  const getMinMaxDate = () => {
    const attrs = {};
    if (min) {
      const minDate = new Date(min);
      if (!isNaN(minDate.getTime())) {
        attrs.min = formatDateTimeForInput(min);
      }
    }
    if (max) {
      const maxDate = new Date(max);
      if (!isNaN(maxDate.getTime())) {
        attrs.max = formatDateTimeForInput(max);
      }
    }
    return attrs;
  };

  const minMaxAttrs = getMinMaxDate();

  return (
    <div className={styles.wrapper} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.active : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <FaCalendarAlt className={styles.icon} />
        <span>{displayValue()}</span>
      </button>

      {open && (
        <div role="dialog" className={styles.popover}>
          <div className={styles.titleRow}>
            <h4 className={styles.heading}>Select Date & Time</h4>
          </div>

          <div className={styles.inputsContainer}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <FaCalendarAlt className={styles.labelIcon} />
                Date
              </label>
              <input
                type="date"
                value={dateValue}
                onChange={handleDateChange}
                className={styles.input}
                {...minMaxAttrs}
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <FaClock className={styles.labelIcon} />
                Time
              </label>
              <input
                type="time"
                value={timeValue}
                onChange={handleTimeChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button 
              type="button" 
              className={styles.confirm} 
              onClick={handleConfirm} 
              disabled={!dateValue || !timeValue}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


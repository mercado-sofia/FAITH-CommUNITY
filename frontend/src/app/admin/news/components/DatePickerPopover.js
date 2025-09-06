"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, parse } from 'date-fns';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import styles from './styles/DatePickerPopover.module.css';

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
  value,                 // "yyyy-MM-dd" string
  onChange,              // (val: "yyyy-MM-dd") => void
  weekStartsOn = 0,      // 0=Sun, 1=Mon
  minYear = 2000,
  maxYear = 2050,
  placeholder = "Select date"
}) {
  const toDate = (str) => str ? parse(str, "yyyy-MM-dd", new Date()) : null;
  const selected = toDate(value);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(startOfMonth(selected ?? new Date()));
  const [draft, setDraft] = useState(selected); // choose first, confirm later
  const wrapRef = useRef(null);

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
    onChange?.(format(draft, "yyyy-MM-dd"));
    setOpen(false);
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
        <span>{selected ? format(selected, "MMM d, yyyy") : placeholder}</span>
      </button>

      {open && (
        <div role="dialog" className={styles.popover}>
          <div className={styles.titleRow}>
            <h4 className={styles.heading}>Select Date</h4>
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
                  }`.trim()}
                  onClick={() => setDraft(d)}
                  aria-label={format(d, "PPP")}
                >
                  {format(d, "dd")}
                </button>
              );
            })}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.confirm} onClick={handleConfirm} disabled={!draft}>
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
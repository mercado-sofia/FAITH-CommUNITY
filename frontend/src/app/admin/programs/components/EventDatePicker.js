'use client';

import { useState } from 'react';
import CustomDatePicker from './CustomDatePicker';
import styles from './styles/DateSelectionField.module.css'; // reuse your existing styles

const scheduleOptions = [
  { value: 'single', label: 'Single Day' },
  { value: 'range', label: 'Date Range' },
  { value: 'multiple', label: 'Multiple Dates' },
];

// helper: Date -> 'YYYY-MM-DD'
const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function EventDatePicker({ defaultValue, onSave, disabled }) {
  // determine initial mode from defaultValue (if any)
  const inferMode = () => {
    if (defaultValue?.multiple_dates?.length) return 'multiple';
    if (defaultValue?.event_start_date && defaultValue?.event_end_date) {
      return defaultValue.event_start_date === defaultValue.event_end_date ? 'single' : 'range';
    }
    return 'single';
  };

  const [mode, setMode] = useState(inferMode());
  const [open, setOpen] = useState(false);

  // local value state per mode
  const [single, setSingle] = useState(
    defaultValue?.event_start_date && defaultValue?.event_end_date &&
    defaultValue.event_start_date === defaultValue.event_end_date
      ? new Date(defaultValue.event_start_date)
      : null
  );

  const [range, setRange] = useState(() => {
    if (defaultValue?.event_start_date && defaultValue?.event_end_date &&
        defaultValue.event_start_date !== defaultValue.event_end_date) {
      return {
        from: new Date(defaultValue.event_start_date),
        to: new Date(defaultValue.event_end_date)
      };
    }
    return { from: undefined, to: undefined };
  });

  const [multiple, setMultiple] = useState(
    Array.isArray(defaultValue?.multiple_dates)
      ? defaultValue.multiple_dates.map((d) => new Date(d))
      : []
  );

  // when mode changes, clear others
  const handleModeChange = (next) => {
    setMode(next);
    setOpen(true); // open calendar when they switch
  };

  // pass through changes from CustomDatePicker
  const handlePick = (val) => {
    if (mode === 'single') setSingle(val || null);
    else if (mode === 'range') setRange(val || { from: undefined, to: undefined });
    else setMultiple(Array.isArray(val) ? val : []);
  };

  // normalize and save
  const handleSave = () => {
    let payload;
    if (mode === 'single') {
      if (!single) return;
      const d = toISO(single);
      payload = { event_start_date: d, event_end_date: d, multiple_dates: null };
    } else if (mode === 'range') {
      const { from, to } = range || {};
      if (!from || !to) return;
      payload = { event_start_date: toISO(from), event_end_date: toISO(to), multiple_dates: null };
    } else {
      if (!multiple.length) return;
      payload = { event_start_date: null, event_end_date: null, multiple_dates: multiple.map(toISO) };
    }
    onSave?.(payload);
    setOpen(false);
  };

  // what value to feed DayPicker
  const currentValue =
    mode === 'single' ? single :
    mode === 'range'  ? range  :
    multiple;

  return (
    <div className={styles.dateSelectionContainer}>
      <label className={styles.label}>Event Dates <span className={styles.required}>*</span></label>

      {/* Mode selector + open button */}
      <div className={styles.dateSelectionRow} style={{ gap: 12 }}>
        <select
          className={styles.dropdownButton}
          value={mode}
          onChange={(e) => handleModeChange(e.target.value)}
          disabled={disabled}
          aria-label="Select schedule type"
          style={{ minWidth: 160 }}
        >
          {scheduleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <button
          type="button"
          className={styles.dropdownButton}
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-label="Select date(s)"
        >
          Select date(s)
        </button>
      </div>

      {/* The calendar (opens as modal from the picker itself) */}
      <div style={{ marginTop: 10 }}>
        <CustomDatePicker
          mode={mode}
          value={currentValue}
          onChange={handlePick}
          minDate={new Date()}
          open={open}
          onOpenChange={setOpen}
        />
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          className={styles.dropdownButton}
          onClick={handleSave}
          disabled={disabled}
        >
          Save dates
        </button>

        <button
          type="button"
          className={styles.dropdownButton}
          onClick={() => setOpen(false)}
          disabled={disabled}
        >
          Close
        </button>
      </div>
    </div>
  );
}
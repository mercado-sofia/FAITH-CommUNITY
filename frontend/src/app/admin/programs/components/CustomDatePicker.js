'use client';

import DatePicker from 'react-datepicker';
import MultiDatePicker from 'react-multi-date-picker';
import 'react-datepicker/dist/react-datepicker.css';
import './styles/datePickerOverrides.css';

export default function CustomDatePicker({
  mode = 'single',
  value,
  onChange,
  minDate,
  open,
  onOpenChange
}) {
  if (!open) return null;

  const handleSingle = (date) => {
    onChange?.(date || null);
  };

  const handleRange = (dates) => {
    const [start, end] = dates || [];
    onChange?.({ from: start || undefined, to: end || undefined });
  };

  const handleMultiple = (dates) => {
    if (Array.isArray(dates)) {
      const normalized = dates.map((d) => (d && typeof d.toDate === 'function' ? d.toDate() : d));
      onChange?.(normalized);
    } else {
      onChange?.([]);
    }
  };

  return (
    <div style={{ display: 'inline-block' }}>
      {mode === 'single' && (
        <DatePicker
          selected={value || null}
          onChange={handleSingle}
          minDate={minDate}
          inline
        />
      )}

      {mode === 'range' && (
        <DatePicker
          selectsRange
          startDate={value?.from || null}
          endDate={value?.to || null}
          onChange={handleRange}
          minDate={minDate}
          inline
        />
      )}

      {mode === 'multiple' && (
        <MultiDatePicker
          value={value || []}
          onChange={handleMultiple}
          minDate={minDate}
          sort
          multiple
          portal
        />
      )}
    </div>
  );
}



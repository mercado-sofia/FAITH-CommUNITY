# Date Selection Feature for Admin Programs

## Overview
This feature allows admins to set flexible date schedules for programs in the admin panel. It supports three types of date configurations:

1. **Single Day Programs** - One specific date
2. **Date Range Programs** - Continuous multi-day programs
3. **Multiple Scattered Dates** - Non-consecutive dates for recurring programs

## Components

### DateSelectionField.js
A reusable React component that handles all three date selection types.

**Features:**
- Toggle between Single Day, Date Range, and Multiple Dates
- Real-time validation and error handling
- Responsive design
- Accessible UI with proper labels and helper text

**Props:**
- `value` - Object containing date data
- `onChange` - Callback function for date changes
- `error` - Error message to display
- `disabled` - Whether the field is disabled
- `label` - Field label text
- `required` - Whether the field is required

**Output Format:**
```javascript
// Single Day or Date Range
{
  event_start_date: "2024-01-15",
  event_end_date: "2024-01-15", // Same as start for single day
  multiple_dates: null
}

// Multiple Scattered Dates
{
  event_start_date: null,
  event_end_date: null,
  multiple_dates: ["2024-01-15", "2024-01-20", "2024-02-05"]
}
```

## Integration

### AddProgramModal.js
- Added date selection field to the form
- Updated form validation to require at least one date
- Integrated with existing form submission logic

### EditProgramModal.js
- Added date selection field for editing existing programs
- Updated change detection to include date fields
- Maintains existing unsaved changes warning

### ProgramCard.js
- Updated to display formatted date information
- Shows different formats based on date type:
  - Single day: "Jan 15, 2024"
  - Date range: "Jan 15, 2024 - Jan 20, 2024"
  - Multiple dates: "Jan 15, 2024 +2 more"

## Styling

### DateSelectionField.module.css
Comprehensive CSS module with:
- Modern, consistent design matching admin panel theme
- Responsive layout for mobile devices
- Custom styling for third-party date picker components
- Hover and focus states
- Error and success states

## Dependencies

### Required Packages
- `react-datepicker` - For single day and date range selection
- `react-multi-date-picker` - For multiple scattered dates
- `dayjs` - For date manipulation (already included)

### Installation
```bash
npm install react-datepicker react-multi-date-picker
```

## Usage Example

```javascript
import DateSelectionField from './DateSelectionField';

const [dateData, setDateData] = useState({
  event_start_date: null,
  event_end_date: null,
  multiple_dates: null
});

const handleDateChange = (newDateData) => {
  setDateData(newDateData);
};

<DateSelectionField
  value={dateData}
  onChange={handleDateChange}
  error={errors.dates}
  disabled={isSubmitting}
  label="Event Dates"
  required={true}
/>
```

## Backend Integration

The component outputs data in the following format for backend processing:

### Database Schema
```sql
-- For single day and date range programs
event_start_date DATE,
event_end_date DATE,

-- For multiple scattered dates (separate table)
CREATE TABLE program_event_dates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  program_id INT,
  event_date DATE,
  FOREIGN KEY (program_id) REFERENCES programs(id)
);
```

### API Payload Example
```javascript
{
  title: "Community Outreach",
  description: "Helping local communities",
  category: "Outreach",
  status: "upcoming",
  event_start_date: "2024-01-15",
  event_end_date: "2024-01-20",
  multiple_dates: null
}
```

## Validation Rules

1. **Required Field** - At least one date must be selected
2. **Future Dates Only** - All dates must be in the future
3. **Date Range Logic** - End date must be after start date
4. **Multiple Dates** - Must have at least one date selected

## Accessibility Features

- Proper ARIA labels and descriptions
- Keyboard navigation support
- Screen reader friendly
- High contrast color scheme
- Focus indicators

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive design
- Touch-friendly interface
- Progressive enhancement

## Future Enhancements

1. **Time Selection** - Add time picker for specific event times
2. **Recurring Patterns** - Weekly, monthly recurring schedules
3. **Calendar View** - Visual calendar for date selection
4. **Date Conflicts** - Check for overlapping program dates
5. **Timezone Support** - Handle different timezones

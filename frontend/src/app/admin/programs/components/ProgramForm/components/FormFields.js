'use client';

import React from 'react';
import DateSelectionField from '../../DatePicker/DateSelectionField';
import styles from '../ProgramForm.module.css';

const FormFields = ({
  formData,
  errors,
  isEditMode,
  onFormDataChange,
  onClearError
}) => {
  return (
    <>
      {/* Title Field */}
      <div className={styles.fieldSpacing}>
        <label className={styles.label}>
          Program Title
        </label>
        <input
          type="text"
          className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
          value={formData.title}
          onChange={(e) => {
            onFormDataChange({ title: e.target.value });
            if (errors.title) onClearError('title');
          }}
          placeholder="Enter program title"
        />
        {errors.title && <span className={styles.errorText}>{errors.title}</span>}
      </div>

      {/* Description Field */}
      <div className={styles.fieldSpacing}>
        <label className={styles.label}>
          Description
        </label>
        <textarea
          className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
          value={formData.description}
          onChange={(e) => {
            onFormDataChange({ description: e.target.value });
            if (errors.description) onClearError('description');
          }}
          placeholder="Enter program description"
          rows={4}
        />
        {errors.description && <span className={styles.errorText}>{errors.description}</span>}
      </div>

      {/* Category Field */}
      <div className={styles.fieldSpacing}>
        <label className={styles.label}>
          Category
        </label>
        <input
          type="text"
          className={`${styles.input} ${errors.category ? styles.inputError : ''}`}
          value={formData.category}
          onChange={(e) => {
            onFormDataChange({ category: e.target.value });
            if (errors.category) onClearError('category');
          }}
          placeholder="Enter program category"
        />
        {errors.category && <span className={styles.errorText}>{errors.category}</span>}
      </div>

      {/* Date Selection */}
      <div className={styles.fieldSpacing}>
        <DateSelectionField
          value={{
            event_start_date: formData.event_start_date,
            event_end_date: formData.event_end_date,
            multiple_dates: formData.multiple_dates
          }}
          onChange={(dateData) => {
            onFormDataChange(dateData);
            // Clear any date-related errors when date changes
            if (errors.event_start_date) onClearError('event_start_date');
            if (errors.event_end_date) onClearError('event_end_date');
            if (errors.multiple_dates) onClearError('multiple_dates');
          }}
          error={errors.event_start_date || errors.event_end_date || errors.multiple_dates}
          required={false}
        />
      </div>

      {/* Volunteer Acceptance Toggle */}
      <div className={styles.fieldSpacing}>
        <label className={styles.label}>
          Volunteer Applications
        </label>
        <div className={styles.toggleContainer}>
          <div className={styles.toggleWrapper}>
            <input
              type="checkbox"
              id="accepts_volunteers"
              className={styles.toggleInput}
              checked={formData.accepts_volunteers}
              onChange={(e) => {
                onFormDataChange({ accepts_volunteers: e.target.checked });
                if (errors.accepts_volunteers) onClearError('accepts_volunteers');
              }}
            />
            <label htmlFor="accepts_volunteers" className={styles.toggleLabel}>
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
          <div className={styles.toggleText}>
            <span className={formData.accepts_volunteers ? styles.toggleTextActive : styles.toggleTextInactive}>
              {formData.accepts_volunteers ? 'Accepting volunteer applications' : 'Not accepting volunteer applications'}
            </span>
            <p className={styles.toggleDescription}>
              {formData.accepts_volunteers 
                ? 'Public users can apply to volunteer for this program'
                : 'Public users cannot apply to volunteer for this program'
              }
            </p>
          </div>
        </div>
        {errors.accepts_volunteers && <span className={styles.errorText}>{errors.accepts_volunteers}</span>}
      </div>
    </>
  );
};

export default FormFields;

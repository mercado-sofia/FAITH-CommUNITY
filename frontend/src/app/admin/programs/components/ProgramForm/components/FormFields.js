'use client';

import { useMemo } from 'react';
import DateSelectionField from '../../DatePicker/DateSelectionField';
import styles from '../ProgramForm.module.css';

const FormFields = ({
  formData,
  errors,
  isEditMode,
  onFormDataChange,
  onClearError,
  postActReportFile,
  onPostActReportChange
}) => {
  // Check if event date is in the past (only for create mode)
  const isEventDateInPast = useMemo(() => {
    if (isEditMode) return false; // Don't show in edit mode
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check multiple dates
    if (formData.multiple_dates && Array.isArray(formData.multiple_dates) && formData.multiple_dates.length > 0) {
      const dates = formData.multiple_dates.map(dateStr => new Date(dateStr));
      const latestDate = dates.sort((a, b) => b - a)[0];
      latestDate.setHours(0, 0, 0, 0);
      return latestDate < today;
    }
    
    // Check date range or single date
    if (formData.event_end_date) {
      const endDate = new Date(formData.event_end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate < today;
    }
    
    if (formData.event_start_date) {
      const startDate = new Date(formData.event_start_date);
      startDate.setHours(0, 0, 0, 0);
      return startDate < today;
    }
    
    return false;
  }, [formData.event_start_date, formData.event_end_date, formData.multiple_dates, isEditMode]);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (onPostActReportChange) {
      onPostActReportChange(file);
    }
    if (errors.postActReport) {
      onClearError('postActReport');
    }
  };

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
            // Clear post-act report file and error if date changes to future
            // Check if the new date is in the future
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let newDateIsInPast = false;
            
            if (dateData.multiple_dates && Array.isArray(dateData.multiple_dates) && dateData.multiple_dates.length > 0) {
              const dates = dateData.multiple_dates.map(dateStr => new Date(dateStr));
              const latestDate = dates.sort((a, b) => b - a)[0];
              latestDate.setHours(0, 0, 0, 0);
              newDateIsInPast = latestDate < today;
            } else if (dateData.event_end_date) {
              const endDate = new Date(dateData.event_end_date);
              endDate.setHours(0, 0, 0, 0);
              newDateIsInPast = endDate < today;
            } else if (dateData.event_start_date) {
              const startDate = new Date(dateData.event_start_date);
              startDate.setHours(0, 0, 0, 0);
              newDateIsInPast = startDate < today;
            }
            
            // If date is no longer in the past, clear the post-act report file
            if (!newDateIsInPast && onPostActReportChange) {
              onPostActReportChange(null);
            }
            if (errors.postActReport) onClearError('postActReport');
          }}
          error={errors.event_start_date || errors.event_end_date || errors.multiple_dates}
          required={false}
        />
      </div>

      {/* Post Act Report Field - Only show if event date is in the past (create mode only) */}
      {isEventDateInPast && !isEditMode && (
        <div className={styles.fieldSpacing}>
          <label className={styles.label}>
            Post Act Report <span className={styles.required}>*</span>
          </label>
          <div className={styles.uploadField}>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
              onChange={handleFileChange}
              className={errors.postActReport ? styles.inputError : ''}
            />
            <div className={styles.uploadHint}>
              Allowed: PDF, JPG, PNG, WEBP, HEIC, DOC, DOCX
            </div>
            {postActReportFile && (
              <div className={styles.uploadedFileInfo}>
                <span className={styles.fileName}>{postActReportFile.name}</span>
                <span className={styles.fileSize}>
                  ({(postActReportFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>
          {errors.postActReport && <span className={styles.errorText}>{errors.postActReport}</span>}
        </div>
      )}

    </>
  );
};

export default FormFields;

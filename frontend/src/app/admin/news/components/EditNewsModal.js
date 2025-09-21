'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaCalendar } from 'react-icons/fa';
import { formatDateForInput } from '@/utils/dateUtils.js';
import styles from './styles/EditNewsModal.module.css';

const EditNewsModal = ({ news, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    date: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (news) {
      setFormData({
        id: news.id || '',
        title: news.title || '',
        description: news.description || '',
        date: formatDateForInput(news.date)
      });
    }
  }, [news]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters long';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error updating news:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!news) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit News</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="date" className={styles.label}>
              Date *
            </label>
            <div className={styles.dateInputContainer}>
              <FaCalendar className={styles.dateIcon} />
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className={`${styles.input} ${styles.dateInput} ${errors.date ? styles.error : ''}`}
                disabled={isSubmitting}
              />
            </div>
            {errors.date && <span className={styles.errorText}>{errors.date}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.title ? styles.error : ''}`}
              placeholder="Enter news title"
              disabled={isSubmitting}
            />
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`${styles.textarea} ${errors.description ? styles.error : ''}`}
              placeholder="Enter news description"
              rows={10}
              disabled={isSubmitting}
            />
            {errors.description && <span className={styles.errorText}>{errors.description}</span>}
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.spinner}></div>
                  Updating...
                </>
              ) : (
                <>
                  Update News
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNewsModal;

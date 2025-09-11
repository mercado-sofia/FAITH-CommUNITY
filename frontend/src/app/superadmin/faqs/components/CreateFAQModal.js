'use client';

import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import styles from './styles/CreateFAQModal.module.css';

export default function CreateFAQModal({ isOpen, onClose, onCreate, isCreating, initialData = null }) {
  const isEditing = !!initialData;
  
  const [form, setForm] = useState({
    question: '',
    answer: ''
  });

  // Update form when initialData changes
  React.useEffect(() => {
    if (initialData) {
      setForm({
        question: initialData.question || '',
        answer: initialData.answer || ''
      });
    } else {
      setForm({
        question: '',
        answer: ''
      });
    }
  }, [initialData]);

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
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
    
    if (!form.question.trim()) {
      newErrors.question = 'Question is required';
    } else if (form.question.trim().length < 10) {
      newErrors.question = 'Question must be at least 10 characters long';
    }
    
    if (!form.answer.trim()) {
      newErrors.answer = 'Answer is required';
    } else if (form.answer.trim().length < 20) {
      newErrors.answer = 'Answer must be at least 20 characters long';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const formData = isEditing ? { id: initialData.id, ...form } : form;
      onCreate(formData);
      // Reset form
      setForm({
        question: '',
        answer: ''
      });
      setErrors({});
    }
  };

  const handleClose = () => {
    setForm({
      question: '',
      answer: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEditing ? 'Edit FAQ' : 'Create New FAQ'}</h2>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            disabled={isCreating}
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formField}>
            <label htmlFor="question" className={styles.label}>
              Question *
            </label>
            <textarea
              id="question"
              name="question"
              value={form.question}
              onChange={handleInputChange}
              placeholder="Enter the FAQ question..."
              className={`${styles.textarea} ${errors.question ? styles.error : ''}`}
              rows={3}
              disabled={isCreating}
            />
            {errors.question && (
              <span className={styles.errorText}>{errors.question}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label htmlFor="answer" className={styles.label}>
              Answer *
            </label>
            <textarea
              id="answer"
              name="answer"
              value={form.answer}
              onChange={handleInputChange}
              placeholder="Enter the FAQ answer..."
              className={`${styles.textarea} ${errors.answer ? styles.error : ''}`}
              rows={5}
              disabled={isCreating}
            />
            {errors.answer && (
              <span className={styles.errorText}>{errors.answer}</span>
            )}
          </div>


          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleClose}
              className={`${styles.button} ${styles.cancelButton}`}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.submitButton}`}
              disabled={isCreating}
            >
              {isCreating ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update FAQ' : 'Create FAQ')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

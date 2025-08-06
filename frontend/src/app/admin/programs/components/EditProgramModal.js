'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FaTimes, FaUpload, FaImage } from 'react-icons/fa';
import styles from './styles/addModal.module.css';

const EditProgramModal = ({ program, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: program?.title || '',
    description: program?.description || '',
    category: program?.category || '',
    status: program?.status || 'active',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(program?.image || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef(null);



  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'planned', label: 'Planned' }
  ];

  // Check for changes
  useEffect(() => {
    const hasFormChanges = 
      formData.title !== (program?.title || '') ||
      formData.description !== (program?.description || '') ||
      formData.category !== (program?.category || '') ||
      formData.status !== (program?.status || 'active') ||
      formData.image !== null;
    
    setHasChanges(hasFormChanges);
  }, [formData, program]);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          image: 'Please select a valid image file'
        }));
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          image: 'Image size should be less than 5MB'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);

      // Clear image error
      if (errors.image) {
        setErrors(prev => ({
          ...prev,
          image: ''
        }));
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Program title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Program description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Program category is required';
    } else if (formData.category.length < 2) {
      newErrors.category = 'Category must be at least 2 characters long';
    }



    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!hasChanges) {
      setErrors({ submit: 'No changes detected. Please make some changes before submitting.' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create the program data object
      const programData = {
        id: program.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        status: formData.status,

        image: formData.image ? await convertImageToBase64(formData.image) : imagePreview
      };

      await onSubmit(programData);
    } catch (error) {
      console.error('Error updating program:', error);
      setErrors({ submit: 'Failed to update program. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Program</h2>
          <button onClick={handleClose} className={styles.closeButton}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {/* Title Field */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Program Title <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`${styles.formInput} ${errors.title ? styles.error : ''}`}
              placeholder="Enter program title"
              maxLength={100}
            />
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>

          {/* Description Field */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Description <span className={styles.required}>*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={`${styles.formTextarea} ${errors.description ? styles.error : ''}`}
              placeholder="Describe your program, its objectives, and impact"
              rows={4}
              maxLength={500}
            />
            <div className={styles.charCount}>
              {formData.description.length}/500 characters
            </div>
            {errors.description && <span className={styles.errorText}>{errors.description}</span>}
          </div>

          {/* Category and Status Row */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={styles.formInput}
                placeholder="e.g. Outreach, Education, Health, Community Development"
                maxLength={50}
              />
              {errors.category && <span className={styles.errorText}>{errors.category}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className={styles.formSelect}
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>



          {/* Image Upload */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <FaImage className={styles.labelIcon} />
              Program Image
            </label>
            
            {!imagePreview ? (
              <div className={styles.uploadArea}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={styles.fileInput}
                />
                <div className={styles.uploadContent}>
                  <FaUpload className={styles.uploadIcon} />
                  <p className={styles.uploadText}>
                    Click to upload an image or drag and drop
                  </p>
                  <p className={styles.uploadSubtext}>
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              </div>
            ) : (
              <div className={styles.imagePreview}>
                <Image 
                  src={imagePreview} 
                  alt="Preview" 
                  className={styles.previewImage}
                  width={400}
                  height={200}
                  style={{ objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className={styles.removeImageButton}
                >
                  <FaTimes />
                </button>
              </div>
            )}
            
            {errors.image && <span className={styles.errorText}>{errors.image}</span>}
          </div>

          {/* Changes Indicator */}
          {hasChanges && (
            <div className={styles.changesIndicator}>
              <span className={styles.changesText}>
                ⚠️ You have unsaved changes
              </span>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className={styles.submitError}>
              {errors.submit}
            </div>
          )}

          {/* Form Actions */}
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
              className={`${styles.submitButton} ${!hasChanges ? styles.disabled : ''}`}
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting ? 'Updating...' : 'Update Program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProgramModal;

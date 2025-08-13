'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { FaTimes, FaUpload, FaImage, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import DateSelectionField from './DateSelectionField';
import styles from './styles/addModal.module.css';

const AddProgramModal = ({ onClose, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    status: '',
    image: null,
    additionalImages: [],
    event_start_date: null,
    event_end_date: null,
    multiple_dates: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const additionalImagesRef = useRef(null);

  const statusOptions = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
  ];

  const steps = [
    { id: 1, title: 'Basic Info' },
    { id: 2, title: 'Status & Date' },
    { id: 3, title: 'Images' }
  ];

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

  const handleDateChange = (dateData) => {
    setFormData(prev => ({
      ...prev,
      ...dateData
    }));
    
    // Clear date-related errors
    if (errors.event_start_date || errors.event_end_date || errors.multiple_dates) {
      setErrors(prev => ({
        ...prev,
        event_start_date: '',
        event_end_date: '',
        multiple_dates: ''
      }));
    }
  };

  const handleStatusChange = (status) => {
    setFormData(prev => ({
      ...prev,
      status: status
    }));
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

  const handleAdditionalImagesChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    const newPreviews = [];

    files.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return;
      }

      validFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target.result);
        if (newPreviews.length === validFiles.length) {
          setAdditionalImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setFormData(prev => ({
      ...prev,
      additionalImages: [...prev.additionalImages, ...validFiles]
    }));
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

  const removeAdditionalImage = (index) => {
    setFormData(prev => ({
      ...prev,
      additionalImages: prev.additionalImages.filter((_, i) => i !== index)
    }));
    setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          newErrors.title = 'Program title is required';
        } else if (formData.title.length < 3) {
          newErrors.title = 'Title must be at least 3 characters long';
        } else if (formData.title.length > 100) {
          newErrors.title = 'Title must be less than 100 characters';
        }

        if (!formData.description.trim()) {
          newErrors.description = 'Program description is required';
        } else if (formData.description.length < 10) {
          newErrors.description = 'Description must be at least 10 characters long';
        } else if (formData.description.length > 800) {
          newErrors.description = 'Description must be less than 800 characters';
        }

        if (!formData.category.trim()) {
          newErrors.category = 'Program category is required';
        } else if (formData.category.length < 2) {
          newErrors.category = 'Category must be at least 2 characters long';
        } else if (formData.category.length > 50) {
          newErrors.category = 'Category must be less than 50 characters';
        }
        break;

      case 2:
        // Validate status
        if (!formData.status) {
          newErrors.status = 'Program status is required';
        }

        // Validate dates
        const hasSingleOrRangeDates = formData.event_start_date && formData.event_end_date;
        const hasMultipleDates = formData.multiple_dates && Array.isArray(formData.multiple_dates) && formData.multiple_dates.length > 0;
        
        if (!hasSingleOrRangeDates && !hasMultipleDates) {
          newErrors.event_start_date = 'Please select at least one date for the program';
        }
        break;

      case 3:
        if (!formData.image) {
          newErrors.image = 'Program image is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateForm = () => {
    return validateStep(1) && validateStep(2) && validateStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Convert images to base64
      const imageBase64 = formData.image ? await convertImageToBase64(formData.image) : null;
      const additionalImagesBase64 = await Promise.all(
        formData.additionalImages.map(img => convertImageToBase64(img))
      );

      // Create the program data object
      const programData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        status: formData.status,
        image: imageBase64,
        additionalImages: additionalImagesBase64,
        event_start_date: formData.event_start_date,
        event_end_date: formData.event_end_date,
        multiple_dates: formData.multiple_dates
      };

      await onSubmit(programData);
    } catch (error) {
      console.error('Error submitting program:', error);
      setErrors({ submit: 'Failed to submit program. Please try again.' });
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

  const renderStepIndicator = () => (
    <div className={styles.stepIndicator}>
      {steps.map((step, index) => (
        <div key={step.id} className={styles.stepItem}>
          <div className={`${styles.stepNumber} ${currentStep >= step.id ? styles.active : ''}`}></div>
          <span className={`${styles.stepTitle} ${currentStep >= step.id ? styles.active : ''}`}>
            {step.title}
          </span>
          {index < steps.length - 1 && (
            <div className={`${styles.stepConnector} ${currentStep > step.id ? styles.active : ''}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className={styles.stepContainer}>
      <h3 className={styles.stepTitle}>Basic Information</h3>
      
      {/* Title and Category Row */}
      <div className={styles.formRow}>
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

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Category</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className={styles.formInput}
            placeholder="e.g. Outreach, Education, Health"
            maxLength={50}
          />
          {errors.category && <span className={styles.errorText}>{errors.category}</span>}
        </div>
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
          maxLength={800}
        />
        <div className={styles.charCount}>
          {formData.description.length}/800 characters
        </div>
        {errors.description && <span className={styles.errorText}>{errors.description}</span>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className={styles.stepContainer}>
      <h3 className={styles.stepTitle}>Status & Event Date</h3>
      
      {/* Status Field */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Status <span className={styles.required}>*</span></label>
        <div className={styles.statusButtons}>
          {statusOptions.map(status => (
            <button
              key={status.value}
              type="button"
              onClick={() => handleStatusChange(status.value)}
              className={`${styles.statusButton} ${formData.status === status.value ? styles.statusActive : ''}`}
            >
              {status.label}
            </button>
          ))}
        </div>
        {errors.status && <span className={styles.errorText}>{errors.status}</span>}
      </div>

      {/* Event Date Field */}
      <div className={styles.formGroup}>
        <DateSelectionField
          value={{
            event_start_date: formData.event_start_date,
            event_end_date: formData.event_end_date,
            multiple_dates: formData.multiple_dates
          }}
          onChange={handleDateChange}
          error={errors.event_start_date || errors.event_end_date || errors.multiple_dates}
          disabled={isSubmitting}
          label="Event Date(s)"
          required={true}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className={styles.stepContainer}>
      <h3 className={styles.stepTitle}>Images</h3>
      
      {/* Main Image Upload */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          <FaImage className={styles.labelIcon} />
          Highlight Image <span className={styles.required}>*</span>
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

      {/* Additional Images Upload */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          <FaImage className={styles.labelIcon} />
          Additional Images (Optional)
        </label>
        
        <div className={styles.uploadArea}>
          <input
            ref={additionalImagesRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleAdditionalImagesChange}
            className={styles.fileInput}
          />
          <div className={styles.uploadContent}>
            <FaUpload className={styles.uploadIcon} />
            <p className={styles.uploadText}>
              Click to upload additional images
            </p>
            <p className={styles.uploadSubtext}>
              PNG, JPG, GIF up to 5MB each
            </p>
          </div>
        </div>

        {/* Additional Images Thumbnails */}
        {additionalImagePreviews.length > 0 && (
          <div className={styles.additionalImagesGrid}>
            {additionalImagePreviews.map((preview, index) => (
              <div key={index} className={styles.additionalImagePreview}>
                <Image 
                  src={preview} 
                  alt={`Additional ${index + 1}`} 
                  className={styles.additionalPreviewImage}
                  width={100}
                  height={100}
                  style={{ objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => removeAdditionalImage(index)}
                  className={styles.removeAdditionalImageButton}
                >
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return renderStep1();
    }
  };

  const renderStepActions = () => (
    <div className={styles.stepActions}>
      {currentStep > 1 && (
        <button
          type="button"
          onClick={prevStep}
          className={styles.stepButton}
          disabled={isSubmitting}
        >
          <FaChevronLeft />
          Back
        </button>
      )}
      
      {currentStep < 3 ? (
        <button
          type="button"
          onClick={nextStep}
          className={`${styles.stepButton} ${styles.nextButton}`}
          disabled={isSubmitting}
        >
          Next
          <FaChevronRight />
        </button>
      ) : (
        <button
          type="submit"
          className={`${styles.stepButton} ${styles.submitButton}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
        </button>
      )}
    </div>
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add New Program</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <FaTimes />
          </button>
        </div>

        {renderStepIndicator()}

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {renderStepContent()}

          {/* Submit Error */}
          {errors.submit && (
            <div className={styles.submitError}>
              {errors.submit}
            </div>
          )}

          {renderStepActions()}
        </form>
      </div>
    </div>
  );
};

export default AddProgramModal;

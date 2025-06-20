'use client';

import React, { useState, useRef } from 'react';
import styles from './modal.module.css';

const AddProjectModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'active',
    completed_date: null
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Create FormData object to send file
    const submitData = new FormData();
    submitData.append('organization_id', 1); // Default organization ID
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    submitData.append('status', formData.status);
    if (formData.completed_date) {
      submitData.append('completed_date', formData.completed_date);
    }
    if (selectedFile) {
      submitData.append('image', selectedFile);
    }

    onSave(submitData);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Add New Project</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Project Image</label>
            <div className={styles.imageUploadContainer}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={triggerFileInput}
                className={styles.uploadButton}
              >
                Choose Image
              </button>
              {selectedFile && (
                <span className={styles.fileName}>{selectedFile.name}</span>
              )}
            </div>
            {imagePreview && (
              <div className={styles.imagePreview}>
                <img src={imagePreview} alt="Preview" />
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {formData.status === 'completed' && (
            <div className={styles.formGroup}>
              <label>Completion Date</label>
              <input
                type="date"
                name="completed_date"
                value={formData.completed_date || ''}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className={styles.buttonGroup}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton}>
              Add Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;
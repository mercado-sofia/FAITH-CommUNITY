'use client';

import React, { useState, useRef } from 'react';
import styles from './styles/modal.module.css';

const EditProjectModal = ({ project, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id: project.id,
    organization_id: project.organization_id,
    title: project.title || '',
    description: project.description || '',
    status: project.status || 'active',
    completed_date: project.completed_date || null
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(project.image || null);
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
    submitData.append('id', formData.id);
    submitData.append('organization_id', formData.organization_id);
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    submitData.append('status', formData.status);
    if (formData.completed_date) {
      submitData.append('completed_date', formData.completed_date);
    }
    if (selectedFile) {
      submitData.append('image', selectedFile);
    } else if (project.image) {
      // If no new file is selected, keep the existing image name
      const imageName = project.image.split('/').pop();
      submitData.append('existing_image', imageName);
    }

    onSave(submitData);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Edit Project</h2>
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
                Change Image
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
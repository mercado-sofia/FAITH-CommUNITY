'use client';

import React from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { LuUpload } from 'react-icons/lu';
import styles from '../ProgramForm.module.css';

const AdditionalImagesUpload = ({
  additionalImagePreviews,
  additionalDragActive,
  additionalImagesRef,
  formData,
  onAdditionalImagesChange,
  onRemoveAdditionalImage,
  onAdditionalDragEnter,
  onAdditionalDragLeave,
  onAdditionalDragOver,
  onAdditionalDrop,
  errors
}) => {
  return (
    <div className={styles.container}>
      <h3 className={styles.containerTitle}>Additional Images (Optional)</h3>
      
      <div 
        className={`${styles.uploadArea} ${additionalDragActive ? styles.dragActive : ''}`}
        onDragEnter={onAdditionalDragEnter}
        onDragLeave={onAdditionalDragLeave}
        onDragOver={onAdditionalDragOver}
        onDrop={onAdditionalDrop}
      >
        <div className={styles.uploadContent}>
          <button
            type="button"
            className={styles.uploadButton}
            onClick={() => additionalImagesRef.current?.click()}
          >
            <LuUpload className={styles.uploadIcon} />
            Upload
          </button>
          <input
            ref={additionalImagesRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onAdditionalImagesChange}
            className={styles.hiddenInput}
          />
          <p className={styles.uploadText}>
            Choose images or drag & drop it here.
          </p>
          <p className={styles.uploadSubtext}>
            JPG, JPEG, PNG and WEBP. Max 20 MB.
          </p>
        </div>
      </div>

      {/* Additional Images List */}
      {additionalImagePreviews.length > 0 && (
        <div className={styles.uploadedFilesList}>
          {additionalImagePreviews.map((preview, index) => {
            const file = formData.additionalImages[index];
            const fileSize = file ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : 'Unknown size';
            const fileName = file ? file.name : preview.name || `Image ${index + 1}`;
            
            return (
              <div key={preview.id || index} className={styles.uploadedFileItem}>
                <div className={styles.fileIcon}>
                  <span className={styles.fileType}>IMG</span>
                </div>
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{fileName}</div>
                  <div className={styles.fileSize}>{fileSize}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveAdditionalImage(index)}
                  className={styles.deleteButton}
                >
                  <FiTrash2 />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {errors.additionalImages && (
        <span className={styles.errorText}>{errors.additionalImages}</span>
      )}
    </div>
  );
};

export default AdditionalImagesUpload;

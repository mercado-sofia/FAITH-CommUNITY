'use client';

import React from 'react';
import Image from 'next/image';
import { FiTrash2 } from 'react-icons/fi';
import { LuUpload } from 'react-icons/lu';
import styles from '../ProgramForm.module.css';

const ImageUpload = ({
  title,
  required = false,
  imagePreview,
  dragActive,
  fileInputRef,
  onImageChange,
  onRemoveImage,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  error
}) => {
  return (
    <div className={styles.container}>
      <h3 className={styles.containerTitle}>
        {title}
      </h3>
      
      {!imagePreview ? (
        <div 
          className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''}`}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <div className={styles.uploadContent}>
            <button
              type="button"
              className={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
            >
              <LuUpload className={styles.uploadIcon} />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onImageChange}
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
      ) : (
        <div className={styles.imagePreview}>
          <Image 
            src={imagePreview} 
            alt="Preview" 
            className={styles.previewImage}
            width={400}
            height={200}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={onRemoveImage}
            className={styles.removeImageButton}
          >
            <FiTrash2 />
          </button>
        </div>
      )}
      
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default ImageUpload;

import { useState } from 'react';
import Image from 'next/image';
import { FaCamera, FaTimes } from 'react-icons/fa';
import { FiTrash2 } from 'react-icons/fi';
import { getOrganizationImageUrl } from '@/utils/uploadPaths';
import { PhotoUtils } from '../utils/photoUtils';
import LazyImage from '../LazyImage';
import styles from '../OrgHeadsEditModal.module.css';

export default function HeadFormRow({
  head,
  index,
  fieldErrors,
  uploading,
  uploadProgress,
  onInputChange,
  onRemoveHead,
  onPhotoUpload,
  onPhotoChange,
  isIndividualEdit = false
}) {
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoChange(file, index);
    }
  };

  const handlePhotoUpload = async () => {
    if (head.photo && head.photo.startsWith('data:')) {
      try {
        await onPhotoUpload(head.photo, index, (photoPath) => {
          onInputChange(index, 'photo', photoPath);
        });
      } catch (error) {
        console.error('Photo upload failed:', error);
      }
    }
  };

  const handleRemovePhoto = () => {
    onInputChange(index, 'photo', '');
    setShowPhotoOptions(false);
  };

  const getPhotoDisplay = () => {
    if (head.photo) {
      if (head.photo.startsWith('data:')) {
        return (
          <div className={styles.photoPreview}>
            <img 
              src={head.photo} 
              alt="Preview" 
              className={styles.photoImage}
            />
            <button
              type="button"
              className={styles.uploadButton}
              onClick={handlePhotoUpload}
              disabled={uploading[index]}
            >
              {uploading[index] ? 'Uploading...' : 'Upload Photo'}
            </button>
            {uploadProgress[index] && (
              <div className={styles.uploadProgress}>
                <div 
                  className={styles.progressBar} 
                  style={{ width: `${uploadProgress[index]}%` }}
                />
              </div>
            )}
          </div>
        );
      } else {
        return (
          <div className={styles.photoDisplay}>
            <LazyImage
              src={getOrganizationImageUrl(head.photo)}
              alt={head.head_name || 'Head photo'}
              className={styles.photoImage}
            />
            <button
              type="button"
              className={styles.changePhotoButton}
              onClick={() => setShowPhotoOptions(true)}
            >
              <FaCamera />
            </button>
          </div>
        );
      }
    } else {
      return (
        <div className={styles.photoUpload}>
          <label className={styles.photoUploadLabel}>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className={styles.photoInput}
            />
            <FaCamera className={styles.photoIcon} />
            <span>Add Photo</span>
          </label>
        </div>
      );
    }
  };

  return (
    <div className={styles.headRow}>
      <div className={styles.headInfo}>
        <div className={styles.photoSection}>
          {getPhotoDisplay()}
          
          {showPhotoOptions && (
            <div className={styles.photoOptions}>
              <label className={styles.photoOption}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                Change Photo
              </label>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className={styles.removePhotoButton}
              >
                Remove Photo
              </button>
              <button
                type="button"
                onClick={() => setShowPhotoOptions(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className={styles.headFields}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={head.head_name || ''}
              onChange={(e) => onInputChange(index, 'head_name', e.target.value)}
              className={`${styles.fieldInput} ${fieldErrors[`${index}-head_name`] ? styles.fieldError : ''}`}
              placeholder="Enter name"
            />
            {fieldErrors[`${index}-head_name`] && (
              <span className={styles.errorText}>{fieldErrors[`${index}-head_name`]}</span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Role <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={head.role || ''}
              onChange={(e) => onInputChange(index, 'role', e.target.value)}
              className={`${styles.fieldInput} ${fieldErrors[`${index}-role`] ? styles.fieldError : ''}`}
              placeholder="Enter role"
            />
            {fieldErrors[`${index}-role`] && (
              <span className={styles.errorText}>{fieldErrors[`${index}-role`]}</span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Email <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              value={head.email || ''}
              onChange={(e) => onInputChange(index, 'email', e.target.value)}
              className={`${styles.fieldInput} ${fieldErrors[`${index}-email`] ? styles.fieldError : ''}`}
              placeholder="Enter email"
            />
            {fieldErrors[`${index}-email`] && (
              <span className={styles.errorText}>{fieldErrors[`${index}-email`]}</span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Facebook URL</label>
            <input
              type="url"
              value={head.facebook || ''}
              onChange={(e) => onInputChange(index, 'facebook', e.target.value)}
              className={`${styles.fieldInput} ${fieldErrors[`${index}-facebook`] ? styles.fieldError : ''}`}
              placeholder="https://facebook.com/username"
            />
            {fieldErrors[`${index}-facebook`] && (
              <span className={styles.errorText}>{fieldErrors[`${index}-facebook`]}</span>
            )}
          </div>
        </div>
      </div>

      {!isIndividualEdit && (
        <button
          type="button"
          onClick={() => onRemoveHead(index)}
          className={styles.removeButton}
          title="Remove head"
        >
          <FiTrash2 />
        </button>
      )}
    </div>
  );
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { FaCamera, FaTimes, FaCheckCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa'
import { FiImage } from 'react-icons/fi'
import { getOrganizationImageUrl } from '@/utils/uploadPaths'
import styles from './OrgHeadModal.module.css'
import { PhotoUtils, applyRoleHierarchyOrdering } from '../../utils'
import LazyImage from '../components/LazyImage/LazyImage'

export default function OrgHeadsEditModal({
  isOpen,
  orgHeadsData,
  setOrgHeadsData,
  handleSave,
  handleCancel,
  saving,
  originalData,
  isIndividualEdit = false
}) {
  const [editingHead, setEditingHead] = useState({
    head_name: '',
    role: '',
    photo: '',
    facebook: '',
    email: ''
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationErrors, setValidationErrors] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  
  const fileInputRef = useRef(null)

  // Initialize form with existing data when modal opens
  useEffect(() => {
    if (isOpen && originalData && originalData.length > 0) {
      const headData = originalData[0]; // For individual edit, take the first head
      setEditingHead({
        head_name: headData.head_name || '',
        role: headData.role || '',
        photo: headData.photo || '',
        facebook: headData.facebook || '',
        email: headData.email || ''
      })
      setValidationErrors({})
      setFieldErrors({})
      setUploadProgress(0)
      setUploading(false)
    }
  }, [isOpen, originalData])

  if (!isOpen) return null

  const handleInputChange = (field, value) => {
    setEditingHead(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing or uploading
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      return
    }

    // Clear previous errors
    setValidationErrors({})

    // Validate image
    const validation = PhotoUtils.validateImage(file)
    
    if (!validation.isValid) {
      setValidationErrors({ errors: validation.errors, warnings: validation.warnings })
      return
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      setValidationErrors({ errors: [], warnings: validation.warnings })
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Compress image for better performance
      setUploadProgress(20)
      
      const compressedFile = await PhotoUtils.compressImage(file, {
        maxWidth: 400,
        maxHeight: 500,
        quality: 0.85
      })

      // Generate thumbnail for immediate preview
      setUploadProgress(40)
      
      const thumbnail = await PhotoUtils.generateThumbnail(compressedFile)
      
      // Set thumbnail immediately for better UX
      handleInputChange('photo', thumbnail)

      // Upload compressed file
      setUploadProgress(60)
      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('uploadType', 'organization-head')

      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('No admin token found. Please log in again.');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      setUploadProgress(80)
      const result = await response.json()

      if (result.success) {
        // Use the full URL from backend, or construct it from filename
        const photoPath = result.url || (result.filePath ? `/uploads/organizations/heads/${result.filePath}` : null)
        
        setUploadProgress(100)
        
        // Replace thumbnail with actual uploaded image
        handleInputChange('photo', photoPath)
        
        // Show success state briefly
        setTimeout(() => {
          setUploadProgress(0)
        }, 1000)
      } else {
        throw new Error(result.message || result.error || 'Upload failed')
      }
    } catch (error) {
      setValidationErrors({ 
        errors: [`Upload failed: ${error.message}`], 
        warnings: [] 
      })
      
      // Reset photo on error
      handleInputChange('photo', '')
    } finally {
      setUploading(false)
      if (uploadProgress !== 100) {
        setUploadProgress(0)
      }
    }
  }

  const validateForm = () => {
    const newFieldErrors = {}
    let isValid = true

    // Validate name
    if (!editingHead.head_name?.trim()) {
      newFieldErrors.head_name = 'Name is required'
      isValid = false
    }
    
    // Validate role
    if (!editingHead.role?.trim()) {
      newFieldErrors.role = 'Role is required'
      isValid = false
    }
    
    // Validate email
    if (!editingHead.email?.trim()) {
      newFieldErrors.email = 'Email is required'
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(editingHead.email)) {
      newFieldErrors.email = 'Please enter a valid email address'
      isValid = false
    }
    
    // Validate photo (now required)
    if (!editingHead.photo?.trim()) {
      newFieldErrors.photo = 'Profile photo is required'
      isValid = false
    }
    
    // Validate Facebook URL (optional field)
    if (editingHead.facebook && !editingHead.facebook.includes('facebook.com')) {
      newFieldErrors.facebook = 'Please enter a valid Facebook URL'
      isValid = false
    }

    setFieldErrors(newFieldErrors)
    return isValid
  }

  const handleSaveClick = () => {
    if (saving) {
      return
    }
    
    if (validateForm()) {
      try {
        // For editing, preserve the original display_order and ID
        const updatedHead = {
          ...editingHead,
          id: originalData[0]?.id, // Preserve original ID
          display_order: originalData[0]?.display_order || 1 // Preserve original display_order
        }
        
        handleSave([updatedHead])
      } catch (error) {
        // Handle error silently
      }
    } else {
      // Scroll to the first error field
      const firstErrorField = document.querySelector(`.${styles.inputError}`)
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        firstErrorField.focus()
      }
    }
  }

  const handleCancelClick = () => {
    // Reset form state
    setEditingHead({
      head_name: '',
      role: '',
      photo: '',
      facebook: '',
      email: ''
    })
    setValidationErrors({})
    setFieldErrors({})
    setUploadProgress(0)
    handleCancel()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Organization Head</h2>
          <button
            onClick={handleCancelClick}
            className={styles.closeButton}
            disabled={saving}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.formLayout}>
            {/* Top row: Photo on left, Name and Role on right */}
            <div className={styles.topRow}>
              <div className={styles.photoSection}>
                <label className={styles.photoLabel}>Profile Photo *</label>
                <div className={styles.headPhoto}>
                  <div className={styles.photoContainer}>
                    {editingHead.photo ? (
                      <LazyImage
                        src={getOrganizationImageUrl(editingHead.photo, 'head')}
                        alt="Profile photo preview"
                        className={styles.photo}
                        priority={true}
                      />
                    ) : (
                      <div className={styles.noImageContainer}>
                        <FiImage className={styles.noImageIcon} />
                        <span className={styles.noImageText}>No image</span>
                      </div>
                    )}
                    
                    <div className={styles.photoOverlay}>
                      <label className={styles.photoUploadLabel}>
                        <FaCamera className={styles.cameraIcon} />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className={styles.fileInput}
                          disabled={saving || uploading}
                        />
                      </label>
                    </div>
                    
                    {/* Upload Progress */}
                    {uploadProgress > 0 && (
                      <div className={styles.uploadProgressOverlay}>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill}
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className={styles.progressText}>
                          {uploadProgress === 100 ? (
                            <><FaCheckCircle className={styles.successIcon} /> Uploaded!</>
                          ) : (
                            `${uploadProgress}%`
                          )}
                        </span>
                      </div>
                    )}
                    
                    {/* Loading Spinner */}
                    {uploading && !uploadProgress && (
                      <div className={styles.uploadingOverlay}>
                        <div className={styles.spinner} />
                      </div>
                    )}
                  </div>
                  
                  {/* Validation Messages */}
                  {validationErrors.errors && validationErrors.errors.length > 0 && (
                    <div className={styles.validationMessages}>
                      {validationErrors.errors.map((error, errorIndex) => (
                        <div key={errorIndex} className={styles.errorMessage}>
                          <FaExclamationTriangle className={styles.errorIcon} />
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                  {validationErrors.warnings && validationErrors.warnings.length > 0 && (
                    <div className={styles.validationMessages}>
                      {validationErrors.warnings.map((warning, warningIndex) => (
                        <div key={warningIndex} className={styles.warningMessage}>
                          <FaExclamationTriangle className={styles.warningIcon} />
                          {warning}
                        </div>
                      ))}
                    </div>
                  )}
                  {fieldErrors.photo && (
                    <div className={styles.fieldError}>
                      {fieldErrors.photo}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.nameRoleFields}>
                <div className={`${styles.formGroup} ${fieldErrors.head_name ? styles.formGroupError : ''}`}>
                  <label className={styles.label}>Name *</label>
                  <input
                    type="text"
                    value={editingHead.head_name || ''}
                    onChange={(e) => handleInputChange('head_name', e.target.value)}
                    className={`${styles.input} ${fieldErrors.head_name ? styles.inputError : ''}`}
                    placeholder="Enter full name"
                    disabled={saving}
                    required
                  />
                  {fieldErrors.head_name && (
                    <div className={styles.fieldError}>
                      {fieldErrors.head_name}
                    </div>
                  )}
                </div>

                <div className={`${styles.formGroup} ${fieldErrors.role ? styles.formGroupError : ''}`}>
                  <label className={styles.label}>Role *</label>
                  <input
                    type="text"
                    value={editingHead.role || ''}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className={`${styles.input} ${fieldErrors.role ? styles.inputError : ''}`}
                    placeholder="Enter role (e.g., President, Secretary, PRO)"
                    disabled={saving}
                    required
                  />
                  {fieldErrors.role && (
                    <div className={styles.fieldError}>
                      {fieldErrors.role}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom row: Email and Facebook full width */}
            <div className={styles.bottomRow}>
              <div className={`${styles.formGroup} ${fieldErrors.email ? styles.formGroupError : ''}`}>
                <label className={styles.label}>Email *</label>
                <input
                  type="email"
                  value={editingHead.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                  placeholder="Enter email address"
                  disabled={saving}
                  required
                />
                {fieldErrors.email && (
                  <div className={styles.fieldError}>
                    {fieldErrors.email}
                  </div>
                )}
              </div>

              <div className={`${styles.formGroup} ${fieldErrors.facebook ? styles.formGroupError : ''}`}>
                <label className={styles.label}>Facebook URL</label>
                <input
                  type="url"
                  value={editingHead.facebook || ''}
                  onChange={(e) => handleInputChange('facebook', e.target.value)}
                  className={`${styles.input} ${fieldErrors.facebook ? styles.inputError : ''}`}
                  placeholder="https://facebook.com/username (optional)"
                  disabled={saving}
                />
                {fieldErrors.facebook && (
                  <div className={styles.fieldError}>
                    {fieldErrors.facebook}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleCancelClick}
            className={styles.cancelButton}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? <FaSpinner className={styles.spinner} /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

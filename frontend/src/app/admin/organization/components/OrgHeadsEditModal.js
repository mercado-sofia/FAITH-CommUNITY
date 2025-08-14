'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { FaPlus, FaCamera, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import { FiTrash2, FiImage } from 'react-icons/fi'
import { getOrganizationImageUrl } from '@/utils/uploadPaths'
import styles from './styles/OrgHeadsEditModal.module.css'
import { PhotoUtils } from './utils/photoUtils'
import LazyImage from './LazyImage'

export default function OrgHeadsEditModal({
  isOpen,
  orgHeadsData,
  setOrgHeadsData,
  handleSave,
  handleCancel,
  saving,
  originalData
}) {
  const [localHeads, setLocalHeads] = useState(orgHeadsData || [])
  const [uploading, setUploading] = useState({})
  const [uploadProgress, setUploadProgress] = useState({})
  const [validationErrors, setValidationErrors] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})

  // Update localHeads when orgHeadsData changes (e.g., after reordering)
  useEffect(() => {
    if (orgHeadsData) {
      setLocalHeads(orgHeadsData)
    }
  }, [orgHeadsData])

  // Reset localHeads when modal opens with new data
  useEffect(() => {
    if (isOpen && orgHeadsData) {
      setLocalHeads(orgHeadsData)
    }
  }, [isOpen, orgHeadsData])

  // Clear field errors when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFieldErrors({})
    }
  }, [isOpen])

  // Check if any changes have been made
  const hasChanges = () => {
    if (!originalData || !localHeads) return false;
    
    // Check if the number of heads has changed
    if (originalData.length !== localHeads.length) return true;
    
    // Check if any head data has changed
    return localHeads.some((head, index) => {
      const originalHead = originalData[index];
      if (!originalHead) return true; // New head added
      
      return (
        head.head_name !== originalHead.head_name ||
        head.role !== originalHead.role ||
        head.photo !== originalHead.photo ||
        head.facebook !== originalHead.facebook ||
        head.email !== originalHead.email
      );
    });
  };

  if (!isOpen) return null

  const handleInputChange = (index, field, value) => {
    const updatedHeads = [...localHeads]
    updatedHeads[index] = { ...updatedHeads[index], [field]: value }
    setLocalHeads(updatedHeads)
    
    // Clear field error when user starts typing
    if (fieldErrors[`${index}-${field}`]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`${index}-${field}`]
        return newErrors
      })
    }
  }

  const handleAddHead = () => {
    const newHead = {
      id: null,
      head_name: '',
      role: '',
      photo: '',
      facebook: '',
      email: ''
    }
    const updatedHeads = [...localHeads, newHead]
    setLocalHeads(updatedHeads)
    
    // Clear field errors when adding new head
    setFieldErrors({})
  }

  const handleRemoveHead = (index) => {
    const updatedHeads = localHeads.filter((_, i) => i !== index)
    setLocalHeads(updatedHeads)
    
    // Clear field errors for removed head and reindex remaining errors
    setFieldErrors(prev => {
      const newErrors = {}
      Object.keys(prev).forEach(key => {
        const [headIndex, field] = key.split('-')
        const headIndexNum = parseInt(headIndex)
        if (headIndexNum < index) {
          // Keep errors for heads before the removed one
          newErrors[key] = prev[key]
        } else if (headIndexNum > index) {
          // Reindex errors for heads after the removed one
          const newKey = `${headIndexNum - 1}-${field}`
          newErrors[newKey] = prev[key]
        }
        // Skip errors for the removed head
      })
      return newErrors
    })
  }

  const handleFileUpload = async (index, e) => {
    const file = e.target.files[0]
    if (!file) {
      console.log('No file selected');
      return
    }

    console.log('File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Clear previous errors
    setValidationErrors(prev => ({ ...prev, [index]: null }))

    // Validate image
    const validation = PhotoUtils.validateImage(file)
    console.log('Validation result:', validation);
    
    if (!validation.isValid) {
      console.log('Validation failed:', validation.errors);
      setValidationErrors(prev => ({ 
        ...prev, 
        [index]: { errors: validation.errors, warnings: validation.warnings }
      }))
      return
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      setValidationErrors(prev => ({ 
        ...prev, 
        [index]: { errors: [], warnings: validation.warnings }
      }))
    }

    setUploading(prev => ({ ...prev, [index]: true }))
    setUploadProgress(prev => ({ ...prev, [index]: 0 }))

    try {
      // Get original image dimensions for info
      const dimensions = await PhotoUtils.getImageDimensions(file)
      console.log('Original image dimensions:', dimensions)

      // Compress image for better performance
      setUploadProgress(prev => ({ ...prev, [index]: 20 }))
      console.log('Starting image compression...');
      
      const compressedFile = await PhotoUtils.compressImage(file, {
        maxWidth: 400,
        maxHeight: 500,
        quality: 0.85
      })

      console.log('File compressed:', {
        original: `${(file.size / 1024).toFixed(1)}KB`,
        compressed: `${(compressedFile.size / 1024).toFixed(1)}KB`,
        reduction: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`
      })

      // Generate thumbnail for immediate preview
      setUploadProgress(prev => ({ ...prev, [index]: 40 }))
      console.log('Generating thumbnail...');
      
      const thumbnail = await PhotoUtils.generateThumbnail(compressedFile)
      console.log('Thumbnail generated, length:', thumbnail.length);
      
      // Set thumbnail immediately for better UX
      handleInputChange(index, 'photo', thumbnail)

      // Upload compressed file
      setUploadProgress(prev => ({ ...prev, [index]: 60 }))
      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('uploadType', 'organization-head')

      console.log('Uploading file:', {
        filename: compressedFile.name,
        size: compressedFile.size,
        type: compressedFile.type,
        uploadType: 'organization-head'
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      console.log('Upload response status:', response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed:', errorText)
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      setUploadProgress(prev => ({ ...prev, [index]: 80 }))
      const result = await response.json()
      console.log('Upload result:', result);

             if (result.success) {
         // Use the full URL from backend, or construct it from filename
         const photoPath = result.url || (result.filePath ? `/uploads/organizations/heads/${result.filePath}` : null)
         console.log('Photo path:', photoPath);
         
         setUploadProgress(prev => ({ ...prev, [index]: 100 }))
         
         // Replace thumbnail with actual uploaded image
         handleInputChange(index, 'photo', photoPath)
        
        // Show success state briefly
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, [index]: null }))
        }, 1000)
        
        console.log('Upload successful:', photoPath)
      } else {
        console.error('Upload failed:', result);
        throw new Error(result.message || result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setValidationErrors(prev => ({ 
        ...prev, 
        [index]: { 
          errors: [`Upload failed: ${error.message}`], 
          warnings: [] 
        }
      }))
      
      // Reset photo on error
      handleInputChange(index, 'photo', '')
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }))
      if (uploadProgress[index] !== 100) {
        setUploadProgress(prev => ({ ...prev, [index]: null }))
      }
    }
  }

  const validateForm = () => {
    const newFieldErrors = {}
    let isValid = true

    for (let i = 0; i < localHeads.length; i++) {
      const head = localHeads[i]
      
      // Validate name
      if (!head.head_name?.trim()) {
        newFieldErrors[`${i}-head_name`] = 'Name is required'
        isValid = false
      }
      
      // Validate role
      if (!head.role?.trim()) {
        newFieldErrors[`${i}-role`] = 'Role is required'
        isValid = false
      }
      
      // Validate email
      if (!head.email?.trim()) {
        newFieldErrors[`${i}-email`] = 'Email is required'
        isValid = false
      } else if (!/\S+@\S+\.\S+/.test(head.email)) {
        newFieldErrors[`${i}-email`] = 'Please enter a valid email address'
        isValid = false
      }
      
      // Validate Facebook URL (optional field)
      if (head.facebook && !head.facebook.includes('facebook.com')) {
        newFieldErrors[`${i}-facebook`] = 'Please enter a valid Facebook URL'
        isValid = false
      }
    }

    setFieldErrors(newFieldErrors)
    return isValid
  }

  const handleSaveClick = () => {
    if (validateForm()) {
      // Update the main state with local changes before saving
      setOrgHeadsData([...localHeads])
      // Pass the current local data to the save function to ensure it has the latest data
      handleSave(localHeads)
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

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Organization Heads</h2>
          <button
            onClick={handleCancel}
            className={styles.closeButton}
            disabled={saving}
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.content}>
          {localHeads.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No organization heads added yet.</p>
              <button
                onClick={handleAddHead}
                className={styles.addButton}
                disabled={saving}
              >
                <FaPlus /> Add First Head
              </button>
            </div>
          ) : (
            <div className={styles.headsContainer}>
              {localHeads.map((head, index) => (
                <div key={index} className={styles.headForm}>
                  <div className={styles.formHeader}>
                    <h3 className={styles.headTitle}>Head #{index + 1}</h3>
                    <button
                      onClick={() => handleRemoveHead(index)}
                      className={styles.removeButton}
                      disabled={saving}
                      title="Remove this head"
                    >
                                              <FiTrash2 />
                    </button>
                  </div>

                  <div className={styles.formLayout}>
                    {/* Top row: Photo on left, Name and Role on right */}
                    <div className={styles.topRow}>
                      <div className={styles.photoSection}>
                        <div className={styles.headPhoto}>
                          <div className={styles.photoContainer}>
                            {head.photo ? (
                              <LazyImage
                                src={getOrganizationImageUrl(head.photo, 'head')}
                                alt={`Profile photo of ${head.head_name || 'organization head'}`}
                                className={styles.photo}
                                priority={index < 2} // Prioritize first 2 images
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
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileUpload(index, e)}
                                  className={styles.fileInput}
                                  disabled={saving || uploading[index]}
                                />
                              </label>
                            </div>
                            
                            {/* Upload Progress */}
                            {uploadProgress[index] !== null && uploadProgress[index] !== undefined && (
                              <div className={styles.uploadProgressOverlay}>
                                <div className={styles.progressBar}>
                                  <div 
                                    className={styles.progressFill}
                                    style={{ width: `${uploadProgress[index]}%` }}
                                  />
                                </div>
                                <span className={styles.progressText}>
                                  {uploadProgress[index] === 100 ? (
                                    <><FaCheckCircle className={styles.successIcon} /> Uploaded!</>
                                  ) : (
                                    `${uploadProgress[index] || 0}%`
                                  )}
                                </span>
                              </div>
                            )}
                            
                            {/* Loading Spinner */}
                            {uploading[index] && !uploadProgress[index] && (
                              <div className={styles.uploadingOverlay}>
                                <div className={styles.spinner} />
                              </div>
                            )}
                          </div>
                          
                          {/* Validation Messages */}
                          {validationErrors[index] && (
                            <div className={styles.validationMessages}>
                              {validationErrors[index].errors.map((error, errorIndex) => (
                                <div key={errorIndex} className={styles.errorMessage}>
                                  <FaExclamationTriangle className={styles.errorIcon} />
                                  {error}
                                </div>
                              ))}
                              {validationErrors[index].warnings.map((warning, warningIndex) => (
                                <div key={warningIndex} className={styles.warningMessage}>
                                  <FaExclamationTriangle className={styles.warningIcon} />
                                  {warning}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.nameRoleFields}>
                        <div className={`${styles.formGroup} ${fieldErrors[`${index}-head_name`] ? styles.formGroupError : ''}`}>
                          <label className={styles.label}>Name *</label>
                          <input
                            type="text"
                            value={head.head_name || ''}
                            onChange={(e) => handleInputChange(index, 'head_name', e.target.value)}
                            className={`${styles.input} ${fieldErrors[`${index}-head_name`] ? styles.inputError : ''}`}
                            placeholder="Enter full name"
                            disabled={saving}
                            required
                          />
                          {fieldErrors[`${index}-head_name`] && (
                            <div className={styles.fieldError}>
                              {fieldErrors[`${index}-head_name`]}
                            </div>
                          )}
                        </div>

                        <div className={`${styles.formGroup} ${fieldErrors[`${index}-role`] ? styles.formGroupError : ''}`}>
                          <label className={styles.label}>Role *</label>
                          <input
                            type="text"
                            value={head.role || ''}
                            onChange={(e) => handleInputChange(index, 'role', e.target.value)}
                            className={`${styles.input} ${fieldErrors[`${index}-role`] ? styles.inputError : ''}`}
                            placeholder="e.g., President, Vice President, Secretary"
                            disabled={saving}
                            required
                          />
                          {fieldErrors[`${index}-role`] && (
                            <div className={styles.fieldError}>
                              {fieldErrors[`${index}-role`]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Email and Facebook full width */}
                    <div className={styles.bottomRow}>
                      <div className={`${styles.formGroup} ${fieldErrors[`${index}-email`] ? styles.formGroupError : ''}`}>
                        <label className={styles.label}>Email *</label>
                        <input
                          type="email"
                          value={head.email || ''}
                          onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                          className={`${styles.input} ${fieldErrors[`${index}-email`] ? styles.inputError : ''}`}
                          placeholder="Enter email address"
                          disabled={saving}
                          required
                        />
                        {fieldErrors[`${index}-email`] && (
                          <div className={styles.fieldError}>
                            {fieldErrors[`${index}-email`]}
                          </div>
                        )}
                      </div>

                      <div className={`${styles.formGroup} ${fieldErrors[`${index}-facebook`] ? styles.formGroupError : ''}`}>
                        <label className={styles.label}>Facebook URL</label>
                        <input
                          type="url"
                          value={head.facebook || ''}
                          onChange={(e) => handleInputChange(index, 'facebook', e.target.value)}
                          className={`${styles.input} ${fieldErrors[`${index}-facebook`] ? styles.inputError : ''}`}
                          placeholder="https://facebook.com/username (optional)"
                          disabled={saving}
                        />
                        {fieldErrors[`${index}-facebook`] && (
                          <div className={styles.fieldError}>
                            {fieldErrors[`${index}-facebook`]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {localHeads.length > 0 && (
            <div className={styles.addMoreSection}>
              <button
                onClick={handleAddHead}
                className={styles.addMoreButton}
                disabled={saving}
              >
                <FaPlus /> Add Another Head
              </button>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleCancel}
            className={styles.cancelButton}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            className={styles.saveButton}
            disabled={saving || !hasChanges()}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

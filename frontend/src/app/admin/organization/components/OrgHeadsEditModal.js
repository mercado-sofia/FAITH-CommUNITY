'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FaPlus, FaTrash, FaCamera, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import styles from './styles/OrgHeadsEditModal.module.css'
import { PhotoUtils } from './utils/photoUtils'
import LazyImage from './LazyImage'

export default function OrgHeadsEditModal({
  isOpen,
  orgHeadsData,
  setOrgHeadsData,
  handleSave,
  handleCancel,
  saving
}) {
  const [localHeads, setLocalHeads] = useState(orgHeadsData || [])
  const [uploading, setUploading] = useState({})
  const [uploadProgress, setUploadProgress] = useState({})
  const [validationErrors, setValidationErrors] = useState({})

  if (!isOpen) return null

  const handleInputChange = (index, field, value) => {
    const updatedHeads = [...localHeads]
    updatedHeads[index] = { ...updatedHeads[index], [field]: value }
    setLocalHeads(updatedHeads)
    setOrgHeadsData(updatedHeads)
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
    setOrgHeadsData(updatedHeads)
  }

  const handleRemoveHead = (index) => {
    const updatedHeads = localHeads.filter((_, i) => i !== index)
    setLocalHeads(updatedHeads)
    setOrgHeadsData(updatedHeads)
  }

  const handleFileUpload = async (index, e) => {
    const file = e.target.files[0]
    if (!file) return

    // Clear previous errors
    setValidationErrors(prev => ({ ...prev, [index]: null }))

    // Validate image
    const validation = PhotoUtils.validateImage(file)
    if (!validation.isValid) {
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
      const thumbnail = await PhotoUtils.generateThumbnail(compressedFile)
      
      // Set thumbnail immediately for better UX
      handleInputChange(index, 'photo', thumbnail)

      // Upload compressed file
      setUploadProgress(prev => ({ ...prev, [index]: 60 }))
      const formData = new FormData()
      formData.append('file', compressedFile)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/upload`, {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(prev => ({ ...prev, [index]: 80 }))
      const result = await response.json()

      if (result.success) {
        const photoPath = result.filePath || result.url
        setUploadProgress(prev => ({ ...prev, [index]: 100 }))
        
        // Replace thumbnail with actual uploaded image
        handleInputChange(index, 'photo', photoPath)
        
        // Show success state briefly
        setTimeout(() => {
          setUploadProgress(prev => ({ ...prev, [index]: null }))
        }, 1000)
        
        console.log('Upload successful:', photoPath)
      } else {
        throw new Error(result.message || 'Upload failed')
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
    for (let i = 0; i < localHeads.length; i++) {
      const head = localHeads[i]
      if (!head.head_name?.trim()) {
        alert(`Please enter a name for head #${i + 1}`)
        return false
      }
      if (!head.role?.trim()) {
        alert(`Please enter a role for head #${i + 1}`)
        return false
      }
      if (!head.email?.trim()) {
        alert(`Please enter an email for head #${i + 1}`)
        return false
      }
      if (!head.photo?.trim()) {
        alert(`Please upload a profile photo for head #${i + 1}`)
        return false
      }
      if (head.email && !/\S+@\S+\.\S+/.test(head.email)) {
        alert(`Please enter a valid email for head #${i + 1}`)
        return false
      }
      if (head.facebook && !head.facebook.includes('facebook.com')) {
        alert(`Please enter a valid Facebook URL for head #${i + 1}`)
        return false
      }
    }
    return true
  }

  const handleSaveClick = () => {
    if (validateForm()) {
      handleSave()
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
                      <FaTrash />
                    </button>
                  </div>

                  <div className={styles.formLayout}>
                    {/* Top row: Photo on left, Name and Role on right */}
                    <div className={styles.topRow}>
                      <div className={styles.photoSection}>
                        <div className={styles.headPhoto}>
                          <div className={styles.photoContainer}>
                            <LazyImage
                              src={head.photo || '/default.png'}
                              alt={`Profile photo of ${head.head_name || 'organization head'}`}
                              className={styles.photo}
                              priority={index < 2} // Prioritize first 2 images
                            />
                            
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
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Name *</label>
                          <input
                            type="text"
                            value={head.head_name || ''}
                            onChange={(e) => handleInputChange(index, 'head_name', e.target.value)}
                            className={styles.input}
                            placeholder="Enter full name"
                            disabled={saving}
                            required
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.label}>Role *</label>
                          <input
                            type="text"
                            value={head.role || ''}
                            onChange={(e) => handleInputChange(index, 'role', e.target.value)}
                            className={styles.input}
                            placeholder="e.g., President, Vice President, Secretary"
                            disabled={saving}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Email and Facebook full width */}
                    <div className={styles.bottomRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Email *</label>
                        <input
                          type="email"
                          value={head.email || ''}
                          onChange={(e) => handleInputChange(index, 'email', e.target.value)}
                          className={styles.input}
                          placeholder="Enter email address"
                          disabled={saving}
                          required
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>Facebook URL</label>
                        <input
                          type="url"
                          value={head.facebook || ''}
                          onChange={(e) => handleInputChange(index, 'facebook', e.target.value)}
                          className={styles.input}
                          placeholder="https://facebook.com/username (optional)"
                          disabled={saving}
                        />
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
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

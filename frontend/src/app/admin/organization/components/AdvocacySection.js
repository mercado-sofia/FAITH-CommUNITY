"use client"

import { useState, useEffect } from "react"
import sharedStyles from "./styles/shared.module.css"
import advocacyStyles from "./styles/AdvocacySection.module.css"

export default function AdvocacySection({ data, isEditMode, onEdit, onCancel, onSectionSave, showToast }) {
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setDescription(data || "")
    setHasChanges(false)
  }, [data, isEditMode])

  const validateForm = () => {
    const newErrors = {}

    if (!description.trim()) {
      newErrors.description = "Advocacy description is required"
    } else if (description.trim().length < 10) {
      newErrors.description = "Advocacy description must be at least 10 characters"
    } else if (description.trim().length > 1000) {
      newErrors.description = "Advocacy description must be less than 1000 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const value = e.target.value
    setDescription(value)
    setHasChanges(value !== (data || ""))

    // Clear error when user starts typing
    if (errors.description) {
      setErrors({})
    }
  }

  const handleSave = () => {
    if (!validateForm()) {
      showToast("Please fix the errors before saving", "error")
      return
    }

    if (!hasChanges) {
      showToast("No changes detected", "info")
      onCancel()
      return
    }

    onSectionSave(description.trim())
  }

  const handleCancel = () => {
    setDescription(data || "") // Reset description to original data when cancelling
    setErrors({})
    setHasChanges(false)
    onCancel()
  }

  return (
    <div className={sharedStyles.sectionBox}>
      <div className={sharedStyles.sectionHeader}>
        <h3>Advocacy</h3>
        {!isEditMode && (
          <button onClick={onEdit} className={sharedStyles.editBtn}>
            Edit
          </button>
        )}
      </div>

      <div className={sharedStyles.sectionContent}>
        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.label}>
            Advocacy Description: <span className={sharedStyles.required}>*</span>
            {isEditMode ? (
              <div>
                <textarea
                  name="advocacy"
                  value={description}
                  onChange={handleChange}
                  className={`${sharedStyles.textarea} ${advocacyStyles.advocacyTextarea} ${errors.description ? sharedStyles.inputError : ""}`}
                  placeholder="Describe your organization&rsquo;s advocacy and mission..."
                  rows={6}
                />
                <div className={`${advocacyStyles.advocacyCounter}`}>
                  <span className={advocacyStyles.advocacyHint}>
                    Be specific about your organization&rsquo;s mission
                  </span>
                  <div className={sharedStyles.characterCount}>{description.length}/1000 characters</div>
                </div>
                {errors.description && <span className={sharedStyles.errorText}>{errors.description}</span>}
              </div>
            ) : (
              <p className={sharedStyles.displayText}>{data || "No advocacy description provided"}</p>
            )}
          </label>
        </div>

        {isEditMode && (
          <div className={sharedStyles.actionButtons}>
            <button onClick={handleCancel} className={sharedStyles.cancelBtn}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`${sharedStyles.saveBtn} ${!hasChanges ? sharedStyles.saveDisabled : ""}`}
              disabled={!hasChanges}
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
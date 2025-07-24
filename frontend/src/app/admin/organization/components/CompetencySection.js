"use client"

import { useState, useEffect } from "react"
import sharedStyles from "./styles/shared.module.css"
import competencyStyles from "./styles/CompetencySection.module.css"

export default function CompetencySection({ data, isEditMode, onEdit, onCancel, onSectionSave, showToast }) {
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
      newErrors.description = "Competency description is required"
    } else if (description.trim().length < 10) {
      newErrors.description = "Competency description must be at least 10 characters"
    } else if (description.trim().length > 1000) {
      newErrors.description = "Competency description must be less than 1000 characters"
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
        <h3>Competency</h3>
        {!isEditMode && (
          <button onClick={onEdit} className={sharedStyles.editBtn}>
            Edit
          </button>
        )}
      </div>

      <div className={sharedStyles.sectionContent}>
        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.label}>
            Competency Description: <span className={sharedStyles.required}>*</span>
          </label>
          {isEditMode ? (
            <div>
              <textarea
                name="competency"
                value={description}
                onChange={handleChange}
                className={`${sharedStyles.textarea} ${competencyStyles.competencyTextarea} ${errors.description ? sharedStyles.inputError : ""}`}
                placeholder="Describe your organization&rsquo;s core competencies and capabilities..."
                rows={6}
              />
              <div className={competencyStyles.competencyCounter}>
                <span className={competencyStyles.competencyHint}>Focus on your organization&rsquo;s strengths</span>
                <div className={sharedStyles.characterCount}>{description.length}/1000 characters</div>
              </div>
              {errors.description && <span className={sharedStyles.errorText}>{errors.description}</span>}
            </div>
          ) : (
            <p className={sharedStyles.displayText}>{data || "No competency description provided"}</p>
          )}
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
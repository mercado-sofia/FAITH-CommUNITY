"use client"

import { useState, useEffect } from "react"
import styles from "./styles/Modal.module.css" // Corrected import path for Modal's specific styles

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export default function EditSubmissionModal({ submission, onClose, onUpdate, showToast }) {
  const [updatedData, setUpdatedData] = useState({})
  const [originalData, setOriginalData] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (submission?.proposed_data) {
      const data = submission.proposed_data
      setUpdatedData(data)
      setOriginalData(data)
      setHasChanges(false)
      setErrors({})
    }
  }, [submission])

  const validateField = (key, value) => {
    const fieldErrors = {}

    switch (key) {
      case "orgName":
        if (!value?.trim()) {
          fieldErrors[key] = "Organization name is required"
        }
        break
      case "org":
        if (!value?.trim()) {
          fieldErrors[key] = "Organization acronym is required"
        }
        break
      case "email":
        if (value && !/\S+@\S+\.\S+/.test(value)) {
          fieldErrors[key] = "Please enter a valid email address"
        }
        break
      case "facebook":
        if (value && !value.includes("facebook.com")) {
          fieldErrors[key] = "Please enter a valid Facebook URL"
        }
        break
      case "head_name":
        if (!value?.trim()) {
          fieldErrors[key] = "Name is required"
        }
        break
      case "role":
        if (!value?.trim()) {
          fieldErrors[key] = "Role/Position is required"
        }
        break
      case "advocacy":
      case "competency":
        if (!value?.trim()) {
          fieldErrors[key] = `${key.charAt(0).toUpperCase() + key.slice(1)} description is required`
        } else if (value.trim().length < 10) {
          fieldErrors[key] = `${key.charAt(0).toUpperCase() + key.slice(1)} description must be at least 10 characters`
        } else if (value.trim().length > 1000) {
          fieldErrors[key] =
            `${key.charAt(0).toUpperCase() + key.slice(1)} description must be less than 1000 characters`
        }
        break
    }

    return fieldErrors
  }

  const validateAllFields = () => {
    const allErrors = {}

    if (Array.isArray(updatedData)) {
      // Handle organization heads array
      updatedData.forEach((head, index) => {
        Object.entries(head).forEach(([key, value]) => {
          if (key === "head_name" || key === "role") {
            const fieldErrors = validateField(key, value)
            if (Object.keys(fieldErrors).length > 0) {
              if (!allErrors[index]) allErrors[index] = {}
              allErrors[index] = { ...allErrors[index], ...fieldErrors }
            }
          }
        })
      })
    } else if (typeof updatedData === "object") {
      // Handle single object (org info, advocacy, competency)
      Object.entries(updatedData).forEach(([key, value]) => {
        const fieldErrors = validateField(key, value)
        Object.assign(allErrors, fieldErrors)
      })
    }

    setErrors(allErrors)
    return Object.keys(allErrors).length === 0
  }

  const handleChange = (e, index = null) => {
    const { name, value } = e.target

    if (Array.isArray(updatedData)) {
      // Handle organization heads array
      const updated = [...updatedData]
      updated[index][name] = value
      setUpdatedData(updated)

      // Clear specific field error
      if (errors[index]?.[name]) {
        const newErrors = { ...errors }
        delete newErrors[index][name]
        if (Object.keys(newErrors[index] || {}).length === 0) {
          delete newErrors[index]
        }
        setErrors(newErrors)
      }
    } else {
      // Handle single object
      setUpdatedData((prev) => ({ ...prev, [name]: value }))

      // Clear field error
      if (errors[name]) {
        const newErrors = { ...errors }
        delete newErrors[name]
        setErrors(newErrors)
      }
    }

    // Check for changes
    const hasChanged = JSON.stringify(updatedData) !== JSON.stringify(originalData)
    setHasChanges(hasChanged)
  }

  const handleSubmit = async () => {
    if (!validateAllFields()) {
      showToast("Please fix the errors before saving", "error")
      return
    }

    if (!hasChanges) {
      showToast("No changes detected", "info")
      return
    }

    try {
      setSaving(true)

      const res = await fetch(`${API_BASE_URL}/api/submissions/${submission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposed_data: updatedData,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "Failed to update submission")
      }

      showToast("Submission updated successfully", "success")
      onUpdate() // Refresh submission panel
      onClose() // Close modal
    } catch (err) {
      console.error("❌ Failed to update submission:", err)
      showToast(`Failed to update submission: ${err.message}`, "error")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = confirm("You have unsaved changes. Are you sure you want to cancel?")
      if (!confirmed) return
    }
    onClose()
  }

  const getSectionDisplayName = (section) => {
    const sectionNames = {
      organization: "Organization Information",
      advocacy: "Advocacy",
      competency: "Competency",
      org_heads: "Organization Heads",
    }
    return sectionNames[section] || section
  }

  const renderFormFields = () => {
    if (!submission) return null

    const { section } = submission

    // Organization Information Section
    if (section === "organization") {
      return (
        <div className={styles.formFields}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Organization Acronym: <span className={styles.required}>*</span>
              <input
                type="text"
                name="org"
                value={updatedData.org || ""}
                onChange={handleChange}
                className={`${styles.input} ${errors.org ? styles.inputError : ""}`}
                placeholder="e.g., DILG, DOH, DepEd"
              />
              {errors.org && <span className={styles.errorText}>{errors.org}</span>}
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Organization Name: <span className={styles.required}>*</span>
              <input
                type="text"
                name="orgName"
                value={updatedData.orgName || ""}
                onChange={handleChange}
                className={`${styles.input} ${errors.orgName ? styles.inputError : ""}`}
                placeholder="Full organization name"
              />
              {errors.orgName && <span className={styles.errorText}>{errors.orgName}</span>}
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Description:
              <textarea
                name="description"
                value={updatedData.description || ""}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Brief description of your organization"
                rows={4}
              />
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Email:
              <input
                type="email"
                name="email"
                value={updatedData.email || ""}
                onChange={handleChange}
                className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                placeholder="organization@example.com"
              />
              {errors.email && <span className={styles.errorText}>{errors.email}</span>}
            </label>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Facebook Link:
              <input
                type="url"
                name="facebook"
                value={updatedData.facebook || ""}
                onChange={handleChange}
                className={`${styles.input} ${errors.facebook ? styles.inputError : ""}`}
                placeholder="https://facebook.com/yourorganization"
              />
              {errors.facebook && <span className={styles.errorText}>{errors.facebook}</span>}
            </label>
          </div>
        </div>
      )
    }

    // Advocacy Section
    if (section === "advocacy") {
      return (
        <div className={styles.formFields}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Advocacy Description: <span className={styles.required}>*</span>
              <textarea
                name="advocacy"
                value={updatedData || ""}
                onChange={(e) => setUpdatedData(e.target.value)}
                className={`${styles.textarea} ${errors.advocacy ? styles.inputError : ""}`}
                placeholder="Describe your organization's advocacy and mission..."
                rows={6}
              />
              <div className={styles.characterCount}>{(updatedData || "").length}/1000 characters</div>
              {errors.advocacy && <span className={styles.errorText}>{errors.advocacy}</span>}
            </label>
          </div>
        </div>
      )
    }

    // Competency Section
    if (section === "competency") {
      return (
        <div className={styles.formFields}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Competency Description: <span className={styles.required}>*</span>
              <textarea
                name="competency"
                value={updatedData || ""}
                onChange={(e) => setUpdatedData(e.target.value)}
                className={`${styles.textarea} ${errors.competency ? styles.inputError : ""}`}
                placeholder="Describe your organization's core competencies and capabilities..."
                rows={6}
              />
              <div className={styles.characterCount}>{(updatedData || "").length}/1000 characters</div>
              {errors.competency && <span className={styles.errorText}>{errors.competency}</span>}
            </label>
          </div>
        </div>
      )
    }

    // Organization Heads Section
    if (section === "org_heads" && Array.isArray(updatedData)) {
      return (
        <div className={styles.formFields}>
          {updatedData.map((head, index) => (
            <div key={index} className={styles.headEditItem}>
              <div className={styles.headHeader}>
                <h4>Organization Head {index + 1}</h4>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Name: <span className={styles.required}>*</span>
                  <input
                    type="text"
                    name="head_name"
                    value={head.head_name || ""}
                    onChange={(e) => handleChange(e, index)}
                    className={`${styles.input} ${errors[index]?.head_name ? styles.inputError : ""}`}
                    placeholder="Full name"
                  />
                  {errors[index]?.head_name && <span className={styles.errorText}>{errors[index].head_name}</span>}
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Role/Position: <span className={styles.required}>*</span>
                  <input
                    type="text"
                    name="role"
                    value={head.role || ""}
                    onChange={(e) => handleChange(e, index)}
                    className={`${styles.input} ${errors[index]?.role ? styles.inputError : ""}`}
                    placeholder="e.g., Director, Manager, President"
                  />
                  {errors[index]?.role && <span className={styles.errorText}>{errors[index].role}</span>}
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Email:
                  <input
                    type="email"
                    name="email"
                    value={head.email || ""}
                    onChange={(e) => handleChange(e, index)}
                    className={`${styles.input} ${errors[index]?.email ? styles.inputError : ""}`}
                    placeholder="email@example.com"
                  />
                  {errors[index]?.email && <span className={styles.errorText}>{errors[index].email}</span>}
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Facebook (optional):
                  <input
                    type="url"
                    name="facebook"
                    value={head.facebook || ""}
                    onChange={(e) => handleChange(e, index)}
                    className={`${styles.input} ${errors[index]?.facebook ? styles.inputError : ""}`}
                    placeholder="https://facebook.com/profile"
                  />
                  {errors[index]?.facebook && <span className={styles.errorText}>{errors[index].facebook}</span>}
                </label>
              </div>
            </div>
          ))}
        </div>
      )
    }

    return <p>Unknown section type</p>
  }

  if (!submission) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Edit Submission</h2>
          <p className={styles.modalSubtitle}>
            You are editing the <strong>{getSectionDisplayName(submission.section)}</strong> section.
          </p>
          <button onClick={handleCancel} className={styles.modalCloseBtn} disabled={saving}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.submissionInfo}>
            <p>
              <strong>Status:</strong> <span className={styles.statusPending}>{submission.status}</span>
            </p>
            <p>
              <strong>Submitted:</strong> {new Date(submission.submitted_at).toLocaleString()}
            </p>
          </div>

          {renderFormFields()}
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.footerNote}>
            {hasChanges ? (
              <p className={styles.changesDetected}>✓ Changes detected</p>
            ) : (
              <p className={styles.noChanges}>No changes made</p>
            )}
          </div>

          <div className={styles.modalButtons}>
            <button onClick={handleCancel} className={styles.cancelBtn} disabled={saving}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className={`${styles.saveBtn} ${saving ? styles.saving : ""} ${!hasChanges ? styles.saveDisabled : ""}`}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <>
                  <span className={styles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
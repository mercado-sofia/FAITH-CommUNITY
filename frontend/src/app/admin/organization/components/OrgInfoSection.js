"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import styles from "./styles/OrgInfoSection.module.css"
import sharedStyles from "./styles/shared.module.css"
import UpdateSummaryModal from "./UpdateSummaryModal" // Import the shared UpdateSummaryModal

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export default function OrgInfoSection({ data, isEditMode, onEdit, onCancel, onSectionSave, showToast }) {
  const [formData, setFormData] = useState({
    logo: "",
    orgName: "",
    org: "",
    description: "",
    email: "",
    facebook: "",
  })
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showSummary, setShowSummary] = useState(false)
  const [changes, setChanges] = useState({}) // To store changes for the summary modal

  useEffect(() => {
    // Always synchronize formData with data when data or isEditMode changes
    setFormData({
      logo: data.logo || "",
      orgName: data.orgName || data.name || "",
      org: data.org || "",
      description: data.description || "",
      email: data.email || "",
      facebook: data.facebook || data.facebook_link || "",
    })
    setErrors({}) // Clear errors on data change or edit mode toggle
    setShowSummary(false) // Close summary modal
    setChanges({}) // Clear changes
  }, [data, isEditMode]) // Depend on data and isEditMode

  const validateForm = () => {
    const newErrors = {}

    if (!formData.orgName.trim()) {
      newErrors.orgName = "Organization name is required"
    }

    if (!formData.org.trim()) {
      newErrors.org = "Organization acronym is required"
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (formData.facebook && !formData.facebook.includes("facebook.com")) {
      newErrors.facebook = "Please enter a valid Facebook URL"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "error")
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size must be less than 5MB", "error")
      return
    }

    try {
      setUploading(true)
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)
      uploadFormData.append("type", "logo")

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: uploadFormData,
      })

      if (response.ok) {
        const result = await response.json()
        setFormData((prev) => ({ ...prev, logo: result.url }))
        showToast("Logo uploaded successfully", "success")
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      showToast("Failed to upload logo", "error")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = () => {
    if (!validateForm()) {
      showToast("Please fix the errors before saving", "error")
      return
    }

    const currentChanges = {}
    // Compare formData with original data to find changes
    for (const key in formData) {
      // Handle potential differences in key names (e.g., facebook vs facebook_link)
      const originalValue = data[key] || data[`${key}_link`] || ""
      const currentValue = formData[key] || ""

      if (currentValue !== originalValue) {
        currentChanges[key] = {
          from: originalValue, // Use 'from' and 'to' for field-level changes
          to: currentValue,
        }
      }
    }

    if (Object.keys(currentChanges).length === 0) {
      showToast("No changes detected", "info")
      onCancel() // Exit edit mode if no changes
      return
    }

    setChanges(currentChanges)
    setShowSummary(true)
  }

  const handleConfirmSave = async () => {
    if (!data?.id) {
      showToast("Organization ID not found", "error")
      return
    }

    try {
      setUploading(true) // Use uploading for the save operation
      const response = await fetch(`${API_BASE_URL}/api/organization/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        showToast("Organization information updated successfully", "success")
        onSectionSave(formData) // Update parent's state
        setShowSummary(false) // Close summary modal
        onCancel() // Exit edit mode
      } else {
        throw new Error(result.message || "Failed to update organization information")
      }
    } catch (error) {
      console.error("Update error:", error)
      showToast(`Failed to update: ${error.message}`, "error")
    } finally {
      setUploading(false)
    }
  }

  const handleCancelEdit = () => {
    // Reset formData to original data when cancelling
    setFormData({
      logo: data.logo || "",
      orgName: data.orgName || data.name || "",
      org: data.org || "",
      description: data.description || "",
      email: data.email || "",
      facebook: data.facebook || data.facebook_link || "",
    })
    setErrors({})
    setShowSummary(false)
    setChanges({})
    onCancel()
  }

  return (
    <div className={sharedStyles.sectionBox}>
      <div className={sharedStyles.sectionHeader}>
        <h3>Organization Information</h3>
        {!isEditMode && (
          <button onClick={onEdit} className={sharedStyles.editBtn}>
            Edit
          </button>
        )}
      </div>

      <div className={sharedStyles.sectionContent}>
        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.label}>
            Organization&rsquo;s Logo:
            {isEditMode ? (
              <div className={styles.fileUploadContainer}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className={styles.fileInput}
                />
                {uploading && <span className={styles.uploadingText}>Uploading...</span>}
                {formData.logo ? (
                  <div className={styles.imagePreview}>
                    <Image
                      src={formData.logo || "/placeholder.svg"}
                      alt="Organization Logo"
                      width={120}
                      height={120}
                      className={styles.logoPreview}
                      priority
                    />
                  </div>
                ) : (
                  <div className={styles.imagePreview}>
                    <span className={styles.placeholderText}>Upload Logo</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.imageDisplay}>
                {data.logo ? (
                  <Image
                    src={data.logo || "/placeholder.svg"}
                    alt="Organization Logo"
                    width={120}
                    height={120}
                    className={styles.logoDisplay}
                    priority
                  />
                ) : (
                  <span className={styles.placeholderText}>No Logo</span>
                )}
              </div>
            )}
          </label>
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.label}>
            Organization&rsquo;s Acronym: <span className={sharedStyles.required}>*</span>
            {isEditMode ? (
              <div>
                <input
                  type="text"
                  name="org"
                  value={formData.org}
                  onChange={handleChange}
                  className={`${sharedStyles.input} ${errors.org ? sharedStyles.inputError : ""}`}
                  placeholder="e.g., DILG, DOH, DepEd"
                />
                {errors.org && <span className={sharedStyles.errorText}>{errors.org}</span>}
              </div>
            ) : (
              <p className={sharedStyles.displayText}>{data.org}</p>
            )}
          </label>
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.label}>
            Organization&rsquo;s Name: <span className={sharedStyles.required}>*</span>
            {isEditMode ? (
              <div>
                <input
                  type="text"
                  name="orgName"
                  value={formData.orgName}
                  onChange={handleChange}
                  className={`${sharedStyles.input} ${errors.orgName ? sharedStyles.inputError : ""}`}
                  placeholder="Full organization name"
                />
                {errors.orgName && <span className={sharedStyles.errorText}>{errors.orgName}</span>}
              </div>
            ) : (
              <p className={sharedStyles.displayText}>{data.orgName}</p>
            )}
          </label>
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.label}>
            Description:
            {isEditMode ? (
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={sharedStyles.textarea}
                placeholder="Brief description of your organization"
                rows={4}
              />
            ) : (
              <p className={sharedStyles.displayText}>{data.description || "No description provided"}</p>
            )}
          </label>
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.label}>
            Email:
            {isEditMode ? (
              <div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`${sharedStyles.input} ${errors.email ? sharedStyles.inputError : ""}`}
                  placeholder="organization@example.com"
                />
                {errors.email && <span className={sharedStyles.errorText}>{errors.email}</span>}
              </div>
            ) : (
              <p className={sharedStyles.displayText}>{data.email || "No email provided"}</p>
            )}
          </label>
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.label}>
            Facebook Link:
            {isEditMode ? (
              <div>
                <input
                  type="url"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleChange}
                  className={`${sharedStyles.input} ${errors.facebook ? sharedStyles.inputError : ""}`}
                  placeholder="https://facebook.com/yourorganization"
                />
                {errors.facebook && <span className={sharedStyles.errorText}>{errors.facebook}</span>}
              </div>
            ) : data.facebook ? (
              <p className={sharedStyles.displayText}>
                <a href={data.facebook} target="_blank" rel="noopener noreferrer" className={sharedStyles.link}>
                  {data.facebook}
                </a>
              </p>
            ) : (
              <p className={sharedStyles.displayText}>No Facebook link provided</p>
            )}
          </label>
        </div>
        {isEditMode && (
          <div className={sharedStyles.actionButtons}>
            <button onClick={handleCancelEdit} className={sharedStyles.cancelBtn}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`${sharedStyles.saveBtn} ${uploading ? sharedStyles.saving : ""}`}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className={sharedStyles.spinner}></span>
                  Saving...
                </>
              ) : (
                "Review Changes"
              )}
            </button>
          </div>
        )}
      </div>

      {showSummary && (
        <UpdateSummaryModal
          changes={changes}
          onCancel={() => setShowSummary(false)}
          onSubmit={handleConfirmSave}
          submitting={uploading} // Use uploading state for modal's submitting prop
          title="Confirm Organization Information Changes"
          subtitle="Review the changes to your organization's information"
          note="These changes will be applied directly to the database."
          confirmButtonText="Confirm Changes"
        />
      )}
    </div>
  )
}
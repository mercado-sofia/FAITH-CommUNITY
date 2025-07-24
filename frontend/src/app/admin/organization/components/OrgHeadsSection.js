"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import sharedStyles from "./styles/shared.module.css"
import orgHeadsStyles from "./styles/OrgHeadsSection.module.css"
import UpdateSummaryModal from "./UpdateSummaryModal" // Import the shared UpdateSummaryModal

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export default function OrgHeadsSection({
  data = [],
  organizationId,
  isEditMode,
  onEdit,
  onCancel,
  onSectionSave,
  showToast,
}) {
  const [heads, setHeads] = useState([])
  const [uploading, setUploading] = useState({}) // For individual photo uploads and overall saving
  const [errors, setErrors] = useState({})
  const [showSummary, setShowSummary] = useState(false)
  const [changes, setChanges] = useState({}) // To store changes for the summary modal

  useEffect(() => {
    setHeads(data.length > 0 ? data : [])
    setErrors({})
    setUploading({})
    setShowSummary(false)
    setChanges({})
  }, [data, isEditMode]) // Depend on data and isEditMode

  const validateHead = (head) => {
    const headErrors = {}

    if (!head.head_name?.trim()) {
      headErrors.head_name = "Name is required"
    }

    if (!head.role?.trim()) {
      headErrors.role = "Role/Position is required"
    }

    if (head.email && !/\S+@\S+\.\S+/.test(head.email)) {
      headErrors.email = "Please enter a valid email address"
    }

    if (head.facebook && !head.facebook.includes("facebook.com")) {
      headErrors.facebook = "Please enter a valid Facebook URL"
    }

    return headErrors
  }

  const validateAllHeads = () => {
    const allErrors = {}
    let hasErrors = false

    heads.forEach((head, index) => {
      const headErrors = validateHead(head)
      if (Object.keys(headErrors).length > 0) {
        allErrors[index] = headErrors
        hasErrors = true
      }
    })

    setErrors(allErrors)
    return !hasErrors
  }

  const handleChange = (index, field, value) => {
    const updated = [...heads]
    updated[index][field] = value
    setHeads(updated)

    // Clear specific field error when user starts typing
    if (errors[index]?.[field]) {
      const newErrors = { ...errors }
      delete newErrors[index][field]
      if (Object.keys(newErrors[index] || {}).length === 0) {
        delete newErrors[index]
      }
      setErrors(newErrors)
    }
  }

  const handleFileChange = async (index, file) => {
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
      setUploading((prev) => ({ ...prev, [index]: true }))

      const uploadFormData = new FormData()
      uploadFormData.append("file", file)
      uploadFormData.append("type", "head_photo")

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: uploadFormData,
      })

      if (response.ok) {
        const result = await response.json()
        const updated = [...heads]
        updated[index].photo = result.url
        setHeads(updated)
        showToast("Photo uploaded successfully", "success")
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      showToast("Failed to upload photo", "error")
    } finally {
      setUploading((prev) => ({ ...prev, [index]: false }))
    }
  }

  const addHead = () => {
    setHeads([...heads, { photo: "", head_name: "", role: "", email: "", facebook: "" }])
  }

  const removeHead = (index) => {
    if (heads.length === 1) {
      showToast("At least one organization head is required", "error")
      return
    }

    const updated = [...heads]
    updated.splice(index, 1)
    setHeads(updated)

    // Remove errors for this index and adjust other indices
    const newErrors = {}
    Object.keys(errors).forEach((key) => {
      const idx = Number.parseInt(key)
      if (idx < index) {
        newErrors[idx] = errors[idx]
      } else if (idx > index) {
        newErrors[idx - 1] = errors[idx]
      }
    })
    setErrors(newErrors)

    showToast("Organization head removed", "info")
  }

  const handleSave = () => {
    if (heads.length === 0) {
      showToast("At least one organization head is required", "error")
      return
    }

    if (!validateAllHeads()) {
      showToast("Please fix the errors before saving", "error")
      return
    }

    // Calculate changes for the summary modal
    const currentChanges = {
      previous_data: data, // Original data
      proposed_data: heads, // Proposed data
    }

    // Check if there are any actual changes
    const hasChanges = JSON.stringify(heads) !== JSON.stringify(data)
    if (!hasChanges) {
      showToast("No changes detected", "info")
      onCancel() // Exit edit mode if no changes
      return
    }

    setChanges(currentChanges)
    setShowSummary(true)
  }

  const handleConfirmSave = async () => {
    if (!organizationId) {
      showToast("Organization ID not found", "error")
      return
    }

    try {
      setUploading((prev) => ({ ...prev, saving: true })) // Indicate overall saving

      const response = await fetch(`${API_BASE_URL}/api/heads/bulk`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization_id: organizationId,
          heads: heads,
        }),
      })

      const result = await response.json()

      if (result.success) {
        showToast("Organization heads updated successfully", "success")
        onSectionSave(heads) // Update parent's state
        setShowSummary(false) // Close summary modal
        onCancel() // Exit edit mode
      } else {
        throw new Error(result.message || "Failed to update organization heads")
      }
    } catch (error) {
      console.error("Update error:", error)
      showToast(`Failed to update: ${error.message}`, "error")
    } finally {
      setUploading((prev) => ({ ...prev, saving: false }))
    }
  }

  const handleCancelEdit = () => {
    setHeads(data.length > 0 ? data : []) // Reset heads to original data when cancelling
    setErrors({})
    setUploading({})
    setShowSummary(false)
    setChanges({})
    onCancel()
  }

  return (
    <div className={sharedStyles.sectionBox}>
      <div className={sharedStyles.sectionHeader}>
        <h3>Organization Heads</h3>
        {!isEditMode && (
          <button onClick={onEdit} className={sharedStyles.editBtn}>
            Edit
          </button>
        )}
      </div>

      <div className={sharedStyles.sectionContent}>
        {data.length === 0 && !isEditMode ? (
          <div className={orgHeadsStyles.noHeadsMessage}>No organization heads available.</div>
        ) : null}

        {(isEditMode ? heads : data).map((head, index) => (
          <div key={index} className={orgHeadsStyles.headItem}>
            <div className={orgHeadsStyles.headHeader}>
              <h4>Organization Head {index + 1}</h4>
              {isEditMode && heads.length > 1 && (
                <button onClick={() => removeHead(index)} className={sharedStyles.removeBtn}>
                  Remove
                </button>
              )}
            </div>

            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.label}>
                Photo:
                {isEditMode ? (
                  <div className={orgHeadsStyles.fileUploadContainer}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(index, e.target.files[0])}
                      disabled={uploading[index]}
                      className={orgHeadsStyles.fileInput}
                    />
                    {uploading[index] && <span className={orgHeadsStyles.uploadingText}>Uploading...</span>}
                    {head.photo ? (
                      <div className={orgHeadsStyles.imagePreview}>
                        <Image
                          src={head.photo || "/placeholder.svg"}
                          alt="Head photo"
                          width={80}
                          height={80}
                          className={orgHeadsStyles.headPhoto}
                        />
                      </div>
                    ) : (
                      <div className={orgHeadsStyles.imagePreview}>
                        <span className={orgHeadsStyles.placeholderText}>Upload Photo</span>
                      </div>
                    )}
                  </div>
                ) : (
                  head.photo && (
                    <div className={orgHeadsStyles.imageDisplay}>
                      <Image
                        src={head.photo || "/placeholder.svg"}
                        alt="Head photo"
                        width={80}
                        height={80}
                        className={orgHeadsStyles.headPhoto}
                      />
                    </div>
                  )
                )}
              </label>
            </div>

            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.label}>
                Name: <span className={sharedStyles.required}>*</span>
                {isEditMode ? (
                  <div>
                    <input
                      type="text"
                      value={head.head_name || ""}
                      onChange={(e) => handleChange(index, "head_name", e.target.value)}
                      className={`${sharedStyles.input} ${errors[index]?.head_name ? sharedStyles.inputError : ""}`}
                      placeholder="Full name"
                    />
                    {errors[index]?.head_name && (
                      <span className={sharedStyles.errorText}>{errors[index].head_name}</span>
                    )}
                  </div>
                ) : (
                  <p className={sharedStyles.displayText}>{head.head_name || "No name provided"}</p>
                )}
              </label>
            </div>

            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.label}>
                Role/Position: <span className={sharedStyles.required}>*</span>
                {isEditMode ? (
                  <div>
                    <input
                      type="text"
                      value={head.role || ""}
                      onChange={(e) => handleChange(index, "role", e.target.value)}
                      className={`${sharedStyles.input} ${errors[index]?.role ? sharedStyles.inputError : ""}`}
                      placeholder="e.g., Director, Manager, President"
                    />
                    {errors[index]?.role && <span className={sharedStyles.errorText}>{errors[index].role}</span>}
                  </div>
                ) : (
                  <p className={sharedStyles.displayText}>{head.role || "No role provided"}</p>
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
                      value={head.email || ""}
                      onChange={(e) => handleChange(index, "email", e.target.value)}
                      className={`${sharedStyles.input} ${errors[index]?.email ? sharedStyles.inputError : ""}`}
                      placeholder="email@example.com"
                    />
                    {errors[index]?.email && <span className={sharedStyles.errorText}>{errors[index].email}</span>}
                  </div>
                ) : (
                  <p className={sharedStyles.displayText}>{head.email || "No email provided"}</p>
                )}
              </label>
            </div>

            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.label}>
                Facebook (optional):
                {isEditMode ? (
                  <div>
                    <input
                      type="url"
                      value={head.facebook || ""}
                      onChange={(e) => handleChange(index, "facebook", e.target.value)}
                      className={`${sharedStyles.input} ${errors[index]?.facebook ? sharedStyles.inputError : ""}`}
                      placeholder="https://facebook.com/profile"
                    />
                    {errors[index]?.facebook && (
                      <span className={sharedStyles.errorText}>{errors[index].facebook}</span>
                    )}
                  </div>
                ) : (
                  <p className={sharedStyles.displayText}>
                    {head.facebook ? (
                      <a href={head.facebook} target="_blank" rel="noopener noreferrer" className={sharedStyles.link}>
                        {head.facebook}
                      </a>
                    ) : (
                      "No Facebook link provided"
                    )}
                  </p>
                )}
              </label>
            </div>
          </div>
        ))}

        {isEditMode && (
          <div className={sharedStyles.actionButtons}>
            <button onClick={addHead} className={sharedStyles.addBtn}>
              + Add Organization Head
            </button>
            <div className={sharedStyles.buttonGroup}>
              <button onClick={handleCancelEdit} className={sharedStyles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={`${sharedStyles.saveBtn} ${uploading.saving ? sharedStyles.saving : ""}`}
                disabled={uploading.saving}
              >
                {uploading.saving ? (
                  <>
                    <span className={sharedStyles.spinner}></span>
                    Saving...
                  </>
                ) : (
                  "Review Changes"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {showSummary && (
        <UpdateSummaryModal
          changes={{ orgHeads: changes }} // Wrap heads changes in an object for the modal
          onCancel={() => setShowSummary(false)}
          onSubmit={handleConfirmSave}
          submitting={uploading.saving}
          title="Confirm Organization Heads Changes"
          subtitle="Review the changes to your organization's heads"
          note="These changes will be applied directly to the database."
          confirmButtonText="Confirm Changes"
        />
      )}
    </div>
  )
}
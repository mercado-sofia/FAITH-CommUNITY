"use client"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import OrgInfoSection from "./components/OrgInfoSection"
import AdvocacySection from "./components/AdvocacySection"
import CompetencySection from "./components/CompetencySection"
import OrgHeadsSection from "./components/OrgHeadsSection"
import UpdateSummaryModal from "./components/UpdateSummaryModal"
import SubmissionStatusPanel from "./components/SubmissionStatusPanel"
import EditSubmissionModal from "./components/EditSubmissionModal"
import Toast from "./components/Toast"
import sharedStyles from "./components/styles/shared.module.css"
import styles from "./organization.module.css"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export default function ManageOrganizationPage() {
  const [orgData, setOrgData] = useState(null)
  const [changes, setChanges] = useState({})
  const [showSummary, setShowSummary] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadingFailed, setLoadingFailed] = useState(false)
  const [toast, setToast] = useState({ show: false, message: "", type: "success" })
  const [editMode, setEditMode] = useState({
    orgInfo: false,
    advocacies: false,
    competencies: false,
    orgHeads: false,
  })
  const [editingSubmission, setEditingSubmission] = useState(null)
  const [refreshSubmissions, setRefreshSubmissions] = useState(Date.now())

  const user = useSelector((state) => state.admin.admin)
  const orgAcronym = user?.org_name || user?.organization || user?.org || ""

  // Toast helper function
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type })
  }

  const closeToast = () => {
    setToast({ show: false, message: "", type: "success" })
  }

  useEffect(() => {
    if (!user?.id || !orgAcronym) {
      // Check for user.id and orgAcronym
      if (!user?.id) {
        // Only show toast if user is truly not available
        setLoadingFailed(true)
        showToast("Admin user information not found. Please ensure you are logged in.", "error")
      } else if (!orgAcronym) {
        showToast("Organization acronym not found for this admin.", "error")
      }
      setLoading(false)
      return
    }

    const fetchOrgData = async () => {
      try {
        setLoading(true)
        setLoadingFailed(false)

        const res = await fetch(`${API_BASE_URL}/api/organization/org/${orgAcronym}`)
        const data = await res.json()

        if (data.success && data.data) {
          setOrgData(data.data)
          setLoadingFailed(false)
        } else {
          setOrgData(null)
          setLoadingFailed(true)
          showToast(data.message || "Failed to load organization data", "error")
        }
      } catch (err) {
        console.error("❌ Fetch error:", err)
        setOrgData(null)
        setLoadingFailed(true)
        showToast("Network error while loading data", "error")
      } finally {
        setLoading(false)
      }
    }

    fetchOrgData()
  }, [user, orgAcronym])

  const handleSectionSave = (section, updatedData) => {
    if (!orgData) {
      showToast("Organization data not available", "error")
      return
    }

    // For orgInfo and orgHeads, the API call was already made in the component
    // We just need to update local state and exit edit mode
    if (section === "orgInfo" || section === "orgHeads") {
      setOrgData((prev) => {
        if (section === "orgInfo") {
          return { ...prev, ...updatedData }
        } else if (section === "orgHeads") {
          return { ...prev, heads: updatedData }
        }
        return prev
      })

      setEditMode((prev) => ({ ...prev, [section]: false }))
      return
    }

    // For advocacy and competency, continue with the approval process
    const originalData = {
      advocacies: orgData.advocacies || "",
      competencies: orgData.competencies || "",
    }

    const oldData = originalData[section]
    let hasChange = false

    if (typeof updatedData === "string") {
      hasChange = updatedData !== oldData
    }

    if (!hasChange) {
      showToast("No changes detected", "info")
      setEditMode((prev) => ({ ...prev, [section]: false }))
      return
    }

    setChanges((prev) => ({
      ...prev,
      [section]: {
        previous_data: oldData,
        proposed_data: updatedData,
      },
    }))

    setEditMode((prev) => ({ ...prev, [section]: false }))
    setShowSummary(true)
    showToast("Changes saved for review", "success")
  }

  const handleSectionCancel = (section) => {
    setEditMode((prev) => ({ ...prev, [section]: false }))
    showToast("Edit cancelled", "info")
  }

  const handleSubmitForApproval = async () => {
    if (!orgData || Object.keys(changes).length === 0 || !user?.id) {
      showToast("Missing data for submission", "error")
      return
    }

    try {
      setSubmitting(true)
      const submissionPayload = []
      const sectionMapping = {
        orgInfo: "organization",
        advocacies: "advocacy",
        competencies: "competency",
        orgHeads: "org_heads",
      }

      for (const section in changes) {
        if (!changes.hasOwnProperty(section)) continue

        const { previous_data, proposed_data } = changes[section]

        submissionPayload.push({
          organization_id: orgData.id,
          section: sectionMapping[section] || section,
          previous_data,
          proposed_data,
          submitted_by: user.id,
        })
      }

      const res = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissions: submissionPayload }),
      })

      const result = await res.json()

      if (result.success) {
        showToast(result.message || "Changes submitted for approval successfully!", "success")
        setShowSummary(false)
        setChanges({})
        setRefreshSubmissions(Date.now())
      } else {
        console.error("❌ Submission error (API response):", result)
        showToast(result.message || "Failed to submit changes", "error")
      }
    } catch (err) {
      console.error("❌ Submission error (network/client-side):", err)
      showToast("Network error during submission", "error")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={sharedStyles.loadingContainer}>
        <div className={sharedStyles.spinner}></div>
        <p>Loading organization data...</p>
      </div>
    )
  }

  if (loadingFailed) {
    return (
      <div className={sharedStyles.errorContainer}>
        <p className={sharedStyles.errorMessage}>❌ Failed to load organization data.</p>
        <button onClick={() => window.location.reload()} className={sharedStyles.retryBtn}>
          Retry
        </button>
      </div>
    )
  }

  if (!orgData) {
    return (
      <div className={sharedStyles.errorContainer}>
        <p>No organization data found.</p>
      </div>
    )
  }

  return (
    <div className={styles.manageOrgPageWrapper}>
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      <div className={styles.leftColumn}>
        <OrgInfoSection
          data={orgData}
          isEditMode={editMode.orgInfo}
          onEdit={() => setEditMode((prev) => ({ ...prev, orgInfo: true }))}
          onCancel={() => handleSectionCancel("orgInfo")}
          onSectionSave={(updatedData) => handleSectionSave("orgInfo", updatedData)}
          showToast={showToast}
        />
        <AdvocacySection
          data={orgData.advocacies}
          isEditMode={editMode.advocacies}
          onEdit={() => setEditMode((prev) => ({ ...prev, advocacies: true }))}
          onCancel={() => handleSectionCancel("advocacies")}
          onSectionSave={(updatedData) => handleSectionSave("advocacies", updatedData)}
          showToast={showToast}
        />
        <CompetencySection
          data={orgData.competencies}
          isEditMode={editMode.competencies}
          onEdit={() => setEditMode((prev) => ({ ...prev, competencies: true }))}
          onCancel={() => handleSectionCancel("competencies")}
          onSectionSave={(updatedData) => handleSectionSave("competencies", updatedData)}
          showToast={showToast}
        />
        <OrgHeadsSection
          data={orgData.heads}
          organizationId={orgData.id}
          isEditMode={editMode.orgHeads}
          onEdit={() => setEditMode((prev) => ({ ...prev, orgHeads: true }))}
          onCancel={() => handleSectionCancel("orgHeads")}
          onSectionSave={(updatedData) => handleSectionSave("orgHeads", updatedData)}
          showToast={showToast}
        />

        {showSummary && Object.keys(changes).some((key) => key === "advocacies" || key === "competencies") && (
          <UpdateSummaryModal
            changes={changes}
            onCancel={() => setShowSummary(false)}
            onSubmit={handleSubmitForApproval}
            submitting={submitting}
            title="Submit Changes for Approval"
            subtitle="Review your changes before submitting for approval"
            note="These changes will be sent to the superadmin for approval. Your organization data will only be updated after approval."
            confirmButtonText="Submit for Approval"
          />
        )}
      </div>

      <div className={styles.rightColumn}>
        <SubmissionStatusPanel
          orgAcronym={String(orgAcronym)}
          refreshTrigger={refreshSubmissions}
          onEditRequest={(submission) => setEditingSubmission(submission)}
          showToast={showToast}
        />
      </div>

      {editingSubmission && (
        <EditSubmissionModal
          submission={editingSubmission}
          onClose={() => setEditingSubmission(null)}
          onUpdate={() => {
            setEditingSubmission(null)
            setRefreshSubmissions(Date.now())
            showToast("Submission updated successfully", "success")
          }}
          showToast={showToast}
        />
      )}
    </div>
  )
}
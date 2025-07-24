"use client"

import { useEffect, useState, useCallback } from "react"
import sharedStyles from "./styles/shared.module.css"
import statusStyles from "./styles/SubmissionStatusPanel.module.css"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export default function SubmissionStatusPanel({ orgAcronym, refreshTrigger, onEditRequest, showToast }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState({})

  const fetchSubmissions = useCallback(async () => {
    if (!orgAcronym) {
      setError("Organization acronym not found")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${API_BASE_URL}/api/submissions/${orgAcronym}`)
      const data = await res.json()

      if (data.success) {
        setSubmissions(data.data || [])
      } else {
        throw new Error(data.message || "Failed to fetch submissions")
      }
    } catch (err) {
      console.error("Failed to fetch submissions:", err)
      setError(err.message)
      showToast("Failed to load submissions", "error")
    } finally {
      setLoading(false)
    }
  }, [orgAcronym, showToast])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions, refreshTrigger])

  const handleCancel = async (submissionId) => {
    const submission = submissions.find((s) => s.id === submissionId)
    if (!submission) return

    const confirmed = confirm(
      `Are you sure you want to cancel the submission for "${submission.section}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setCancelling((prev) => ({ ...prev, [submissionId]: true }))

      const res = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`, {
        method: "DELETE",
      })

      const result = await res.json()

      if (result.success) {
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId))
        showToast(result.message || "Submission cancelled successfully", "success")
      } else {
        throw new Error(result.message || "Failed to cancel submission")
      }
    } catch (err) {
      console.error("Failed to cancel submission:", err)
      showToast(`Failed to cancel submission: ${err.message}`, "error")
    } finally {
      setCancelling((prev) => ({ ...prev, [submissionId]: false }))
    }
  }

  const handleEdit = (submission) => {
    if (submission.status !== "pending") {
      showToast("Only pending submissions can be edited", "error")
      return
    }
    onEditRequest(submission)
  }

  const renderDiff = (prev, next) => {
    if (!prev || !next) return null

    if (typeof prev === "string" || typeof next === "string") {
      return (
        <li className={statusStyles.diffItem}>
          <div className={statusStyles.diffField}>
            <strong>Previous:</strong> <span className={statusStyles.oldValue}>{prev || "—"}</span>
          </div>
          <div className={statusStyles.diffField}>
            <strong>Updated:</strong> <span className={statusStyles.newValue}>{next || "—"}</span>
          </div>
        </li>
      )
    }

    if (Array.isArray(prev) && Array.isArray(next)) {
      return next.map((newItem, index) => {
        const oldItem = prev[index] || {}
        return (
          <li key={index} className={statusStyles.diffItem}>
            <strong>Item {index + 1}</strong>
            <ul className={statusStyles.nestedDiff}>
              {Object.entries(newItem).map(([key, newVal]) => {
                const oldVal = oldItem[key] || ""
                return oldVal !== newVal ? (
                  <li key={key} className={statusStyles.fieldDiff}>
                    <strong>{key}:</strong>
                    <span className={statusStyles.oldValue}>{oldVal || "—"}</span> →
                    <span className={statusStyles.newValue}>{newVal || "—"}</span>
                  </li>
                ) : null
              })}
            </ul>
          </li>
        )
      })
    }

    return Object.entries(next).map(([key, newVal]) => {
      const oldVal = prev?.[key] || ""
      return oldVal !== newVal ? (
        <li key={key} className={statusStyles.diffItem}>
          <strong>{key}:</strong>
          <span className={statusStyles.oldValue}>{oldVal || "—"}</span> →
          <span className={statusStyles.newValue}>{newVal || "—"}</span>
        </li>
      ) : null
    })
  }

  const getStatusBadge = (status) => {
    const statusClass =
      {
        pending: statusStyles.statusPending,
        approved: statusStyles.statusApproved,
        rejected: statusStyles.statusRejected,
      }[status] || statusStyles.statusDefault

    return <span className={`${statusStyles.statusBadge} ${statusClass}`}>{status}</span>
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return "Invalid date"
    }
  }

  if (loading) {
    return (
      <div className={statusStyles.statusPanel}>
        <h3>Submitted Changes</h3>
        <div className={sharedStyles.loadingContainer}>
          <div className={sharedStyles.spinner}></div>
          <p>Loading submissions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={statusStyles.statusPanel}>
        <h3>Submitted Changes</h3>
        <div className={sharedStyles.errorContainer}>
          <p className={sharedStyles.errorMessage}>❌ {error}</p>
          <button onClick={fetchSubmissions} className={sharedStyles.retryBtn}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={statusStyles.statusPanel}>
      <div className={statusStyles.panelHeader}>
        <h3>Submitted Changes</h3>
        <button onClick={fetchSubmissions} className={sharedStyles.refreshBtn} title="Refresh">
          🔄
        </button>
      </div>

      {submissions.length === 0 ? (
        <div className={sharedStyles.emptyState}>
          <p>No submissions yet.</p>
          <small>Changes you submit for approval will appear here.</small>
        </div>
      ) : (
        <div className={statusStyles.submissionsList}>
          {submissions.map((submission) => (
            <div key={submission.id} className={statusStyles.submissionCard}>
              <div className={statusStyles.submissionHeader}>
                <div>
                  <p className={statusStyles.sectionTitle}>
                    <strong>Section:</strong> {submission.section}
                  </p>
                  <p className={statusStyles.submissionDate}>
                    <strong>Date:</strong> {formatDate(submission.submitted_at)}
                  </p>
                  {submission.submitted_by_name && (
                    <p className={statusStyles.submissionDate}>
                      <strong>By:</strong> {submission.submitted_by_name}
                    </p>
                  )}
                </div>
                {getStatusBadge(submission.status)}
              </div>

              <div className={statusStyles.changesPreview}>
                <strong>Changes:</strong>
                <ul className={statusStyles.diffList}>
                  {renderDiff(submission.previous_data, submission.proposed_data)}
                </ul>
              </div>

              {submission.status === "pending" && (
                <div className={sharedStyles.actionButtons}>
                  <button
                    className={sharedStyles.editBtn}
                    onClick={() => handleEdit(submission)}
                    disabled={cancelling[submission.id]}
                  >
                    Edit
                  </button>
                  <button
                    className={sharedStyles.cancelBtn}
                    onClick={() => handleCancel(submission.id)}
                    disabled={cancelling[submission.id]}
                  >
                    {cancelling[submission.id] ? "Cancelling..." : "Cancel"}
                  </button>
                </div>
              )}

              {submission.status === "rejected" && submission.rejection_reason && (
                <div className={statusStyles.rejectionReason}>
                  <strong>Rejection Reason:</strong> {submission.rejection_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
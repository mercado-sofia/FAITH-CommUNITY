"use client"

import { useState } from "react"
import styles from "./styles/Modal.module.css" // Corrected import path for Modal's specific styles
import sharedStyles from "./styles/shared.module.css" // Import shared styles for spinner

export default function UpdateSummaryModal({
  changes,
  onCancel,
  onSubmit,
  submitting,
  title = "Update Summary",
  subtitle = "Review your changes",
  note = "Please review the changes carefully before proceeding.",
  confirmButtonText = "Confirm Changes",
}) {
  const [isExpanded, setIsExpanded] = useState({})

  const toggleExpanded = (section) => {
    setIsExpanded((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const renderDiff = (prev, next) => {
    if (!prev && !next) return null // No data for comparison

    // Handle simple string changes (e.g., advocacy, competency)
    if (typeof prev === "string" || typeof next === "string") {
      return (
        <div className={styles.diffContainer}>
          <div className={styles.diffField}>
            <strong>Previous:</strong>
            <div className={styles.diffValue}>{prev || <em className={styles.emptyValue}>Empty</em>}</div>
          </div>
          <div className={styles.diffField}>
            <strong>Updated:</strong>
            <div className={styles.diffValue}>{next || <em className={styles.emptyValue}>Empty</em>}</div>
          </div>
        </div>
      )
    }

    // Handle array changes (e.g., organization heads)
    if (Array.isArray(prev) || Array.isArray(next)) {
      const allItems = Array.from(
        new Set([...(prev || []), ...(next || [])].map((item) => item.id || JSON.stringify(item))),
      )

      return (
        <div className={styles.diffContainer}>
          {allItems.map((itemId, index) => {
            const oldItem = (prev || []).find((item) => (item.id || JSON.stringify(item)) === itemId) || {}
            const newItem = (next || []).find((item) => (item.id || JSON.stringify(item)) === itemId) || {}

            const hasChanges =
              Object.entries(newItem).some(([key, newVal]) => {
                const oldVal = oldItem[key] || ""
                return oldVal !== newVal
              }) || Object.keys(oldItem).length !== Object.keys(newItem).length // Check for added/removed fields

            if (!hasChanges && oldItem.id && newItem.id) return null // If no changes and item exists in both, don't show

            const isNew = !oldItem.id && newItem.id
            const isRemoved = oldItem.id && !newItem.id

            return (
              <div key={itemId || index} className={styles.headDiff}>
                <strong>{isNew ? "New Head" : isRemoved ? "Removed Head" : `Head ${index + 1}`}:</strong>
                <div className={styles.headChanges}>
                  {Object.entries(newItem).map(([key, newVal]) => {
                    const oldVal = oldItem[key] || ""
                    return oldVal !== newVal ? (
                      <div key={key} className={styles.fieldChange}>
                        <strong>{key}:</strong>
                        <span className={styles.oldValue}>
                          {oldVal || <em className={styles.emptyValue}>Empty</em>}
                        </span>{" "}
                        →
                        <span className={styles.newValue}>
                          {newVal || <em className={styles.emptyValue}>Empty</em>}
                        </span>
                      </div>
                    ) : null
                  })}
                  {/* Show fields that were removed from an existing head */}
                  {!isNew &&
                    Object.entries(oldItem).map(([key, oldVal]) => {
                      if (!(key in newItem)) {
                        return (
                          <div key={key} className={styles.fieldChange}>
                            <strong>{key}:</strong>
                            <span className={styles.oldValue}>
                              {oldVal || <em className={styles.emptyValue}>Empty</em>}
                            </span>{" "}
                            →
                            <span className={styles.newValue}>
                              <em className={styles.emptyValue}>Removed</em>
                            </span>
                          </div>
                        )
                      }
                      return null
                    })}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    // Handle object changes (e.g., org info fields)
    return (
      <div className={styles.diffContainer}>
        {Object.entries(next).map(([key, newVal]) => {
          const oldVal = prev?.[key] || ""
          return oldVal !== newVal ? (
            <div key={key} className={styles.fieldChange}>
              <strong>{key}:</strong>
              <span className={styles.oldValue}>{oldVal || <em className={styles.emptyValue}>Empty</em>}</span> →
              <span className={styles.newValue}>{newVal || <em className={styles.emptyValue}>Empty</em>}</span>
            </div>
          ) : null
        })}
      </div>
    )
  }

  const getSectionDisplayName = (section) => {
    const sectionNames = {
      orgInfo: "Organization Information",
      advocacies: "Advocacy",
      competencies: "Competency",
      orgHeads: "Organization Heads",
      // For OrgInfoSection, the 'section' key will be the field name
      orgName: "Organization Name",
      org: "Organization Acronym",
      description: "Description",
      email: "Email",
      facebook: "Facebook Link",
      logo: "Logo",
    }
    return sectionNames[section] || section
  }

  const getTotalChangesCount = () => {
    let count = 0
    for (const sectionKey in changes) {
      const change = changes[sectionKey]
      if (change && typeof change === "object" && "previous_data" in change && "proposed_data" in change) {
        // This is a section-level change (advocacies, competencies, orgHeads)
        count++
      } else if (change && typeof change === "object" && "from" in change && "to" in change) {
        // This is a field-level change (orgInfo)
        count++
      }
    }
    return count
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>{title}</h2>
          <p className={styles.modalSubtitle}>
            {subtitle} ({getTotalChangesCount()} item{getTotalChangesCount() !== 1 ? "s" : ""} modified)
          </p>
        </div>

        <div className={styles.summaryContent}>
          {Object.entries(changes).map(([section, changeData]) => {
            let previous_data, proposed_data

            // Determine if it's a section-level change or a field-level change
            if (
              changeData &&
              typeof changeData === "object" &&
              "previous_data" in changeData &&
              "proposed_data" in changeData
            ) {
              previous_data = changeData.previous_data
              proposed_data = changeData.proposed_data
            } else if (changeData && typeof changeData === "object" && "from" in changeData && "to" in changeData) {
              // This is a field-level change from OrgInfoSection
              previous_data = changeData.from
              proposed_data = changeData.to
            } else {
              return null // Skip malformed change entries
            }

            return (
              <div key={section} className={styles.summarySection}>
                <div className={styles.sectionHeader} onClick={() => toggleExpanded(section)}>
                  <h4>{getSectionDisplayName(section)}</h4>
                  <button className={styles.expandBtn}>{isExpanded[section] ? "▼" : "▶"}</button>
                </div>

                {isExpanded[section] && (
                  <div className={styles.sectionChanges}>{renderDiff(previous_data, proposed_data)}</div>
                )}
              </div>
            )
          })}
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.footerNote}>
            <p>
              <strong>Note:</strong> {note}
            </p>
          </div>

          <div className={styles.modalButtons}>
            <button onClick={onCancel} className={sharedStyles.cancelBtn} disabled={submitting}>
              Cancel
            </button>
            <button
              onClick={onSubmit}
              className={`${sharedStyles.submitBtn} ${submitting ? sharedStyles.submitting : ""}`}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className={sharedStyles.spinner}></span>
                  {confirmButtonText.replace("Changes", "ing...")}
                </>
              ) : (
                confirmButtonText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
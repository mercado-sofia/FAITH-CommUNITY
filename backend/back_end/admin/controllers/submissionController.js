// controllers/submissionController.js
import db from "../../database.js"

// Validation helper for submission data
const validateSubmissionItem = (item) => {
  const errors = []

  if (!item.organization_id) {
    errors.push("organization_id is required")
  }

  if (!item.section) {
    errors.push("section is required")
  }

  // previous_data and proposed_data can be empty objects/strings, but must be present
  if (item.previous_data === undefined || item.previous_data === null) {
    errors.push("previous_data is required")
  }

  if (item.proposed_data === undefined || item.proposed_data === null) {
    errors.push("proposed_data is required")
  }

  if (!item.submitted_by) {
    errors.push("submitted_by is required")
  }

  // Validate section types
  const validSections = ["organization", "advocacy", "competency", "org_heads", "programs"]
  if (item.section && !validSections.includes(item.section)) {
    errors.push(`Invalid section. Must be one of: ${validSections.join(", ")}`)
  }

  return errors
}

export const submitChanges = async (req, res) => {
  console.log("[DEBUG] submitChanges called with body:", JSON.stringify(req.body, null, 2))
  const { submissions } = req.body

  // Input validation
  if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Submissions array is required and cannot be empty",
    })
  }

  // Validate each submission item
  const validationErrors = []
  submissions.forEach((item, index) => {
    const itemErrors = validateSubmissionItem(item)
    if (itemErrors.length > 0) {
      validationErrors.push(`Submission ${index + 1}: ${itemErrors.join(", ")}`)
    }
  })

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: validationErrors,
    })
  }

  try {
    // Start transaction
    await db.query("START TRANSACTION")

    // Get unique organization identifiers from submissions
    const orgIdentifiers = [...new Set(submissions.map((item) => item.organization_id))]
    console.log("[DEBUG] Organization identifiers to validate:", orgIdentifiers)
    
    // Query organizations table to get numeric IDs for both numeric IDs and acronyms
    const placeholders = orgIdentifiers.map(() => "?").join(",")
    const [orgCheck] = await db.execute(
      `SELECT id, org FROM organizations WHERE id IN (${placeholders}) OR org IN (${placeholders})`,
      [...orgIdentifiers, ...orgIdentifiers]
    )
    
    console.log("[DEBUG] Found organizations:", orgCheck)
    
    // Create mapping from identifier to numeric ID
    const orgIdMap = new Map()
    orgCheck.forEach(org => {
      orgIdMap.set(org.id.toString(), org.id)
      orgIdMap.set(org.org, org.id)
    })
    
    console.log("[DEBUG] Organization ID mapping:", Object.fromEntries(orgIdMap))
    
    // Check if all identifiers were found
    const missingOrgs = orgIdentifiers.filter(id => !orgIdMap.has(id.toString()))
    if (missingOrgs.length > 0) {
      await db.query("ROLLBACK")
      return res.status(404).json({
        success: false,
        message: "One or more organizations not found",
        missing: missingOrgs
      })
    }

    // Insert submissions with converted numeric organization IDs
    const insertPromises = submissions.map((item) => {
      const numericOrgId = orgIdMap.get(item.organization_id.toString())
      console.log(`[DEBUG] Converting org identifier ${item.organization_id} to numeric ID ${numericOrgId}`)
      
      return db.execute(
        `INSERT INTO submissions (organization_id, section, previous_data, proposed_data, submitted_by, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          numericOrgId,
          item.section,
          JSON.stringify(item.previous_data),
          JSON.stringify(item.proposed_data),
          item.submitted_by,
          "pending",
        ]
      )
    })

    console.log("🔍 Incoming submission payload:", req.body);

    await Promise.all(insertPromises)

    // Commit transaction
    await db.query("COMMIT")

    res.status(201).json({
      success: true,
      message: `${submissions.length} submission(s) recorded successfully`,
      count: submissions.length,
    })
  } catch (error) {
    await db.query("ROLLBACK")
    console.error("❌ Error saving submissions:", error)
    res.status(500).json({
      success: false,
      message: "Failed to save submissions",
      error: error.message,
    })
  }
}

export const getSubmissionsByOrg = async (req, res) => {
  const { orgAcronym } = req.params

  if (!orgAcronym) {
    return res.status(400).json({
      success: false,
      message: "Organization acronym is required",
    })
  }

  try {
    // Get organization ID
    const [orgRows] = await db.execute("SELECT id, orgName FROM organizations WHERE org = ?", [orgAcronym])

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      })
    }

    const org = orgRows[0]
    console.log(`[DEBUG] Fetching submissions for org: ${orgAcronym}, numeric ID: ${org.id}`)

    // Get submissions with additional info
    const [rows] = await db.execute(
      `SELECT s.*, a.orgName as submitted_by_name 
       FROM submissions s 
       LEFT JOIN admins a ON s.submitted_by = a.id 
       WHERE s.organization_id = ? 
       ORDER BY s.submitted_at DESC`,
      [org.id],
    )
    
    console.log(`[DEBUG] Found ${rows.length} submissions for org ${orgAcronym}:`)
    rows.forEach(row => {
      console.log(`[DEBUG] - ID: ${row.id}, Section: ${row.section}, Status: ${row.status}, OrgID: ${row.organization_id}`)
    })

    // Parse JSON data and add metadata
    const parsedRows = rows.map((row) => {
      let previous_data_parsed = {}
      let proposed_data_parsed = {}
      let parse_error = false

      try {
        previous_data_parsed = JSON.parse(row.previous_data)
      } catch (e) {
        console.warn(`Warning: Failed to parse previous_data for submission ID ${row.id}:`, e.message)
        previous_data_parsed = { error: "Invalid JSON data" }
        parse_error = true
      }

      try {
        proposed_data_parsed = JSON.parse(row.proposed_data)
      } catch (e) {
        console.warn(`Warning: Failed to parse proposed_data for submission ID ${row.id}:`, e.message)
        proposed_data_parsed = { error: "Invalid JSON data" }
        parse_error = true
      }

      return {
        ...row,
        previous_data: previous_data_parsed,
        proposed_data: proposed_data_parsed,
        organization_name: org.orgName,
        can_edit: row.status === "pending",
        can_cancel: row.status === "pending",
        parse_error: parse_error, // Indicate if any parsing error occurred for this row
      }
    })

    // Return success even if some rows have parsing errors, as the query itself was successful
    res.json({
      success: true,
      data: parsedRows,
      organization: {
        id: org.id,
        name: org.orgName,
        acronym: orgAcronym,
      },
      count: parsedRows.length,
    })
  } catch (error) {
    console.error("❌ Error fetching submissions:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch submissions",
      error: error.message,
    })
  }
}

export const cancelSubmission = async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Submission ID is required",
    })
  }

  try {
    // First check if submission exists
    const [existing] = await db.execute("SELECT id, status, section FROM submissions WHERE id = ?", [id])

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      })
    }

    // Delete the submission (allow deletion regardless of status)
    const [result] = await db.execute('DELETE FROM submissions WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to cancel submission",
      })
    }

    res.json({
      success: true,
      message: `Submission for ${existing[0].section} deleted successfully`,
    })
  } catch (error) {
    await db.query("ROLLBACK")
    console.error("❌ Error cancelling submission:", error)
    res.status(500).json({
      success: false,
      message: "Failed to cancel submission",
      error: error.message,
    })
  }
}

export const updateSubmission = async (req, res) => {
  const { id } = req.params
  const { proposed_data } = req.body

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Submission ID is required",
    })
  }

  if (proposed_data === undefined || proposed_data === null) {
    return res.status(400).json({
      success: false,
      message: "Proposed data is required",
    })
  }

  try {
    // First check if submission exists and is pending
    const [existing] = await db.execute("SELECT id, status, section FROM submissions WHERE id = ?", [id])

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      })
    }

    if (existing[0].status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot edit submission with status: ${existing[0].status}`,
      })
    }

    // Validate proposed_data structure based on section
    let isValidData = true
    const section = existing[0].section

    try {
      if (section === "org_heads" && !Array.isArray(proposed_data)) {
        isValidData = false
      } else if (["advocacy", "competency"].includes(section) && typeof proposed_data !== "string") {
        isValidData = false
      } else if (section === "organization" && typeof proposed_data !== "object") {
        isValidData = false
      } else if (section === "programs" && typeof proposed_data !== "object") {
        isValidData = false
      }
    } catch (validationError) {
      isValidData = false
    }

    if (!isValidData) {
      return res.status(400).json({
        success: false,
        message: `Invalid data format for section: ${section}`,
      })
    }

    // Update the submission
    const [result] = await db.execute(
      'UPDATE submissions SET proposed_data = ? WHERE id = ? AND status = "pending"',
      [JSON.stringify(proposed_data), id],
    )

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to update submission",
      })
    }

    res.json({
      success: true,
      message: `Submission for ${section} updated successfully`,
    })
  } catch (error) {
    await db.query("ROLLBACK")
    console.error("❌ Error updating submission:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update submission",
      error: error.message,
    })
  }
}

// Additional endpoint to get submission by ID
export const getSubmissionById = async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Submission ID is required",
    })
  }

  try {
    const [rows] = await db.execute(
      `SELECT s.*, o.orgName, o.org, a.orgName as submitted_by_name 
       FROM submissions s 
       LEFT JOIN organizations o ON s.organization_id = o.id 
       LEFT JOIN admins a ON s.submitted_by = a.id 
       WHERE s.id = ?`,
      [id],
    )

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      })
    }

    const submission = rows[0]

    // Parse JSON data
    try {
      submission.previous_data = JSON.parse(submission.previous_data)
      submission.proposed_data = JSON.parse(submission.proposed_data)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      return res.status(500).json({
        success: false,
        message: "Data parsing error",
      })
    }

    res.json({
      success: true,
      data: submission,
    })
  } catch (error) {
    console.error("❌ Error fetching submission:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch submission",
      error: error.message,
    })
  }
}
// db table: submissions
import db from "../../database.js"
import SuperAdminNotificationController from "../../superadmin/controllers/superadminNotificationController.js"

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
    
    // Query organizations table to get numeric IDs for both numeric IDs and acronyms
    const placeholders = orgIdentifiers.map(() => "?").join(",")
    
    const [orgCheck] = await db.execute(
      `SELECT id, org FROM organizations WHERE id IN (${placeholders}) OR org IN (${placeholders})`,
      [...orgIdentifiers, ...orgIdentifiers]
    )
    
    // Create mapping from identifier to numeric ID
    const orgIdMap = new Map()
    orgCheck.forEach(org => {
      orgIdMap.set(org.id.toString(), org.id)
      orgIdMap.set(org.org, org.id)
    })
    
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

    // Insert submissions with converted numeric organization IDs and collect their IDs
    const insertPromises = submissions.map(async (item) => {
      const numericOrgId = orgIdMap.get(item.organization_id.toString())
      
      const [result] = await db.execute(
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
      
      return {
        submissionId: result.insertId,
        item: item,
        numericOrgId: numericOrgId
      }
    })

    const insertedSubmissions = await Promise.all(insertPromises)

    // Get superadmin ID for notifications (assuming there's only one superadmin)
    const [superadminRows] = await db.execute("SELECT id FROM superadmin LIMIT 1")
    const superadminId = superadminRows.length > 0 ? superadminRows[0].id : null

    // Create superadmin notifications for each submission
    if (superadminId) {
      for (const insertedSubmission of insertedSubmissions) {
        const { submissionId, item, numericOrgId } = insertedSubmission
        
        // Get organization data for the notification
        const [orgRows] = await db.execute(
          "SELECT org, orgName FROM organizations WHERE id = ? LIMIT 1",
          [numericOrgId]
        )
        const orgAcronym = orgRows.length > 0 ? orgRows[0].org : 'Unknown'

        // Create notification based on section
        let title = `New ${item.section.charAt(0).toUpperCase() + item.section.slice(1)} Submission`
        let message = `${orgAcronym} has submitted a new ${item.section} for approval.`

        // Special handling for programs
        if (item.section === 'programs') {
          try {
            const proposedData = JSON.parse(item.proposed_data)
            if (proposedData.title) {
              message = `${orgAcronym} has submitted a new program "${proposedData.title}" for approval.`
              
              // Handle collaboration requests for collaborative programs
              if (proposedData.collaborators && Array.isArray(proposedData.collaborators) && proposedData.collaborators.length > 0) {
                message = `${orgAcronym} has submitted a collaborative program "${proposedData.title}" for approval. Collaboration requests will be sent to invited organizations after superadmin approval.`
                
                // Create collaboration request records (notifications will be sent only after superadmin approval)
                for (const collaborator of proposedData.collaborators) {
                  try {
                    const collaboratorId = typeof collaborator === 'object' ? collaborator.id : collaborator;
                    
                    // Skip self-collaboration
                    if (collaboratorId === item.submitted_by) {
                      continue;
                    }
                    
                    // Check if collaboration request already exists
                    const [existingCollaboration] = await db.execute(`
                      SELECT id FROM program_collaborations 
                      WHERE submission_id = ? AND collaborator_admin_id = ?
                    `, [submissionId, collaboratorId]);
                    
                    if (existingCollaboration.length === 0) {
                      // Create collaboration request linked to submission (not program yet)
                      // Notifications will be sent only after superadmin approves the program
                      await db.execute(`
                        INSERT INTO program_collaborations (submission_id, collaborator_admin_id, invited_by_admin_id, status, program_title)
                        VALUES (?, ?, ?, 'pending', ?)
                      `, [submissionId, collaboratorId, item.submitted_by, proposedData.title]);
                    }
                  } catch (collabError) {
                    // Continue with other collaborators even if one fails
                  }
                }
              }
            }
          } catch (parseError) {
          }
        }

        // Create the notification with organization_id
        await SuperAdminNotificationController.createNotification(
          superadminId,
          'approval_request',
          title,
          message,
          item.section,
          submissionId,
          numericOrgId  // Pass organization_id instead of acronym
        )
      }
    }

    // Commit transaction
    await db.query("COMMIT")

    res.status(201).json({
      success: true,
      message: `${submissions.length} submission(s) recorded successfully`,
      count: submissions.length,
    })
  } catch (error) {
    await db.query("ROLLBACK")
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
    // Get organization ID from organizations table
    const [orgRows] = await db.execute("SELECT id, orgName FROM organizations WHERE org = ? LIMIT 1", [orgAcronym])

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      })
    }

    const organization = orgRows[0]

    // Get submissions with additional info
    const [rows] = await db.execute(
      `SELECT s.*, o.orgName as submitted_by_name 
       FROM submissions s 
       LEFT JOIN admins a ON s.submitted_by = a.id 
       LEFT JOIN organizations o ON a.organization_id = o.id
       WHERE s.organization_id = ? 
       ORDER BY s.submitted_at DESC`,
      [organization.id],
    )

    // Parse JSON data and add metadata
    const parsedRows = await Promise.all(rows.map(async (row) => {
      let previous_data_parsed = {}
      let proposed_data_parsed = {}
      let parse_error = false

      try {
        previous_data_parsed = JSON.parse(row.previous_data)
      } catch (e) {
        previous_data_parsed = { error: "Invalid JSON data" }
        parse_error = true
      }

      try {
        proposed_data_parsed = JSON.parse(row.proposed_data)
      } catch (e) {
        proposed_data_parsed = { error: "Invalid JSON data" }
        parse_error = true
      }

      // For program submissions, fetch collaborator details
      if (row.section === 'programs' && proposed_data_parsed.collaborators && Array.isArray(proposed_data_parsed.collaborators)) {
        try {
          const collaboratorIds = proposed_data_parsed.collaborators;
          if (collaboratorIds.length > 0) {
            const placeholders = collaboratorIds.map(() => '?').join(',');
            const [collaboratorRows] = await db.execute(`
              SELECT a.id, a.email, o.orgName as organization_name, o.org as organization_acronym
              FROM admins a
              LEFT JOIN organizations o ON a.organization_id = o.id
              WHERE a.id IN (${placeholders})
            `, collaboratorIds);
            
            // Replace collaborator IDs with full collaborator objects
            proposed_data_parsed.collaborators = collaboratorRows;
          }
        } catch (collabError) {
          // Keep original collaborator IDs if fetch fails
        }
      }

      return {
        ...row,
        previous_data: previous_data_parsed,
        proposed_data: proposed_data_parsed,
        organization_name: organization.orgName,
        can_edit: row.status === "pending",
        can_cancel: row.status === "pending",
        parse_error: parse_error, // Indicate if any parsing error occurred for this row
      }
    }))

    // Return success even if some rows have parsing errors, as the query itself was successful
    res.json({
      success: true,
      data: parsedRows,
      organization: {
        id: organization.id,
        name: organization.orgName,
        acronym: orgAcronym,
      },
      count: parsedRows.length,
    })
  } catch (error) {
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
    // First check if submission exists and get its data
    const [existing] = await db.execute("SELECT id, status, section, proposed_data FROM submissions WHERE id = ?", [id])

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      })
    }

    const submission = existing[0];

    // If it's a Post Act Report submission, optionally delete the file from S3
    // Note: Files are kept by default for audit purposes, but we can delete if needed
    if (submission.section === 'Post Act Report') {
      try {
        const proposedData = JSON.parse(submission.proposed_data || '{}');
        const filePublicId = proposedData?.file_public_id;
        const fileUrl = proposedData?.file_url;

        // If file exists and is in S3, optionally delete it
        // Keeping file for now for audit trail - can be enabled if needed
        if (filePublicId && fileUrl && fileUrl.includes('amazonaws.com')) {
          // Optional: Delete file from S3 if submission is cancelled
          // Uncomment below if you want to delete S3 files when submissions are cancelled
          /*
          const { extractKeyFromUrl, deleteFromS3 } = await import('../../utils/s3Upload.js');
          const key = extractKeyFromUrl(fileUrl);
          if (key) {
            await deleteFromS3(key);
          }
          */
        }
      } catch (fileError) {
        // Non-fatal: continue with submission deletion even if file deletion fails
        console.error('Error handling file deletion for submission:', fileError);
      }
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
      message: `Submission for ${submission.section} deleted successfully`,
    })
  } catch (error) {
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
    res.status(500).json({
      success: false,
      message: "Failed to update submission",
      error: error.message,
    })
  }
}

// Bulk delete multiple submissions
export const bulkDeleteSubmissions = async (req, res) => {
  const { ids } = req.body;
  
  // Input validation
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Submission IDs array is required and cannot be empty",
    });
  }

  try {
    // Start transaction
    await db.query("START TRANSACTION");

    // Delete all submissions with the given IDs
    const placeholders = ids.map(() => "?").join(",");
    const [result] = await db.execute(
      `DELETE FROM submissions WHERE id IN (${placeholders})`,
      ids
    );

    // Commit transaction
    await db.query("COMMIT");


    
    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.affectedRows} submissions`,
      deletedCount: result.affectedRows,
    });
  } catch (error) {
    // Rollback transaction on error
    await db.query("ROLLBACK");
    return res.status(500).json({
      success: false,
      message: "Failed to delete submissions",
      error: error.message,
    });
  }
};

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
      `SELECT s.*, o.orgName, o.org 
       FROM submissions s
       LEFT JOIN organizations o ON o.id = s.organization_id
       WHERE s.id = ?`,
      [id]
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
      if (submission.previous_data) {
        submission.previous_data = JSON.parse(submission.previous_data)
      }
      if (submission.proposed_data) {
        submission.proposed_data = JSON.parse(submission.proposed_data)
        
        // For program submissions, fetch collaborator details if they are stored as IDs
        if (submission.section === 'programs' && submission.proposed_data.collaborators && Array.isArray(submission.proposed_data.collaborators)) {
          try {
            const collaborators = submission.proposed_data.collaborators;
            if (collaborators.length > 0) {
              // Check if collaborators are stored as IDs (numbers) or objects
              const firstCollaborator = collaborators[0];
              if (typeof firstCollaborator === 'number' || (typeof firstCollaborator === 'string' && !isNaN(firstCollaborator))) {
                // Collaborators are stored as IDs, fetch full details
                const placeholders = collaborators.map(() => '?').join(',');
                const [collaboratorRows] = await db.execute(`
                  SELECT a.id, a.email, o.orgName as organization_name, o.org as organization_acronym
                  FROM admins a
                  LEFT JOIN organizations o ON a.organization_id = o.id
                  WHERE a.id IN (${placeholders})
                `, collaborators);
                
                // Replace collaborator IDs with full collaborator objects
                submission.proposed_data.collaborators = collaboratorRows;
              }
              // If collaborators are already objects, keep them as is
            }
          } catch (collabError) {
            // Keep original collaborator data if fetch fails
          }
        }
      }
    } catch (parseError) {
      // Error parsing JSON data
    }

    res.json({
      success: true,
      data: submission,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get submission",
      error: error.message,
    })
  }
}
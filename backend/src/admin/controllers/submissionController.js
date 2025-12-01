import db from "../../database.js"
import SuperAdminNotificationController from "../../superadmin/controllers/superadminNotificationController.js"
import { logWarn, logError } from "../../utils/logger.js"

const safeParseJSON = (value, defaultValue = null) => {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      // For very large strings, check size first to avoid memory issues
      const stringSize = Buffer.byteLength(value, 'utf8');
      if (stringSize > 50 * 1024 * 1024) { // 50MB
        logWarn('[safeParseJSON] Attempting to parse very large JSON string', {
          sizeMB: (stringSize / (1024 * 1024)).toFixed(2),
          warning: 'This may cause memory issues or slow processing'
        });
      }
      return JSON.parse(value);
    } catch (e) {
      // Log parsing errors for large strings to help diagnose issues
      if (value.length > 10000) {
        logWarn('[safeParseJSON] Failed to parse large JSON string', {
          error: e.message,
          errorType: e.name,
          stringLength: value.length,
          stringSizeMB: (Buffer.byteLength(value, 'utf8') / (1024 * 1024)).toFixed(2)
        });
      }
      return defaultValue;
    }
  }
  return value;
};

const extractMinimalSubmissionData = (data, section) => {
  if (!data || typeof data !== 'object') {
    return { _hasData: !!data };
  }

  const minimal = {};

  if (section === 'programs') {
    if (data.title) minimal.title = data.title;
    if (data.category) minimal.category = data.category;
    if (data.event_start_date) minimal.event_start_date = data.event_start_date;
    if (data.event_end_date) minimal.event_end_date = data.event_end_date;
    if (data.multiple_dates) minimal.multiple_dates = data.multiple_dates;
    if (Array.isArray(data.collaborators)) {
      minimal.collaborators_count = data.collaborators.length;
    }
    if (data.postActReport) {
      minimal.has_post_act_report = true;
    }
    if (data.image) minimal.has_image = true;
    if (Array.isArray(data.additionalImages) && data.additionalImages.length > 0) {
      minimal.additional_images_count = data.additionalImages.length;
    }
  }
  else if (section === 'highlights') {
    if (data.title) minimal.title = data.title;
    if (data.program_id) minimal.program_id = data.program_id;
    if (data.program_title) minimal.program_title = data.program_title;
    if (Array.isArray(data.media_files)) {
      minimal.media_files_count = data.media_files.length;
    } else if (Array.isArray(data.media)) {
      minimal.media_files_count = data.media.length;
    }
  }
  else if (section === 'Post Act Report') {
    if (data.program_id) minimal.program_id = data.program_id;
    if (data.report_id) minimal.report_id = data.report_id;
    if (data.file_url) minimal.has_file = true;
  }
  else {
    minimal._hasData = true;
  }

  return minimal;
};

const validateSubmissionItem = (item) => {
  const errors = []

  if (!item.organization_id) {
    errors.push("organization_id is required")
  }

  if (!item.section) {
    errors.push("section is required")
  }

  // proposed_data is always required
  if (item.proposed_data === undefined || item.proposed_data === null) {
    errors.push("proposed_data is required")
  }

  if (!item.submitted_by) {
    errors.push("submitted_by is required")
  }

  const validSections = ["programs", "highlights", "Post Act Report"]
  if (item.section && !validSections.includes(item.section)) {
    errors.push(`Invalid section. Must be one of: ${validSections.join(", ")}`)
  }
  
  if (item.section === 'advocacy' || item.section === 'competency' || item.section === 'organization' || item.section === 'org_heads') {
    errors.push(`${item.section} should not be submitted through this workflow. Please use the appropriate endpoints.`)
  }

  return errors
}

export const submitChanges = async (req, res) => {
  const { submissions } = req.body

  // Calculate payload size for logging and validation
  const payloadSize = req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0;
  const payloadSizeMB = (payloadSize / (1024 * 1024)).toFixed(2);

  if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Submissions array is required and cannot be empty",
    })
  }

  // Validate payload size (warn if very large, but allow up to 50MB)
  const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024; // 50MB
  if (payloadSize > MAX_PAYLOAD_SIZE) {
    logWarn('Large payload detected in submitChanges', {
      payloadSizeMB,
      submissionCount: submissions.length,
      maxAllowedMB: '50'
    });
    return res.status(413).json({
      success: false,
      message: `Payload too large. Maximum size is 50MB. Your payload is ${payloadSizeMB}MB.`,
      errorType: 'PAYLOAD_TOO_LARGE',
      payloadSizeMB,
      maxSizeMB: 50
    });
  }

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
    await db.query("START TRANSACTION")

    const orgIdentifiers = [...new Set(submissions.map((item) => item.organization_id))]
    
    const placeholders = orgIdentifiers.map(() => "?").join(",")
    
    const [orgCheck] = await db.execute(
      `SELECT id, org FROM organizations WHERE id IN (${placeholders}) OR org IN (${placeholders})`,
      [...orgIdentifiers, ...orgIdentifiers]
    )
    
    const orgIdMap = new Map()
    orgCheck.forEach(org => {
      orgIdMap.set(org.id.toString(), org.id)
      orgIdMap.set(org.org, org.id)
    })
    
    const missingOrgs = orgIdentifiers.filter(id => !orgIdMap.has(id.toString()))
    
    if (missingOrgs.length > 0) {
      await db.query("ROLLBACK")
      return res.status(404).json({
        success: false,
        message: "One or more organizations not found",
        missing: missingOrgs
      })
    }

    const validSubmissions = submissions.filter(item => {
      if (item.section === 'advocacy' || item.section === 'competency') {
        return false;
      }
      return true;
    });
    
    if (validSubmissions.length === 0) {
      await db.query("ROLLBACK")
      return res.status(400).json({
        success: false,
        message: "Advocacy and competency should be saved directly, not through submissions. Please use the direct API endpoints.",
      })
    }
    
    const insertPromises = validSubmissions.map(async (item) => {
      const numericOrgId = orgIdMap.get(item.organization_id.toString())
      
      let proposedDataStr;
      
      try {
        // Validate proposed_data is valid JSON
        if (item.proposed_data !== undefined && item.proposed_data !== null) {
          // Check if proposed_data is already a string (shouldn't happen, but handle it)
          if (typeof item.proposed_data === 'string') {
            // Try to parse it first to validate
            try {
              JSON.parse(item.proposed_data);
              proposedDataStr = item.proposed_data;
            } catch (parseError) {
              throw new Error(`Invalid JSON string in proposed_data: ${parseError.message}`);
            }
          } else {
            // Stringify the object - handle large data carefully
            try {
              proposedDataStr = JSON.stringify(item.proposed_data);
              
              // Check stringified size (warn if very large)
              const stringifiedSize = Buffer.byteLength(proposedDataStr, 'utf8');
              if (stringifiedSize > 10 * 1024 * 1024) { // 10MB
                logWarn('Large proposed_data detected', {
                  section: item.section,
                  sizeMB: (stringifiedSize / (1024 * 1024)).toFixed(2),
                  organizationId: numericOrgId
                });
              }
              
              // Verify it can be parsed back
              JSON.parse(proposedDataStr);
            } catch (stringifyError) {
              // Check for specific memory errors
              if (stringifyError.message && stringifyError.message.includes('Invalid string length')) {
                throw new Error(`Data too large to process. Please reduce the size of images or post-act report data.`);
              }
              throw new Error(`Failed to stringify proposed_data: ${stringifyError.message}`);
            }
          }
        } else {
          proposedDataStr = JSON.stringify({});
        }
      } catch (jsonError) {
        throw new Error(`Invalid proposed_data JSON for submission: ${jsonError.message}`);
      }
      
      // Validate JSON string length before database insert (MySQL JSON has practical limits)
      const jsonStringLength = Buffer.byteLength(proposedDataStr, 'utf8');
      const MAX_JSON_SIZE = 16 * 1024 * 1024; // 16MB practical limit for MySQL JSON
      if (jsonStringLength > MAX_JSON_SIZE) {
        throw new Error(`proposed_data is too large (${(jsonStringLength / (1024 * 1024)).toFixed(2)}MB). Maximum size is 16MB. Please reduce the size of images or post-act report data.`);
      }
      
      // Validate JSON string is valid before passing to MySQL
      try {
        JSON.parse(proposedDataStr);
      } catch (parseError) {
        throw new Error(`Invalid JSON string before database insert: ${parseError.message}`);
      }
      
      // Execute database insert with error handling
      let result;
      try {
        [result] = await db.execute(
          `INSERT INTO submissions (organization_id, section, proposed_data, submitted_by, status, submitted_at)
           VALUES (?, ?, ?, ?, 'pending', NOW())`,
          [
            numericOrgId,
            item.section,
            proposedDataStr,
            item.submitted_by,
          ]
        );
      } catch (dbError) {
        // Check for MySQL JSON-specific errors
        if (dbError.code === 'ER_INVALID_JSON_TEXT' || dbError.code === 'ER_INVALID_JSON_TEXT_IN_PARAM') {
          logError('MySQL JSON validation error', dbError, {
            context: 'submitChanges_db_insert',
            section: item.section,
            organizationId: numericOrgId,
            jsonStringLength,
            sqlMessage: dbError.sqlMessage
          });
          throw new Error(`Invalid JSON data format. Please check your submission data. Error: ${dbError.sqlMessage || dbError.message}`);
        } else if (dbError.code === 'ER_DATA_TOO_LONG') {
          logError('MySQL data too long error', dbError, {
            context: 'submitChanges_db_insert',
            section: item.section,
            organizationId: numericOrgId,
            jsonStringLength,
            sqlMessage: dbError.sqlMessage
          });
          throw new Error(`Submission data is too large for database storage. Please reduce the size of images or post-act report data.`);
        } else {
          // Log other database errors
          logError('Database insert error', dbError, {
            context: 'submitChanges_db_insert',
            section: item.section,
            organizationId: numericOrgId,
            jsonStringLength,
            errorCode: dbError.code,
            sqlState: dbError.sqlState,
            sqlMessage: dbError.sqlMessage
          });
          throw dbError; // Re-throw to be caught by outer catch
        }
      }
      
      return {
        submissionId: result.insertId,
        item: item,
        numericOrgId: numericOrgId
      }
    })

    const insertedSubmissions = await Promise.all(insertPromises)

    // Get superadmin ID for notifications (assuming there's only one superadmin)
    const [superadminRows] = await db.execute("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1")
    const superadminId = superadminRows.length > 0 ? superadminRows[0].id : null

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
        let isCollaborativeProgram = false;
        if (item.section === 'programs') {
          try {
            // proposed_data might already be an object or a JSON string
            let proposedData;
            // typeCast already parses JSON, so use helper
            proposedData = safeParseJSON(item.proposed_data, {});
            
            if (proposedData && proposedData.title) {
              message = `${orgAcronym} has submitted a new program "${proposedData.title}" for approval.`
              
              // Handle collaboration requests for collaborative programs
              if (proposedData.collaborators && Array.isArray(proposedData.collaborators) && proposedData.collaborators.length > 0) {
                isCollaborativeProgram = true;
                message = `${orgAcronym} has submitted a collaborative program "${proposedData.title}" for approval. Collaboration requests will be sent to invited organizations after superadmin approval.`
                
                // Create collaboration request records (notifications will be sent only after superadmin approval)
                for (const collaborator of proposedData.collaborators) {
                  try {
                    const collaboratorId = typeof collaborator === 'object' && collaborator !== null ? collaborator.id : collaborator;
                    
                    // Skip if collaboratorId is invalid
                    if (!collaboratorId || collaboratorId === item.submitted_by) {
                      continue;
                    }
                    
                    // Check if collaboration request already exists
                    const [existingCollaboration] = await db.execute(`
                      SELECT id FROM program_collaborations 
                      WHERE submission_id = ? AND collaborator_admin_id = ?
                    `, [submissionId, collaboratorId]);
                    
                    if (existingCollaboration.length === 0) {
                      // Create collaboration request linked to submission (not program yet)
                      // program_id will be NULL until superadmin approves
                      // Notifications will be sent only after superadmin approves the program
                      await db.execute(`
                        INSERT INTO program_collaborations (submission_id, collaborator_admin_id, invited_by_admin_id, status, program_title)
                        VALUES (?, ?, ?, 'pending', ?)
                      `, [submissionId, collaboratorId, item.submitted_by, proposedData.title]);
                      // Do NOT send notification here - wait for superadmin approval
                    }
                  } catch (collabError) {
                    // Continue with other collaborators even if one fails
                  }
                }
              }
            }
          } catch (parseError) {
            // Continue - don't fail the entire submission if parsing fails
          }
        }

        // For collaborative programs, DO NOT send superadmin notification immediately
        // It will be sent automatically after all collaborators accept
        if (!isCollaborativeProgram) {
          // Create the notification with organization_id for non-collaborative programs
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
    
    // Log comprehensive error details for debugging
    logError('Failed to save submissions', error, {
      context: 'submitChanges',
      payloadSizeMB,
      submissionCount: submissions?.length || 0,
      errorName: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    // Determine error type and provide specific error messages
    let errorType = 'UNKNOWN_ERROR';
    let errorMessage = 'Failed to save submissions';
    let statusCode = 500;
    
    // Check for MySQL JSON-specific errors
    if (error.code === 'ER_INVALID_JSON_TEXT' || error.code === 'ER_INVALID_JSON_TEXT_IN_PARAM') {
      errorType = 'MYSQL_JSON_ERROR';
      errorMessage = 'Invalid JSON data format. The submission data contains invalid JSON that cannot be stored in the database.';
      statusCode = 400;
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      errorType = 'DATA_TOO_LONG';
      errorMessage = 'Submission data is too large for database storage. Please reduce the size of images or post-act report data.';
      statusCode = 413;
    } else if (error.message && (error.message.includes('Invalid string length') || error.message.includes('too large'))) {
      errorType = 'PAYLOAD_TOO_LARGE';
      errorMessage = 'The submission data is too large to process. Please reduce the size of images or post-act report data.';
      statusCode = 413;
    } else if (error.message && error.message.includes('JSON')) {
      errorType = 'JSON_VALIDATION_ERROR';
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.code === 'ER_DUP_ENTRY') {
      errorType = 'DUPLICATE_ENTRY_ERROR';
      errorMessage = 'A submission with this data already exists.';
      statusCode = 409;
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
      errorType = 'FOREIGN_KEY_ERROR';
      errorMessage = 'Invalid reference data. Please check organization and admin IDs.';
      statusCode = 400;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      errorType = 'DATABASE_CONNECTION_ERROR';
      errorMessage = 'Database connection failed. Please try again later.';
      statusCode = 503;
    } else if (error.code === 'ER_LOCK_WAIT_TIMEOUT' || error.code === 'ER_LOCK_DEADLOCK') {
      errorType = 'DATABASE_LOCK_ERROR';
      errorMessage = 'Database is temporarily busy. Please try again in a moment.';
      statusCode = 503;
    } else if (error.name === 'RangeError' || error.message?.includes('Maximum call stack')) {
      errorType = 'MEMORY_ERROR';
      errorMessage = 'The submission data is too large to process. Please reduce the size of images or post-act report data.';
      statusCode = 413;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      errorType: errorType,
      // Include payload size in response for debugging
      ...(process.env.NODE_ENV === 'development' && {
        payloadSizeMB,
        details: {
          code: error.code,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage,
          errorName: error.name
        }
      })
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
    // Note: previous_data is not used in submission flow - only fetch columns we need
    const [rows] = await db.execute(
      `SELECT s.id, s.organization_id, s.section, s.proposed_data, s.submitted_by, 
              s.status, s.rejection_reason, s.submitted_at, s.updated_at,
              o.orgName as submitted_by_name 
       FROM submissions s 
       LEFT JOIN users a ON s.submitted_by = a.id AND a.role = 'admin' 
       LEFT JOIN organizations o ON a.organization_id = o.id
       WHERE s.organization_id = ? 
       ORDER BY s.submitted_at DESC`,
      [organization.id],
    )

    // Parse JSON data and add metadata
    // For list view, extract minimal data to prevent large payloads
    // Process in chunks to prevent blocking when there's large data (post-act reports, images)
    const BATCH_SIZE = 20; // Process 20 submissions at a time
    const parsedRows = [];
    let parseErrorCount = 0;
    
    // Track processing time for performance monitoring
    const startTime = Date.now();
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    const PROCESSING_TIMEOUT_WARNING_MS = 50000; // 50 seconds - warn if processing takes longer

    logWarn(`[getSubmissionsByOrg] Starting to process ${rows.length} submissions in ${totalBatches} batch(es) for org: ${orgAcronym}`, {
      organizationId: organization.id,
      submissionCount: rows.length,
      batchCount: totalBatches
    });

    // Process submissions in chunks to prevent memory issues and blocking
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const batchStartTime = Date.now();
      const batch = rows.slice(i, i + BATCH_SIZE);
      
      // Process each batch with individual error handling
      const batchResults = await Promise.all(
        batch.map(async (row) => {
          try {
            let proposed_data_parsed = {};
            let parse_error = false;

            // Note: advocacy and competency are no longer part of the submission workflow
            // Parse JSON data for proposed_data only
            // Wrap in try-catch to handle individual submission errors
            try {
              // Detect size of proposed_data before parsing to warn about large submissions
              let proposedDataSize = 0;
              if (row.proposed_data) {
                if (typeof row.proposed_data === 'string') {
                  proposedDataSize = Buffer.byteLength(row.proposed_data, 'utf8');
                } else if (typeof row.proposed_data === 'object') {
                  proposedDataSize = Buffer.byteLength(JSON.stringify(row.proposed_data), 'utf8');
                }
                
                // Warn if submission data is very large (may cause processing delays)
                if (proposedDataSize > 5 * 1024 * 1024) { // 5MB
                  logWarn(`[getSubmissionsByOrg] Large submission data detected for submission ${row.id}`, {
                    submissionId: row.id,
                    section: row.section,
                    dataSizeMB: (proposedDataSize / (1024 * 1024)).toFixed(2),
                    organizationId: organization.id
                  });
                }
              }
              
              proposed_data_parsed = safeParseJSON(row.proposed_data, {});
              
              // Check if parsing failed (only if it was a string and couldn't be parsed)
              if (typeof row.proposed_data === 'string' && !proposed_data_parsed) {
                proposed_data_parsed = { error: "Invalid JSON data" };
                parse_error = true;
                parseErrorCount++;
              }

              // Extract minimal data for list view to prevent large payloads
              // Full data will be available via getSubmissionById when viewing individual submission
              const minimal_proposed_data = extractMinimalSubmissionData(proposed_data_parsed, row.section);

              return {
                ...row,
                proposed_data: minimal_proposed_data,
                organization_name: organization.orgName,
                can_edit: row.status === "pending",
                can_cancel: row.status === "pending",
                parse_error: parse_error, // Indicate if any parsing error occurred for this row
                // Add flag to indicate this is minimal data
                _isMinimalData: true,
              };
            } catch (parseErr) {
              // Individual submission parsing error - don't block others
              parseErrorCount++;
              
              // Calculate data size for error reporting
              let dataSize = 0;
              if (row.proposed_data) {
                if (typeof row.proposed_data === 'string') {
                  dataSize = Buffer.byteLength(row.proposed_data, 'utf8');
                } else if (typeof row.proposed_data === 'object') {
                  try {
                    dataSize = Buffer.byteLength(JSON.stringify(row.proposed_data), 'utf8');
                  } catch (e) {
                    dataSize = 0;
                  }
                }
              }
              
              logWarn(`[getSubmissionsByOrg] Failed to parse submission ${row.id}`, { 
                submissionId: row.id, 
                section: row.section,
                error: parseErr.message,
                errorType: parseErr.name || 'ParseError',
                dataSizeBytes: dataSize,
                dataSizeMB: dataSize > 0 ? (dataSize / (1024 * 1024)).toFixed(2) : 0,
                organizationId: organization.id
              });
              
              return {
                ...row,
                proposed_data: { error: "Failed to parse submission data" },
                organization_name: organization.orgName,
                can_edit: row.status === "pending",
                can_cancel: row.status === "pending",
                parse_error: true,
                _isMinimalData: true,
              };
            }
          } catch (rowError) {
            // Catch any other errors for this row
            parseErrorCount++;
            
            // Calculate data size for error reporting
            let dataSize = 0;
            if (row.proposed_data) {
              if (typeof row.proposed_data === 'string') {
                dataSize = Buffer.byteLength(row.proposed_data, 'utf8');
              } else if (typeof row.proposed_data === 'object') {
                try {
                  dataSize = Buffer.byteLength(JSON.stringify(row.proposed_data), 'utf8');
                } catch (e) {
                  dataSize = 0;
                }
              }
            }
            
            logWarn(`[getSubmissionsByOrg] Error processing submission ${row.id}`, { 
              submissionId: row.id, 
              section: row.section,
              error: rowError.message,
              errorType: rowError.name || 'UnknownError',
              dataSizeBytes: dataSize,
              dataSizeMB: dataSize > 0 ? (dataSize / (1024 * 1024)).toFixed(2) : 0,
              organizationId: organization.id,
              stack: rowError.stack
            });
            
            return {
              ...row,
              proposed_data: { error: "Error processing submission" },
              organization_name: organization.orgName,
              can_edit: row.status === "pending",
              can_cancel: row.status === "pending",
              parse_error: true,
              _isMinimalData: true,
            };
          }
        })
      );

      parsedRows.push(...batchResults);
      
      const batchProcessingTime = Date.now() - batchStartTime;
      const elapsedTime = Date.now() - startTime;
      
      // Log batch progress
      logWarn(`[getSubmissionsByOrg] Processed batch ${batchNumber}/${totalBatches} (${batch.length} submissions) in ${batchProcessingTime}ms`, {
        batchNumber,
        totalBatches,
        batchSize: batch.length,
        batchProcessingTimeMs: batchProcessingTime,
        elapsedTimeMs: elapsedTime,
        organizationId: organization.id
      });
      
      // Warn if processing is taking longer than expected (approaching timeout)
      if (elapsedTime > PROCESSING_TIMEOUT_WARNING_MS) {
        logWarn(`[getSubmissionsByOrg] WARNING: Processing is taking longer than expected (${elapsedTime}ms). This may cause frontend timeout.`, {
          elapsedTimeMs: elapsedTime,
          processedCount: parsedRows.length,
          remainingCount: rows.length - parsedRows.length,
          organizationId: organization.id,
          orgAcronym
        });
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    
    // Log completion summary
    logWarn(`[getSubmissionsByOrg] Completed processing ${parsedRows.length} submissions in ${totalProcessingTime}ms`, {
      organizationId: organization.id,
      orgAcronym,
      totalSubmissions: parsedRows.length,
      parseErrorCount,
      totalProcessingTimeMs: totalProcessingTime,
      averageTimePerSubmission: parsedRows.length > 0 ? (totalProcessingTime / parsedRows.length).toFixed(2) : 0
    });

    // Return success even if some rows have parsing errors, as the query itself was successful
    // Include warning if some submissions had parsing errors
    const response = {
      success: true,
      data: parsedRows,
      organization: {
        id: organization.id,
        name: organization.orgName,
        acronym: orgAcronym,
      },
      count: parsedRows.length,
    };

    // Add warning if some submissions had parsing errors (for debugging)
    if (parseErrorCount > 0) {
      response.warning = `${parseErrorCount} submission(s) had parsing errors but were included in results`;
    }

    res.json(response)
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

    // If it's a Post Act Report submission, keep the file in S3 for audit purposes
    // Files are intentionally retained when submissions are cancelled for audit trail

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

    // Reject advocacy and competency submissions - they should be edited directly
    // Note: organization and org_heads are not part of the submission flow
    const section = existing[0].section
    if (section === 'advocacy' || section === 'competency' || section === 'organization' || section === 'org_heads') {
      return res.status(400).json({
        success: false,
        message: `${section} should not be edited through submissions. Please use the appropriate endpoints.`,
      })
    }

    // Validate proposed_data structure based on section
    // Only programs, highlights, and Post Act Report are in the submission flow
    let isValidData = true

    try {
      if (section === "programs" && typeof proposed_data !== "object") {
        isValidData = false
      } else if (section === "highlights" && typeof proposed_data !== "object") {
        isValidData = false
      } else if (section === "Post Act Report" && typeof proposed_data !== "object") {
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
    // Note: previous_data is not used in submission flow - only fetch columns we need
    const [rows] = await db.execute(
      `SELECT s.id, s.organization_id, s.section, s.proposed_data, s.submitted_by, 
              s.status, s.rejection_reason, s.submitted_at, s.updated_at,
              o.orgName, o.org, o.logo as organization_logo,
              submitted_admin.email as submitted_by_email,
              submitted_org.orgName as submitted_by_org_name,
              submitted_org.id as submitted_by_org_id,
              submitted_org.org as submitted_by_org_acronym
       FROM submissions s
       LEFT JOIN organizations o ON o.id = s.organization_id
       LEFT JOIN users submitted_admin ON s.submitted_by = submitted_admin.id AND submitted_admin.role = 'admin'
       LEFT JOIN organizations submitted_org ON submitted_admin.organization_id = submitted_org.id
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
    // Note: advocacy and competency are no longer part of the submission workflow
    try {
      if (submission.proposed_data) {
        submission.proposed_data = safeParseJSON(submission.proposed_data, {});
        
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
                  FROM users a
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
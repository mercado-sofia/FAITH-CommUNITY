//db table: submissions
import db from '../../database.js';
import NotificationController from '../../admin/controllers/notificationController.js';
import { logSuperadminAction } from '../../utils/audit.js';
import { logError, logWarn, logInfo } from '../../utils/logger.js';
import { calculateInitialStatusFromDates } from '../../utils/programStatusUtils.js';

// Helper function to safely parse JSON (typeCast already parses JSON columns, so check if it's already an object)
const safeParseJSON = (value, defaultValue = null) => {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value; // Already parsed by typeCast
  if (typeof value === 'string') {
    try {
      return JSON.parse(value); // Still a string, parse it
    } catch (e) {
      return defaultValue;
    }
  }
  return value;
};

// Helper function to clean up unapproved program and related records
const cleanupUnapprovedProgram = async (programId, submissionId) => {
  try {
    // Check if program exists and is not approved
    const [existingProgram] = await db.execute(
      'SELECT id, is_approved FROM programs_projects WHERE id = ?',
      [programId]
    );
    
    if (existingProgram.length > 0 && !existingProgram[0].is_approved) {
      // Program was created but not approved - delete it and related records
      // Delete collaboration records linked to this submission or program
      await db.execute(
        'DELETE FROM program_collaborations WHERE (submission_id = ? OR program_id = ?)',
        [submissionId, programId]
      );
      
      // Delete program event dates
      await db.execute(
        'DELETE FROM program_event_dates WHERE program_id = ?',
        [programId]
      );
      
      // Delete program additional images
      await db.execute(
        'DELETE FROM program_additional_images WHERE program_id = ?',
        [programId]
      );
      
      // Delete the unapproved program
      await db.execute(
        'DELETE FROM programs_projects WHERE id = ? AND is_approved = FALSE',
        [programId]
      );
      
      return { deleted: true, wasApproved: false };
    } else if (existingProgram.length > 0 && existingProgram[0].is_approved) {
      // Program is already approved - this is an update rejection, don't delete the program
      // Just clean up any collaboration records linked to this submission
      await db.execute(
        'DELETE FROM program_collaborations WHERE submission_id = ? AND program_id IS NULL',
        [submissionId]
      );
      return { deleted: false, wasApproved: true };
    } else {
      // Program doesn't exist - clean up collaboration records linked to this submission
      await db.execute(
        'DELETE FROM program_collaborations WHERE submission_id = ? AND program_id IS NULL',
        [submissionId]
      );
      return { deleted: false, wasApproved: false, notFound: true };
    }
  } catch (error) {
    logError('Error cleaning up unapproved program', error, { programId, submissionId });
    throw error;
  }
};

export const getPendingSubmissions = async (req, res) => {
  // Note: previous_data is not used in submission flow - all submissions are new
  try {
    // Optimized query: get IDs first to reduce sort memory, then fetch full data
    const [idRows] = await db.execute(`
      SELECT s.id
      FROM submissions s 
      WHERE s.status = 'pending' 
        AND (
          -- Include non-program submissions
          s.section != 'programs'
          OR
          -- Include program submissions that don't have collaborators
          -- Check collaboration records first (faster than JSON operations)
          NOT EXISTS (
            SELECT 1 FROM program_collaborations pc 
            WHERE pc.submission_id = s.id
          )
          OR
          -- Include collaborative programs
          EXISTS (
            SELECT 1 FROM program_collaborations pc 
            WHERE pc.submission_id = s.id
          )
        )
      ORDER BY s.submitted_at DESC
      LIMIT 10000
    `);
    
    const submissionIds = idRows.map(row => row.id);
    
    if (submissionIds.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const placeholders = submissionIds.map(() => '?').join(',');
    const [rows] = await db.execute(`
      SELECT s.*, 
             o.orgName, o.org, o.logo as organization_logo,
             submitted_admin.email as submitted_by_email,
             submitted_org.orgName as submitted_by_org_name,
             submitted_org.id as submitted_by_org_id
      FROM submissions s 
      LEFT JOIN organizations o ON o.id = s.organization_id 
      LEFT JOIN users submitted_admin ON s.submitted_by = submitted_admin.id AND submitted_admin.role = 'admin' 
      LEFT JOIN organizations submitted_org ON submitted_admin.organization_id = submitted_org.id
      WHERE s.id IN (${placeholders})
      ORDER BY s.submitted_at DESC
    `, submissionIds);

    // Parse JSON data for each submission and enrich collaborator data
    const submissions = await Promise.all(rows.map(async (submission) => {
      try {
        // Note: advocacy and competency are no longer part of the approval workflow
        // Parse JSON data for proposed_data only
        let proposedData;
        
        proposedData = safeParseJSON(submission.proposed_data, {});
        
        // For program submissions, enrich collaborator data with organization information
        if (submission.section === 'programs' && proposedData.collaborators && Array.isArray(proposedData.collaborators)) {
          try {
            const collaborators = proposedData.collaborators;
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
                proposedData.collaborators = collaboratorRows;
              }
              // If collaborators are already objects, keep them as is
            }
          } catch (collabError) {
            logWarn('Failed to enrich collaborator data', { error: collabError.message, submissionId: submission.id });
            // Keep original collaborator data if fetch fails
          }
        }
        
        return {
          ...submission,
          proposed_data: proposedData
        };
      } catch (parseError) {
        return {
          ...submission,
          proposed_data: {}
        };
      }
    }));

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    // Log the full error for debugging
    logError('Failed to fetch pending submissions', error, { 
      context: 'getPendingSubmissions',
      errorType: error.name,
      errorCode: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });

    // Determine error type and provide specific error messages
    let errorType = 'UNKNOWN_ERROR';
    let errorMessage = 'Failed to fetch pending submissions';
    let statusCode = 500;

    if (error.code === 'ER_OUT_OF_SORTMEMORY') {
      errorType = 'DATABASE_SORT_MEMORY_ERROR';
      errorMessage = 'Too many submissions to process at once. The system is processing your request. Please try again in a moment or use filters to narrow down results.';
      statusCode = 503;
    } else if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_PARSE_ERROR') {
      errorType = 'DATABASE_QUERY_ERROR';
      errorMessage = 'Database query error. Please contact support.';
      statusCode = 500;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      errorType = 'DATABASE_CONNECTION_ERROR';
      errorMessage = 'Database connection failed. Please try again later.';
      statusCode = 503;
    } else if (error.code === 'ER_LOCK_WAIT_TIMEOUT' || error.code === 'ER_LOCK_DEADLOCK') {
      errorType = 'DATABASE_LOCK_ERROR';
      errorMessage = 'Database is temporarily busy. Please try again in a moment.';
      statusCode = 503;
    } else if (error.message && error.message.includes('JSON')) {
      errorType = 'JSON_PARSING_ERROR';
      errorMessage = 'Invalid data format detected. Some submissions may have invalid JSON data.';
      statusCode = 500;
    } else if (error.sqlMessage) {
      errorType = 'DATABASE_ERROR';
      errorMessage = `Database error: ${error.sqlMessage}`;
      statusCode = 500;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      errorType: errorType,
      // Only include detailed error in development
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          code: error.code,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage
        }
      })
    });
  }
};

export const getAllSubmissions = async (req, res) => {
  try {
    // Optimized query: get IDs first to reduce sort memory, then fetch full data
    const [idRows] = await db.execute(`
      SELECT s.id
      FROM submissions s 
      WHERE (
        -- Include non-pending submissions (already approved/rejected) - these are always shown
        s.status != 'pending'
        OR
        (
          -- For pending submissions, apply filtering
          s.status = 'pending'
          AND (
            -- Include non-program submissions
            s.section != 'programs'
            OR
            -- Include program submissions that don't have collaborators
            -- Check collaboration records first (faster than JSON operations)
            NOT EXISTS (
              SELECT 1 FROM program_collaborations pc 
              WHERE pc.submission_id = s.id
            )
            OR
            -- Include collaborative programs
            EXISTS (
              SELECT 1 FROM program_collaborations pc 
              WHERE pc.submission_id = s.id
            )
          )
        )
      )
      ORDER BY s.submitted_at DESC
      LIMIT 10000
    `);
    
    const submissionIds = idRows.map(row => row.id);
    
    if (submissionIds.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const placeholders = submissionIds.map(() => '?').join(',');
    const [rows] = await db.execute(`
      SELECT s.*, 
             o.orgName, o.org, o.logo as organization_logo,
             submitted_admin.email as submitted_by_email,
             submitted_org.orgName as submitted_by_org_name,
             submitted_org.id as submitted_by_org_id
      FROM submissions s 
      LEFT JOIN organizations o ON o.id = s.organization_id 
      LEFT JOIN users submitted_admin ON s.submitted_by = submitted_admin.id AND submitted_admin.role = 'admin' 
      LEFT JOIN organizations submitted_org ON submitted_admin.organization_id = submitted_org.id
      WHERE s.id IN (${placeholders})
      ORDER BY s.submitted_at DESC
    `, submissionIds);

    // Parse JSON data for each submission and enrich collaborator data
    const submissions = await Promise.all(rows.map(async (submission) => {
      try {
        // Note: advocacy and competency are no longer part of the approval workflow
        // Parse JSON data for proposed_data only
        let proposedData;
        
        proposedData = safeParseJSON(submission.proposed_data, {});
        
        // For program submissions, enrich collaborator data with organization information
        if (submission.section === 'programs' && proposedData.collaborators && Array.isArray(proposedData.collaborators)) {
          try {
            const collaborators = proposedData.collaborators;
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
                proposedData.collaborators = collaboratorRows;
              }
              // If collaborators are already objects, keep them as is
            }
          } catch (collabError) {
            logWarn('Failed to enrich collaborator data', { error: collabError.message, submissionId: submission.id });
            // Keep original collaborator data if fetch fails
          }
        }
        
        return {
          ...submission,
          proposed_data: proposedData
        };
      } catch (parseError) {
        return {
          ...submission,
          proposed_data: {}
        };
      }
    }));

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    // Log the full error for debugging
    logError('Failed to fetch submissions', error, { 
      context: 'getAllSubmissions',
      errorType: error.name,
      errorCode: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });

    // Determine error type and provide specific error messages
    let errorType = 'UNKNOWN_ERROR';
    let errorMessage = 'Failed to fetch submissions';
    let statusCode = 500;

    if (error.code === 'ER_OUT_OF_SORTMEMORY') {
      errorType = 'DATABASE_SORT_MEMORY_ERROR';
      errorMessage = 'Too many submissions to process at once. The system is processing your request. Please try again in a moment or use filters to narrow down results.';
      statusCode = 503;
    } else if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_PARSE_ERROR') {
      errorType = 'DATABASE_QUERY_ERROR';
      errorMessage = 'Database query error. Please contact support.';
      statusCode = 500;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      errorType = 'DATABASE_CONNECTION_ERROR';
      errorMessage = 'Database connection failed. Please try again later.';
      statusCode = 503;
    } else if (error.code === 'ER_LOCK_WAIT_TIMEOUT' || error.code === 'ER_LOCK_DEADLOCK') {
      errorType = 'DATABASE_LOCK_ERROR';
      errorMessage = 'Database is temporarily busy. Please try again in a moment.';
      statusCode = 503;
    } else if (error.message && error.message.includes('JSON')) {
      errorType = 'JSON_PARSING_ERROR';
      errorMessage = 'Invalid data format detected. Some submissions may have invalid JSON data.';
      statusCode = 500;
    } else if (error.sqlMessage) {
      errorType = 'DATABASE_ERROR';
      errorMessage = `Database error: ${error.sqlMessage}`;
      statusCode = 500;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      errorType: errorType,
      // Only include detailed error in development
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          code: error.code,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage
        }
      })
    });
  }
};

export const approveSubmission = async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    
    // Get a connection from the pool for the entire transaction
    try {
      connection = await db.getConnection();
      logInfo('Database connection acquired successfully', { context: 'approval_controller' });
    } catch (connectionError) {
      logError('Failed to acquire database connection', connectionError, { context: 'approval_controller' });
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }
    
     // Start database transaction
     try {
       await connection.beginTransaction();
       logInfo('Database transaction started', { context: 'approval_controller' });
     } catch (transactionError) {
       logError('Failed to start transaction', transactionError, { context: 'approval_controller' });
       throw new Error(`Transaction start failed: ${transactionError.message}`);
     }
    
    // Note: previous_data is not used in submission flow - only fetch columns we need
    const [rows] = await connection.execute(
      `SELECT id, organization_id, section, proposed_data, submitted_by, 
              status, rejection_reason, submitted_at, updated_at 
       FROM submissions WHERE id = ?`, 
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = rows[0];
    
    // Check if submission is pending
    if (submission.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Submission cannot be approved. Current status: ${submission.status}`,
        error: `Submission is not pending (current status: ${submission.status})`
      });
    }
    
    // Validate and parse the proposed data
    let data;
    try {
      data = safeParseJSON(submission.proposed_data, {});
    } catch (parseError) {
      logError('Failed to parse submission data', parseError, { context: 'approval_controller' });
      throw new Error(`Invalid submission data: ${parseError.message}`);
    }
    
    // If proposed_data is empty, this is an invalid submission
    if (!data || Object.keys(data).length === 0) {
      throw new Error('Invalid submission: proposed_data is empty');
    }
    
    const section = submission.section;
    const orgId = submission.organization_id;
    
    // Validate required fields
    if (!section) {
      throw new Error('Submission section is missing');
    }
    if (!orgId) {
      throw new Error('Organization ID is missing');
    }
    if (!submission.submitted_by) {
      throw new Error('Submitted by field is missing');
    }

    // Apply changes based on section
    // Note: organization and org_heads are not part of the submission flow
    // They are updated directly via their respective endpoints (/api/organization and /api/heads)
    // Note: advocacy and competency are no longer part of the approval workflow
    // They are saved directly by admins via their respective endpoints
    
    // Safety check: Reject legacy submissions for unsupported sections
    if (section === 'organization' || section === 'org_heads' || section === 'advocacy' || section === 'competency') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Submissions for "${section}" are no longer supported through the approval workflow. Please use the direct API endpoints.`,
        error: `Section "${section}" is not part of the submission flow`
      });
    }

    if (section === 'programs') {
      
      // Validate required program data
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        logError('Program title is missing or invalid', null, { context: 'approval_controller', title: data.title });
        throw new Error('Program title is required and must be a non-empty string');
      }
      if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
        logError('Program description is missing or invalid', null, { context: 'approval_controller', description: data.description });
        throw new Error('Program description is required and must be a non-empty string');
      }
      if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
        logError('Program category is missing or invalid', null, { context: 'approval_controller', category: data.category });
        throw new Error('Program category is required and must be a non-empty string');
      }
      
      try {
        // Check if program_id exists in proposed_data (program was already created but not approved)
        let existingProgramId = null;
        let programId = null;
        
        if (data.program_id) {
          // Check if the program exists in the database
          const [existingProgram] = await connection.execute(
            'SELECT id, is_approved FROM programs_projects WHERE id = ?',
            [data.program_id]
          );
          
          if (existingProgram.length > 0) {
            existingProgramId = existingProgram[0].id;
            // Program exists - we'll update it instead of creating a new one
          }
        }

        // Generate slug from title
        const slug = data.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim('-'); // Remove leading/trailing hyphens
        
        // Ensure uniqueness by appending counter if needed (only if creating new program)
        let finalSlug = slug;
        if (!existingProgramId) {
          let counter = 1;
          while (true) {
            const [existingSlug] = await connection.execute(
              'SELECT id FROM programs_projects WHERE slug = ?',
              [finalSlug]
            );
            
            if (existingSlug.length === 0) {
              break;
            }
            finalSlug = `${slug}-${counter}`;
            counter++;
          }
        } else {
          // Use existing program's slug
          const [existingSlugRow] = await connection.execute(
            'SELECT slug FROM programs_projects WHERE id = ?',
            [existingProgramId]
          );
          if (existingSlugRow.length > 0) {
            finalSlug = existingSlugRow[0].slug;
          }
        }

        // Handle main image upload to Cloudinary
        let cloudinaryImageUrl = data.image;
        
        // Clean the image data - JSON_EXTRACT returns quoted strings, so we need to remove quotes
        const { cleanImageData, isBase64Image } = await import('../../utils/jsonUtils.js');
        const cleanedImageData = cleanImageData(data.image);
        
        if (isBase64Image(cleanedImageData)) {
          try {
            const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
            const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
            
            // Convert base64 to buffer
            const base64Data = cleanedImageData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Create a file-like object for Cloudinary upload
            const file = {
              buffer: buffer,
              originalname: `program-${Date.now()}.jpg`,
              mimetype: cleanedImageData.match(/data:image\/(\w+);/)[0].replace('data:', '').replace(';', ''),
              size: buffer.length
            };
            
            // Upload to Cloudinary
            const uploadResult = await uploadSingleToCloudinary(
              file, 
              CLOUDINARY_FOLDERS.PROGRAMS.MAIN,
              { prefix: 'prog_main_' }
            );
            
            cloudinaryImageUrl = uploadResult.url;
          } catch (uploadError) {
            logError('Cloudinary upload failed for main image', uploadError, { context: 'approval_controller' });
            // Continue with cleaned base64 as fallback
            cloudinaryImageUrl = cleanedImageData;
          }
        } else {
        }

        // For collaborative programs, create or update the program
        if (data.collaborators && Array.isArray(data.collaborators) && data.collaborators.length > 0) {
          
          // Check if submitted_by_name and submitted_by_role columns exist
          const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'programs_projects' 
            AND COLUMN_NAME IN ('submitted_by_name', 'submitted_by_role')
          `);
          
          const hasSubmittedByName = columns.some(col => col.COLUMN_NAME === 'submitted_by_name');
          const hasSubmittedByRole = columns.some(col => col.COLUMN_NAME === 'submitted_by_role');
          
          if (existingProgramId) {
            // Update existing program to approve it
            // Check if program already has manual_status_override set - preserve it if TRUE
            const [existingProgram] = await connection.execute(
              'SELECT manual_status_override FROM programs_projects WHERE id = ?',
              [existingProgramId]
            );
            const existingManualOverride = existingProgram[0]?.manual_status_override === 1 || existingProgram[0]?.manual_status_override === true;
            
            // Calculate initial status from event dates (only during creation/update)
            // After creation, admin can manually change status which will override dates
            const initialStatusUpdate = calculateInitialStatusFromDates(
              data.event_start_date || null,
              data.event_end_date || null,
              data.multiple_dates || null
            );
            
            // Preserve manual_status_override if it was already set, otherwise set to FALSE (dates will determine status)
            const manualOverrideValue = existingManualOverride ? 1 : 0;
            
            let updateQuery, updateValues;
            
            if (hasSubmittedByName && hasSubmittedByRole) {
              updateQuery = `UPDATE programs_projects 
                SET title = ?, description = ?, category = ?, status = ?, image = ?, event_start_date = ?, event_end_date = ?, slug = ?, is_approved = ?, is_collaborative = ?, accepts_volunteers = ?, manual_status_override = ?, submitted_by_name = ?, submitted_by_role = ?
                WHERE id = ?`;
              updateValues = [
                data.title,
                data.description,
                data.category,
                initialStatusUpdate, // Calculated from event dates during creation/update
                cloudinaryImageUrl,
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // Approved by superadmin
                true, // Collaborative
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                manualOverrideValue, // Preserve existing manual override if set, otherwise FALSE
                (data.submitted_by_name && data.submitted_by_name.trim()) ? data.submitted_by_name.trim() : null,
                (data.submitted_by_role && data.submitted_by_role.trim()) ? data.submitted_by_role.trim() : null,
                existingProgramId
              ];
            } else {
              updateQuery = `UPDATE programs_projects 
                SET title = ?, description = ?, category = ?, status = ?, image = ?, event_start_date = ?, event_end_date = ?, slug = ?, is_approved = ?, is_collaborative = ?, accepts_volunteers = ?, manual_status_override = ?
                WHERE id = ?`;
              updateValues = [
                data.title,
                data.description,
                data.category,
                initialStatusUpdate, // Calculated from event dates during creation/update
                cloudinaryImageUrl,
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // Approved by superadmin
                true, // Collaborative
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                manualOverrideValue, // Preserve existing manual override if set, otherwise FALSE
                existingProgramId
              ];
            }
            
            await connection.execute(updateQuery, updateValues);
            programId = existingProgramId;
            
            // When updating existing program, ensure collaboration records are linked
            // Update existing collaboration requests to link to the program
            await connection.execute(`
              UPDATE program_collaborations 
              SET program_id = ?, program_title = ?
              WHERE submission_id = ? AND program_id IS NULL
            `, [programId, data.title, id]);
          } else {
            // Create new program
            // Calculate initial status from event dates (only during creation)
            // After creation, admin can manually change status which will override dates
            const initialStatus = calculateInitialStatusFromDates(
              data.event_start_date || null,
              data.event_end_date || null,
              data.multiple_dates || null
            );
            
            let insertQuery, insertValues;
            
            if (hasSubmittedByName && hasSubmittedByRole) {
              insertQuery = `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative, accepts_volunteers, manual_status_override, submitted_by_name, submitted_by_role)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
              insertValues = [
                orgId,
                data.title,
                data.description,
                data.category,
                initialStatus, // Calculated from event dates during creation
                cloudinaryImageUrl,
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // Approved by superadmin
                true, // Collaborative - will be updated based on collaborator responses
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                false, // New approved programs start with automatic status (no manual override) - admin can change later
                (data.submitted_by_name && data.submitted_by_name.trim()) ? data.submitted_by_name.trim() : null,
                (data.submitted_by_role && data.submitted_by_role.trim()) ? data.submitted_by_role.trim() : null
              ];
            } else {
              insertQuery = `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative, accepts_volunteers, manual_status_override)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
              insertValues = [
                orgId,
                data.title,
                data.description,
                data.category,
                initialStatus, // Calculated from event dates during creation
                cloudinaryImageUrl,
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // Approved by superadmin
                true, // Collaborative - will be updated based on collaborator responses
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                false // New approved programs start with automatic status (no manual override) - admin can change later
              ];
            }
            
            const [result] = await connection.execute(insertQuery, insertValues);
            programId = result.insertId;
          }
          
          // Update existing collaboration requests to link to the new program
          // IMPORTANT: Preserve existing status (accepted/declined) - don't reset to 'pending'
          const [updateResult] = await connection.execute(`
            UPDATE program_collaborations 
            SET program_id = ?, program_title = ?
            WHERE submission_id = ? AND program_id IS NULL
          `, [programId, data.title, id]);
          
          // If no existing collaboration requests were updated, create new ones
          if (updateResult.affectedRows === 0) {
            // Extract collaborator IDs (handle both object format and ID format)
            const collaboratorIds = data.collaborators.map(collab => {
              // If collaborator is an object with id property, extract the id
              if (typeof collab === 'object' && collab.id) {
                return collab.id;
              }
              // If collaborator is already just an ID, use it directly
              return collab;
            }).filter(id => id && id !== submission.submitted_by);
            
            // Create new collaboration requests
            for (const collaboratorId of collaboratorIds) {
              try {
                await connection.execute(`
                  INSERT INTO program_collaborations (program_id, collaborator_admin_id, invited_by_admin_id, status, program_title)
                  VALUES (?, ?, ?, 'pending', ?)
                `, [programId, collaboratorId, submission.submitted_by, data.title]);
              } catch (collabError) {
                // Error creating collaboration request
              }
            }
          }
          
          // Send notifications to collaborators about the approved program
          // Get all collaboration records for this program (both updated and newly created)
          const [allCollaborations] = await connection.execute(`
            SELECT collaborator_admin_id FROM program_collaborations 
            WHERE program_id = ? AND status = 'pending'
          `, [programId]);
          
          // Send notifications to each collaborator
          for (const collab of allCollaborations) {
            try {
              await NotificationController.createNotification(
                collab.collaborator_admin_id,
                'collaboration_request',
                'New Collaboration Request',
                `You have received a collaboration request for "${data.title}". Please review and respond in the Collaboration section.`,
                'programs',
                programId
              );
            } catch (notificationError) {
              // Error sending collaboration request notification
            }
          }
          
          // Handle multiple dates for collaborative programs
          if (data.multiple_dates && Array.isArray(data.multiple_dates) && data.multiple_dates.length > 0) {
            for (const date of data.multiple_dates) {
              await connection.execute(
                `INSERT INTO program_event_dates (program_id, event_date) VALUES (?, ?)`,
                [programId, date]
              );
            }
          }
          
        // Additional images will be handled in the general section below
          // Note: Collaborators receive collaboration request notifications ONLY after superadmin approval.
          // During submission, collaboration records are created but no notifications are sent.
          // Notifications are sent here (in approvalController.js) after the program is approved.
          
        } else {
          // For non-collaborative programs, create or update the program
          
          // Check if submitted_by_name and submitted_by_role columns exist
          const [columns2] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'programs_projects' 
            AND COLUMN_NAME IN ('submitted_by_name', 'submitted_by_role')
          `);
          
          const hasSubmittedByName2 = columns2.some(col => col.COLUMN_NAME === 'submitted_by_name');
          const hasSubmittedByRole2 = columns2.some(col => col.COLUMN_NAME === 'submitted_by_role');
          
          if (existingProgramId) {
            // Update existing program to approve it
            // Check if program already has manual_status_override set - preserve it if TRUE
            const [existingProgram2] = await connection.execute(
              'SELECT manual_status_override FROM programs_projects WHERE id = ?',
              [existingProgramId]
            );
            const existingManualOverride2 = existingProgram2[0]?.manual_status_override === 1 || existingProgram2[0]?.manual_status_override === true;
            
            // Calculate initial status from event dates (only during creation/update)
            // After creation, admin can manually change status which will override dates
            const initialStatus2Update = calculateInitialStatusFromDates(
              data.event_start_date || null,
              data.event_end_date || null,
              data.multiple_dates || null
            );
            
            // Preserve manual_status_override if it was already set, otherwise set to FALSE (dates will determine status)
            const manualOverrideValue2 = existingManualOverride2 ? 1 : 0;
            
            let updateQuery2, updateValues2;
            
            if (hasSubmittedByName2 && hasSubmittedByRole2) {
              updateQuery2 = `UPDATE programs_projects 
                SET title = ?, description = ?, category = ?, status = ?, image = ?, event_start_date = ?, event_end_date = ?, slug = ?, is_approved = ?, is_collaborative = ?, accepts_volunteers = ?, manual_status_override = ?, submitted_by_name = ?, submitted_by_role = ?
                WHERE id = ?`;
              updateValues2 = [
                data.title,
                data.description,
                data.category,
                initialStatus2Update, // Calculated from event dates during creation/update
                cloudinaryImageUrl, // Use Cloudinary URL instead of base64
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // SECURITY FIX: Always approve when superadmin approves (this is the approval process)
                false, // Not collaborative
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                manualOverrideValue2, // Preserve existing manual override if set, otherwise FALSE
                (data.submitted_by_name && data.submitted_by_name.trim()) ? data.submitted_by_name.trim() : null,
                (data.submitted_by_role && data.submitted_by_role.trim()) ? data.submitted_by_role.trim() : null,
                existingProgramId
              ];
            } else {
              updateQuery2 = `UPDATE programs_projects 
                SET title = ?, description = ?, category = ?, status = ?, image = ?, event_start_date = ?, event_end_date = ?, slug = ?, is_approved = ?, is_collaborative = ?, accepts_volunteers = ?, manual_status_override = ?
                WHERE id = ?`;
              updateValues2 = [
                data.title,
                data.description,
                data.category,
                initialStatus2Update, // Calculated from event dates during creation/update
                cloudinaryImageUrl, // Use Cloudinary URL instead of base64
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // SECURITY FIX: Always approve when superadmin approves (this is the approval process)
                false, // Not collaborative
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                manualOverrideValue2, // Preserve existing manual override if set, otherwise FALSE
                existingProgramId
              ];
            }
            
            await connection.execute(updateQuery2, updateValues2);
            programId = existingProgramId;
          } else {
            // Create new program
            // Calculate initial status from event dates (only during creation)
            // After creation, admin can manually change status which will override dates
            const initialStatus2 = calculateInitialStatusFromDates(
              data.event_start_date || null,
              data.event_end_date || null,
              data.multiple_dates || null
            );
            
            let insertQuery2, insertValues2;
            
            if (hasSubmittedByName2 && hasSubmittedByRole2) {
              insertQuery2 = `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative, accepts_volunteers, manual_status_override, submitted_by_name, submitted_by_role)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
              insertValues2 = [
                orgId,
                data.title,
                data.description,
                data.category,
                initialStatus2, // Calculated from event dates during creation
                cloudinaryImageUrl, // Use Cloudinary URL instead of base64
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // SECURITY FIX: Always approve when superadmin approves (this is the approval process)
                false, // Not collaborative
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                false, // New approved programs start with automatic status (no manual override) - admin can change later
                (data.submitted_by_name && data.submitted_by_name.trim()) ? data.submitted_by_name.trim() : null,
                (data.submitted_by_role && data.submitted_by_role.trim()) ? data.submitted_by_role.trim() : null
              ];
            } else {
              insertQuery2 = `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative, accepts_volunteers, manual_status_override)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
              insertValues2 = [
                orgId,
                data.title,
                data.description,
                data.category,
                initialStatus2, // Calculated from event dates during creation
                cloudinaryImageUrl, // Use Cloudinary URL instead of base64
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // SECURITY FIX: Always approve when superadmin approves (this is the approval process)
                false, // Not collaborative
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                false // New approved programs start with automatic status (no manual override) - admin can change later
              ];
            }
            
            const [result] = await connection.execute(insertQuery2, insertValues2);
            programId = result.insertId;
          }
          
          // Handle multiple dates for non-collaborative programs
          if (data.multiple_dates && Array.isArray(data.multiple_dates) && data.multiple_dates.length > 0) {
            for (const date of data.multiple_dates) {
              await connection.execute(
                `INSERT INTO program_event_dates (program_id, event_date) VALUES (?, ?)`,
                [programId, date]
              );
            }
          }
        }

          // Handle additional images upload to Cloudinary
          if (data.additionalImages && Array.isArray(data.additionalImages) && data.additionalImages.length > 0) {
            const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
            const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
            
            for (let i = 0; i < data.additionalImages.length; i++) {
              const imageData = data.additionalImages[i];
              
              if (!imageData) {
                continue; // Skip empty entries
              }
              
              // Check if it's a new base64 image that needs to be uploaded
              if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
                try {
                  // Convert base64 to buffer
                  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
                  const buffer = Buffer.from(base64Data, 'base64');
                  
                  // Create a file-like object for Cloudinary upload
                  const file = {
                    buffer: buffer,
                    originalname: `additional-${i}.jpg`,
                    mimetype: imageData.match(/data:image\/(\w+);/)?.[1] || 'jpg',
                    size: buffer.length
                  };
                  
                  // Upload to Cloudinary
                  const uploadResult = await uploadSingleToCloudinary(
                    file, 
                    CLOUDINARY_FOLDERS.PROGRAMS.ADDITIONAL,
                    { prefix: 'prog_add_' }
                  );
                  
                  if (!uploadResult || !uploadResult.url) {
                    logError(`Cloudinary upload failed for additional image ${i}: No URL returned`, null, { context: 'approval_controller', imageIndex: i });
                    continue;
                  }
                  
                  // Store Cloudinary URL in database
                  await connection.execute(
                    `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                    [programId, uploadResult.url, i]
                  );
                  
                } catch (uploadError) {
                  logError(`Cloudinary upload failed for additional image ${i}`, uploadError, { context: 'approval_controller', imageIndex: i });
                  // Fallback: Store base64 in database if Cloudinary fails (for resilience)
                  // This ensures images aren't lost if Cloudinary is temporarily unavailable
                  try {
                    await connection.execute(
                      `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                      [programId, imageData, i]
                    );
                  } catch (dbError) {
                    logError(`Failed to store base64 fallback for image ${i}`, dbError, { context: 'approval_controller', imageIndex: i });
                  }
                }
              } else if (typeof imageData === 'string' && (imageData.startsWith('http://') || imageData.startsWith('https://'))) {
                // It's an existing Cloudinary URL - store it directly
                try {
                  await connection.execute(
                    `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                    [programId, imageData, i]
                  );
                } catch (dbError) {
                  logError(`Failed to store existing image ${i}`, dbError, { context: 'approval_controller', imageIndex: i });
                }
              }
              // Skip any invalid formats
            }
          }

          // Handle post-act report if provided (for completed programs created with post-act report)
          // When a program with post-act report is approved, the post-act report is automatically approved
          // without creating a duplicate submission that needs separate approval
          if (data.postActReport && data.postActReport.file_url && programId) {
            try {
              // Check if program_post_act_reports table exists
              const [tableCheckRows] = await connection.execute(
                `SELECT COUNT(*) as cnt FROM information_schema.tables 
                  WHERE table_schema = DATABASE() AND table_name = 'program_post_act_reports'`
              );
              const hasPostActTable = tableCheckRows?.[0]?.cnt > 0;
              
              if (hasPostActTable) {
                // Check if a post-act report already exists for this program
                // This prevents duplicates if program was already approved with a post-act report
                const [existingReport] = await connection.execute(
                  `SELECT id, status FROM program_post_act_reports WHERE program_id = ? LIMIT 1`,
                  [programId]
                );
                
                if (existingReport.length > 0) {
                  // Post-act report already exists - update it instead of creating duplicate
                  const existingReportId = existingReport[0].id;
                  await connection.execute(
                    `UPDATE program_post_act_reports 
                     SET file_public_id = ?, file_url = ?, status = 'approved', 
                         uploaded_by_admin_id = ?, reviewed_by_superadmin_id = ?, reviewed_at = NOW()
                     WHERE id = ?`,
                    [
                      data.postActReport.file_public_id || null,
                      data.postActReport.file_url,
                      submission.submitted_by || null,
                      req.superadmin?.id || null,
                      existingReportId
                    ]
                  );
                  logInfo(`Updated existing post-act report ${existingReportId} for program ${programId} during program approval`, { context: 'approval_controller' });
                } else {
                  // Create new post-act report record with status 'approved' (auto-approved as part of program approval)
                  // No separate submission is created since it's already included in the program submission
                  const [reportResult] = await connection.execute(
                    `INSERT INTO program_post_act_reports (program_id, file_public_id, file_url, status, uploaded_by_admin_id, reviewed_by_superadmin_id, reviewed_at)
                     VALUES (?, ?, ?, 'approved', ?, ?, NOW())`,
                    [
                      programId,
                      data.postActReport.file_public_id || null,
                      data.postActReport.file_url,
                      submission.submitted_by || null,
                      req.superadmin?.id || null
                    ]
                  );
                  
                  const reportId = reportResult.insertId;
                  logInfo(`Created new post-act report ${reportId} for program ${programId} during program approval`, { context: 'approval_controller' });
                }
                
                // Update program status to Completed with manual override since post-act report is approved
                await connection.execute(
                  `UPDATE programs_projects SET status = 'Completed', manual_status_override = TRUE WHERE id = ?`,
                  [programId]
                );
                
                // Notify admin that the post-act report was auto-approved with the program
                try {
                  if (submission.submitted_by) {
                    await NotificationController.createNotification(
                      submission.submitted_by,
                      'post_act_report_approved',
                      'Post Act Report Approved',
                      `Your Post Act Report for program "${data.title}" was automatically approved with the program. The program is now marked as Completed.`,
                      'programs',
                      programId
                    );
                  }
                } catch (notifErr) {
                  // Non-fatal: notification failure should not block approval
                  logError('Failed to send post-act report auto-approval notification', notifErr, { context: 'approval_controller' });
                }
              }
            } catch (postActError) {
              // Non-fatal: post-act report handling failure should not block program approval
              logError('Failed to handle post-act report during program approval', postActError, { context: 'approval_controller' });
            }
          }

        // Note: For collaborative programs, they are set to pending_collaboration status
        // and will only be approved by superadmin after collaborators accept
        // Collaborators are notified individually when collaboration requests are created
        
      } catch (insertError) {
        throw insertError;
      }
    }

    // Handle Post Act Report approval
    if (section === 'Post Act Report') {
      // Extract report_id and program_id from proposed_data
      const reportId = data.report_id;
      const programId = data.program_id;

      if (!reportId || !programId) {
        throw new Error('Post Act Report submission missing report_id or program_id');
      }

      // Check if report exists and is pending
      const [reportRows] = await connection.execute(
        `SELECT id, program_id, status FROM program_post_act_reports WHERE id = ? FOR UPDATE`,
        [reportId]
      );

      if (reportRows.length === 0) {
        throw new Error('Post Act Report not found');
      }

      const report = reportRows[0];
      
      // Verify the program_id matches
      if (report.program_id !== programId) {
        throw new Error('Post Act Report program_id mismatch');
      }

      if (report.status !== 'pending') {
        throw new Error(`Post Act Report is not pending (current status: ${report.status})`);
      }

      // Update post act report status to approved
      await connection.execute(
        `UPDATE program_post_act_reports SET status = 'approved', reviewed_by_superadmin_id = ?, reviewed_at = NOW() WHERE id = ?`,
        [req.superadmin?.id || null, reportId]
      );

      // Update program status to Completed with manual override
      await connection.execute(
        `UPDATE programs_projects SET status = 'Completed', manual_status_override = TRUE WHERE id = ?`,
        [programId]
      );
    }

    // Handle highlights approval - update highlight status
    if (section === 'highlights' && data) {
      const action = data.action;
      
      // Extract highlight_id with proper type conversion
      let highlightId = null;
      if (data.highlight_id !== undefined && data.highlight_id !== null) {
        // Convert to integer, handling both string and number types
        highlightId = typeof data.highlight_id === 'string' 
          ? parseInt(data.highlight_id, 10) 
          : parseInt(data.highlight_id, 10);
        
        // Validate the conversion
        if (isNaN(highlightId)) {
          highlightId = null;
          logError(`Invalid highlight_id: ${data.highlight_id}`, null, { context: 'approval_controller', submissionId: id });
        }
      }
      
      // Log for debugging
      logInfo(`Processing highlight approval: action=${action}, highlight_id=${highlightId}, data=${JSON.stringify(data)}`, { 
        context: 'approval_controller', 
        submissionId: id 
      });
      
      if (action === 'delete') {
        // For deletions, ensure the highlight is actually deleted
        if (highlightId) {
          // Check if highlight still exists
          const [existingHighlight] = await connection.execute(
            'SELECT id FROM admin_highlights WHERE id = ?',
            [highlightId]
          );
          
          if (existingHighlight.length > 0) {
            // Highlight still exists, delete it now (approved deletion)
            await connection.execute(
              'DELETE FROM admin_highlights WHERE id = ?',
              [highlightId]
            );
            logInfo(`Highlight ${highlightId} deleted successfully`, { context: 'approval_controller' });
          }
        }
      } else if (highlightId) {
        // For create/update actions, or if action is missing but highlight_id exists, update status to approved
        // This handles cases where action might be missing or undefined
        
        // First, verify the highlight exists and get its current status
        const [existingHighlight] = await connection.execute(
          'SELECT id, status FROM admin_highlights WHERE id = ?',
          [highlightId]
        );
        
        if (existingHighlight.length === 0) {
          logError(`Highlight ${highlightId} not found in database`, null, { 
            context: 'approval_controller', 
            highlightId: highlightId,
            action: action
          });
          
          // Try fallback by title
          if (data.title) {
            const [fallbackResult] = await connection.execute(
              'UPDATE admin_highlights SET status = ? WHERE title = ? AND status = ?',
              ['approved', data.title, 'pending']
            );
            if (fallbackResult.affectedRows > 0) {
              logInfo(`Highlight updated by title fallback: ${data.title}`, { context: 'approval_controller' });
            } else {
              logError(`Failed to update highlight by title fallback - ${data.title}. Highlight may not exist or already approved.`, null, { 
                context: 'approval_controller', 
                title: data.title,
                highlightId: highlightId
              });
            }
          }
        } else {
          // Highlight exists, update its status
          const currentStatus = existingHighlight[0].status;
          logInfo(`Updating highlight ${highlightId} from status '${currentStatus}' to 'approved'`, { 
            context: 'approval_controller' 
          });
          
          // Ensure highlightId is an integer for the query
          const highlightIdInt = parseInt(highlightId, 10);
          
          const [updateResult] = await connection.execute(
            'UPDATE admin_highlights SET status = ?, updated_at = NOW() WHERE id = ?',
            ['approved', highlightIdInt]
          );
          
          if (updateResult.affectedRows === 0) {
            logError(`Failed to update highlight ${highlightId} - no rows affected after verification`, null, { 
              context: 'approval_controller', 
              highlightId: highlightId,
              highlightIdInt: highlightIdInt,
              currentStatus: currentStatus
            });
            
            // Try one more time with the original highlightId (in case of type mismatch)
            const [retryResult] = await connection.execute(
              'UPDATE admin_highlights SET status = ?, updated_at = NOW() WHERE id = ?',
              ['approved', highlightId]
            );
            
            if (retryResult.affectedRows > 0) {
              logInfo(`Highlight ${highlightId} status updated to approved on retry`, { 
                context: 'approval_controller' 
              });
            } else {
              // Last resort: try updating by title
              if (data.title) {
                const [titleResult] = await connection.execute(
                  'UPDATE admin_highlights SET status = ?, updated_at = NOW() WHERE title = ? AND status = ?',
                  ['approved', data.title, 'pending']
                );
                if (titleResult.affectedRows > 0) {
                  logInfo(`Highlight updated by title fallback: ${data.title}`, { context: 'approval_controller' });
                } else {
                  logError(`All update attempts failed for highlight ${highlightId}`, null, { 
                    context: 'approval_controller',
                    highlightId: highlightId,
                    title: data.title
                  });
                }
              }
            }
          } else {
            // Verify the update actually happened
            const [verifyResult] = await connection.execute(
              'SELECT status FROM admin_highlights WHERE id = ?',
              [highlightIdInt]
            );
            
            if (verifyResult.length > 0 && verifyResult[0].status === 'approved') {
              logInfo(`Highlight ${highlightId} status updated to approved successfully (was: ${currentStatus}, verified: ${verifyResult[0].status})`, { 
                context: 'approval_controller' 
              });
            } else {
              logError(`Highlight ${highlightId} update verification failed. Expected: approved, Got: ${verifyResult[0]?.status || 'not found'}`, null, { 
                context: 'approval_controller',
                highlightId: highlightId
              });
            }
          }
        }
      } else {
        logError(`Cannot update highlight: missing or invalid highlight_id. Data: ${JSON.stringify(data)}`, null, { 
          context: 'approval_controller',
          action: action,
          section: section
        });
      }
    }

    // Update submission status to approved
    await connection.execute(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id]);
    
    // Create dynamic notification message based on section and data
    let notificationMessage = `Your submission for ${section} has been approved by SuperAdmin`;
    
    // Add specific details for Post Act Report
    if (section === 'Post Act Report') {
      // Get program title for the notification message
      try {
        const [programRows] = await connection.execute(
          `SELECT title FROM programs_projects WHERE id = ?`,
          [data.program_id]
        );
        const programTitle = programRows.length > 0 ? programRows[0].title : 'program';
        notificationMessage = `Your Post Act Report was approved. The program "${programTitle}" is now marked as Completed.`;
      } catch (err) {
        notificationMessage = 'Your Post Act Report was approved. The program is now marked as Completed.';
      }
    }
    // Add specific details for programs
    else if (section === 'programs' && data.title) {
      if (data.collaborators && data.collaborators.length > 0) {
        notificationMessage = `Your collaborative program "${data.title}" has been approved by SuperAdmin. Collaboration requests have been sent to the invited organizations.`;
      } else {
        notificationMessage = `Your program "${data.title}" has been approved by SuperAdmin`;
      }
    }
    // Add specific details for news
    else if (section === 'news' && data.title) {
      notificationMessage = `Your news "${data.title}" has been approved by SuperAdmin`;
    }
    // Add specific details for highlights
    else if (section === 'highlights' && data) {
      if (data.action === 'delete' && data.title) {
        notificationMessage = `Your deletion request for highlight "${data.title}" has been approved by SuperAdmin. The highlight has been removed.`;
      } else if (data.title) {
        notificationMessage = `Your highlight "${data.title}" has been approved by SuperAdmin`;
      }
    }
    // Create notification for the admin
    try {
      const notificationResult = await NotificationController.createNotification(
        submission.submitted_by,
        'approval',
        'Submission Approved',
        notificationMessage,
        section,
        id
      );

      if (!notificationResult.success) {
        // Don't fail the main operation if notification fails
      }
    } catch (notificationError) {
      // Don't fail the main operation if notification fails
    }

    // Note: Collaborator notifications are handled within the section-specific blocks

    // Log superadmin action
    try {
      await logSuperadminAction(req.superadmin?.id, 'approve_submission', `Approved submission ${id} (${section}) for org ${orgId}`, req);
    } catch (auditError) {
      // Don't fail the main operation if audit logging fails
    }

     // Commit transaction
     await connection.commit();
    
    res.json({ success: true, message: 'Submission approved and applied.' });
  } catch (err) {
    // Rollback transaction on error
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        logError('Failed to rollback transaction', rollbackError, { context: 'approval_controller', submissionId: id });
      }
    }
    
    // Log detailed error information
    logError(`Error approving submission ${id}`, err, { 
      context: 'approval_controller', 
      submissionId: id,
      section: err.section || 'unknown',
      errorStack: err.stack
    });
    
    // Return detailed error message
    const errorMessage = err.message || 'Unknown error occurred';
    res.status(500).json({ 
      success: false, 
      message: 'Failed to apply submission', 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
};

export const rejectSubmission = async (req, res) => {
  const { id } = req.params;
  const { rejection_comment } = req.body;

  try {
    // Check if submission exists and is pending
    // Note: previous_data is not used in submission flow - only fetch columns we need
    const [rows] = await db.execute(
      `SELECT id, organization_id, section, proposed_data, submitted_by, 
              status, rejection_reason, submitted_at, updated_at 
       FROM submissions WHERE id = ? AND status = "pending"`, 
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found or already processed' 
      });
    }

    const submission = rows[0];

    // Handle highlights rejection by updating highlight status
    if (submission.section === 'highlights') {
      try {
        let data;
        try {
          data = safeParseJSON(submission.proposed_data, {});
        } catch (parseError) {
          // If proposed_data cannot be parsed, this is an invalid submission
          data = {};
        }
        
        // If this is a deletion rejection, ensure the highlight stays approved (don't delete)
        if (data && data.action === 'delete') {
          const highlightId = data.highlight_id || (typeof data.highlight_id === 'string' ? parseInt(data.highlight_id) : null);
          if (highlightId) {
            // Check if highlight exists and ensure it stays approved
            const [existingHighlight] = await db.execute(
              'SELECT id, status FROM admin_highlights WHERE id = ?',
              [highlightId]
            );
            
            if (existingHighlight.length > 0) {
              // Highlight exists - ensure it's approved (if it was approved before deletion request)
              // The highlight should remain approved since deletion was rejected
              await db.execute(
                'UPDATE admin_highlights SET status = ? WHERE id = ? AND status != ?',
                ['approved', highlightId, 'approved']
              );
            }
          }
        } else if (data && data.highlight_id) {
          // For create/update rejections, mark as rejected
          await db.execute(
            'UPDATE admin_highlights SET status = ? WHERE id = ?',
            ['rejected', data.highlight_id]
          );
        }
      } catch (parseError) {
        // Continue with submission rejection even if highlight update fails
      }
    }

    // Handle Post Act Report rejection
    if (submission.section === 'Post Act Report') {
      try {
        const data = safeParseJSON(submission.proposed_data, {});
        const reportId = data.report_id;
        
        if (reportId) {
          // Update post act report status to rejected
          await db.execute(
            `UPDATE program_post_act_reports 
             SET status = 'rejected', reviewed_by_superadmin_id = ?, reviewed_at = NOW()
             WHERE id = ? AND status = 'pending'`,
            [req.superadmin?.id || null, reportId]
          );
        }
      } catch (parseError) {
        // Continue with submission rejection even if report update fails
      }
    }

    // Handle program rejection - clean up unapproved programs and collaboration records
    if (submission.section === 'programs') {
      try {
        const data = safeParseJSON(submission.proposed_data, {});
        const programId = data.program_id;
        
        if (programId) {
          await cleanupUnapprovedProgram(programId, id);
        } else {
          // No program_id in submission - clean up collaboration records linked to this submission
          await db.execute(
            'DELETE FROM program_collaborations WHERE submission_id = ? AND program_id IS NULL',
            [id]
          );
        }
      } catch (parseError) {
        // Continue with submission rejection even if program cleanup fails
        // Still try to clean up collaboration records
        try {
          await db.execute(
            'DELETE FROM program_collaborations WHERE submission_id = ? AND program_id IS NULL',
            [id]
          );
        } catch (cleanupError) {
          // Continue with submission rejection even if cleanup fails
        }
      }
    }

    // Update submission status to rejected
    await db.execute(
      'UPDATE submissions SET status = "rejected", rejection_reason = ? WHERE id = ?',
      [rejection_comment || 'No reason provided', id]
    );

    // Create dynamic notification message based on section and data
    let notificationMessage = `Your submission for ${submission.section} has been declined by SuperAdmin`;
    
    // Parse the proposed data to get specific details
    try {
      let data;
      try {
        data = safeParseJSON(submission.proposed_data, {});
      } catch (parseError) {
        // If proposed_data cannot be parsed, use empty object
        data = {};
      }
      
      // Add specific details for Post Act Report
      if (submission.section === 'Post Act Report') {
        try {
          const [programRows] = await db.execute(
            `SELECT title FROM programs_projects WHERE id = ?`,
            [data.program_id]
          );
          const programTitle = programRows.length > 0 ? programRows[0].title : 'program';
          notificationMessage = `Your Post Act Report for "${programTitle}" has been declined by SuperAdmin. Please review the note and re-upload.`;
        } catch (err) {
          notificationMessage = 'Your Post Act Report has been declined by SuperAdmin. Please review the note and re-upload.';
        }
      }
      // Add specific details for programs
      else if (submission.section === 'programs' && data.title) {
        notificationMessage = `Your program "${data.title}" has been declined by SuperAdmin`;
      }
      // Add specific details for highlights
      else if (submission.section === 'highlights' && data) {
        if (data.action === 'delete' && data.title) {
          notificationMessage = `Your deletion request for highlight "${data.title}" has been declined by SuperAdmin. The highlight remains visible.`;
        } else if (data.title) {
          notificationMessage = `Your highlight "${data.title}" has been declined by SuperAdmin`;
        }
      }
    } catch (parseError) {
      // Keep the generic message if parsing fails
    }

    // Create notification for the admin
    const notificationResult = await NotificationController.createNotification(
      submission.submitted_by,
      'decline',
      'Submission Declined',
      notificationMessage,
      submission.section,
      id
    );

    if (!notificationResult.success) {
      logError('Failed to create notification', notificationResult.error, { context: 'approval_controller' });
      // Don't fail the main operation if notification fails
    }

    // Log superadmin action
    await logSuperadminAction(req.superadmin?.id, 'reject_submission', `Rejected submission ${id} (${submission.section}) for org ${submission.organization_id}`, req)

    res.json({ 
      success: true, 
      message: 'Submission rejected successfully' 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reject submission', 
      error: err.message 
    });
  }
};

// Bulk approve submissions
export const bulkApproveSubmissions = async (req, res) => {
  const { ids } = req.body;
  let connection;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No submission IDs provided'
    });
  }

  try {
    // Get a connection from the pool for the entire transaction
    connection = await db.getConnection();
    
     // Start database transaction for bulk operations
     await connection.beginTransaction();
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        // Note: previous_data is not used in submission flow - only fetch columns we need
    const [rows] = await connection.execute(
      `SELECT id, organization_id, section, proposed_data, submitted_by, 
              status, rejection_reason, submitted_at, updated_at 
       FROM submissions WHERE id = ?`, 
      [id]
    );
        
        if (rows.length === 0) {
          errors.push(`Submission ${id} not found`);
          errorCount++;
          continue;
        }

        const submission = rows[0];
        
        if (submission.status !== 'pending') {
          errors.push(`Submission ${id} is not pending`);
          errorCount++;
          continue;
        }

        let data;
        try {
          data = safeParseJSON(submission.proposed_data, {});
        } catch (parseError) {
          errors.push(`Submission ${id} has invalid proposed_data`);
          errorCount++;
          continue;
        }
        
        // All submission data is in proposed_data - no need to check previous_data
        
        const section = submission.section;
        const orgId = submission.organization_id;

        // Apply changes based on section - same logic as individual approveSubmission
        // Note: organization and org_heads are not part of the submission flow
        // They are updated directly via their respective endpoints (/api/organization and /api/heads)
        // Note: advocacy and competency are no longer part of the approval workflow
        // They are saved directly by admins via their respective endpoints
        
        // Safety check: Skip legacy submissions for unsupported sections
        if (section === 'organization' || section === 'org_heads' || section === 'advocacy' || section === 'competency') {
          errors.push(`Submission ${id}: Section "${section}" is no longer supported. Please use direct API endpoints.`);
          errorCount++;
          continue;
        }

        if (section === 'programs') {
          // Validate required program data
          if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
            errors.push(`Submission ${id}: Program title is required and must be a non-empty string`);
            errorCount++;
            continue;
          }
          if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
            errors.push(`Submission ${id}: Program description is required and must be a non-empty string`);
            errorCount++;
            continue;
          }
          if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
            errors.push(`Submission ${id}: Program category is required and must be a non-empty string`);
            errorCount++;
            continue;
          }
          
          // Check if program_id exists in proposed_data (program was already created but not approved)
          let existingProgramId = null;
          let programId = null;
          
          if (data.program_id) {
            // Check if the program exists in the database
            const [existingProgram] = await connection.execute(
              'SELECT id, is_approved FROM programs_projects WHERE id = ?',
              [data.program_id]
            );
            
            if (existingProgram.length > 0) {
              existingProgramId = existingProgram[0].id;
              // Program exists - we'll update it instead of creating a new one
            }
          }
          
          // Generate slug from title
          const slug = data.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim('-'); // Remove leading/trailing hyphens
          
          // Ensure uniqueness by appending counter if needed (only if creating new program)
          let finalSlug = slug;
          if (!existingProgramId) {
            let counter = 1;
            while (true) {
              const [existingSlug] = await connection.execute(
                'SELECT id FROM programs_projects WHERE slug = ?',
                [finalSlug]
              );
              
              if (existingSlug.length === 0) {
                break;
              }
              finalSlug = `${slug}-${counter}`;
              counter++;
            }
          } else {
            // Use existing program's slug
            const [existingSlugRow] = await connection.execute(
              'SELECT slug FROM programs_projects WHERE id = ?',
              [existingProgramId]
            );
            if (existingSlugRow.length > 0) {
              finalSlug = existingSlugRow[0].slug;
            }
          }

          // Handle main image upload to Cloudinary
          let cloudinaryImageUrl = data.image;
          
          // Clean the image data - JSON_EXTRACT returns quoted strings, so we need to remove quotes
          const { cleanImageData, isBase64Image } = await import('../../utils/jsonUtils.js');
          const cleanedImageData = cleanImageData(data.image);
          
          if (isBase64Image(cleanedImageData)) {
            try {
              const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
              const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
              
              // Convert base64 to buffer
              const base64Data = cleanedImageData.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              
              // Create a file-like object for Cloudinary upload
              const file = {
                buffer: buffer,
                originalname: `program-${Date.now()}.jpg`,
                mimetype: cleanedImageData.match(/data:image\/(\w+);/)[0].replace('data:', '').replace(';', ''),
                size: buffer.length
              };
              
              // Upload to Cloudinary
              const uploadResult = await uploadSingleToCloudinary(
                file, 
                CLOUDINARY_FOLDERS.PROGRAMS.MAIN,
                { prefix: 'prog_main_' }
              );
              
              cloudinaryImageUrl = uploadResult.url;
            } catch (uploadError) {
              // Continue with cleaned base64 as fallback
              cloudinaryImageUrl = cleanedImageData;
            }
          }

          // Check if submitted_by_name and submitted_by_role columns exist (for bulk approve)
          const [columns3] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'programs_projects' 
            AND COLUMN_NAME IN ('submitted_by_name', 'submitted_by_role')
          `);
          
          const hasSubmittedByName3 = columns3.some(col => col.COLUMN_NAME === 'submitted_by_name');
          const hasSubmittedByRole3 = columns3.some(col => col.COLUMN_NAME === 'submitted_by_role');
          
          if (existingProgramId) {
            // Update existing program to approve it
            // Check if program already has manual_status_override set - preserve it if TRUE
            const [existingProgram3] = await connection.execute(
              'SELECT manual_status_override FROM programs_projects WHERE id = ?',
              [existingProgramId]
            );
            const existingManualOverride3 = existingProgram3[0]?.manual_status_override === 1 || existingProgram3[0]?.manual_status_override === true;
            
            // Calculate initial status from event dates (only during creation/update)
            // After creation, admin can manually change status which will override dates
            const initialStatus3Update = calculateInitialStatusFromDates(
              data.event_start_date || null,
              data.event_end_date || null,
              data.multiple_dates || null
            );
            
            // Preserve manual_status_override if it was already set, otherwise set to FALSE (dates will determine status)
            const manualOverrideValue3 = existingManualOverride3 ? 1 : 0;
            
            let updateQuery3, updateValues3;
            
            if (hasSubmittedByName3 && hasSubmittedByRole3) {
              updateQuery3 = `UPDATE programs_projects 
                SET title = ?, description = ?, category = ?, status = ?, image = ?, event_start_date = ?, event_end_date = ?, slug = ?, is_approved = ?, is_collaborative = ?, accepts_volunteers = ?, manual_status_override = ?, submitted_by_name = ?, submitted_by_role = ?
                WHERE id = ?`;
              updateValues3 = [
                data.title,
                data.description,
                data.category,
                initialStatus3Update, // Calculated from event dates during creation/update
                cloudinaryImageUrl,
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // Approved by superadmin
                data.collaborators && data.collaborators.length > 0,
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                manualOverrideValue3, // Preserve existing manual override if set, otherwise FALSE
                (data.submitted_by_name && data.submitted_by_name.trim()) ? data.submitted_by_name.trim() : null,
                (data.submitted_by_role && data.submitted_by_role.trim()) ? data.submitted_by_role.trim() : null,
                existingProgramId
              ];
            } else {
              updateQuery3 = `UPDATE programs_projects 
                SET title = ?, description = ?, category = ?, status = ?, image = ?, event_start_date = ?, event_end_date = ?, slug = ?, is_approved = ?, is_collaborative = ?, accepts_volunteers = ?, manual_status_override = ?
                WHERE id = ?`;
              updateValues3 = [
                data.title,
                data.description,
                data.category,
                initialStatus3Update, // Calculated from event dates during creation/update
                cloudinaryImageUrl,
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // Approved by superadmin
                data.collaborators && data.collaborators.length > 0,
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                manualOverrideValue3, // Preserve existing manual override if set, otherwise FALSE
                existingProgramId
              ];
            }
            
            await connection.execute(updateQuery3, updateValues3);
            programId = existingProgramId;
          } else {
            // Create new program
            // Calculate initial status from event dates (only during creation)
            // After creation, admin can manually change status which will override dates
            const initialStatus3 = calculateInitialStatusFromDates(
              data.event_start_date || null,
              data.event_end_date || null,
              data.multiple_dates || null
            );
            
            let insertQuery3, insertValues3;
            
            if (hasSubmittedByName3 && hasSubmittedByRole3) {
              insertQuery3 = `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative, accepts_volunteers, manual_status_override, submitted_by_name, submitted_by_role)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
              insertValues3 = [
                orgId,
                data.title,
                data.description,
                data.category,
                initialStatus3, // Calculated from event dates during creation
                cloudinaryImageUrl, // Use Cloudinary URL instead of base64
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // SECURITY FIX: Always approve when superadmin approves (this is the approval process)
                data.collaborators && data.collaborators.length > 0,
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                false, // New approved programs start with automatic status (no manual override)
                (data.submitted_by_name && data.submitted_by_name.trim()) ? data.submitted_by_name.trim() : null,
                (data.submitted_by_role && data.submitted_by_role.trim()) ? data.submitted_by_role.trim() : null
              ];
            } else {
              insertQuery3 = `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative, accepts_volunteers, manual_status_override)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
              insertValues3 = [
                orgId,
                data.title,
                data.description,
                data.category,
                'Upcoming', // Default status for approved programs
                cloudinaryImageUrl, // Use Cloudinary URL instead of base64
                data.event_start_date || null,
                data.event_end_date || null,
                finalSlug,
                true, // SECURITY FIX: Always approve when superadmin approves (this is the approval process)
                data.collaborators && data.collaborators.length > 0,
                data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
                false // New approved programs start with automatic status (no manual override)
              ];
            }
            
            const [result] = await connection.execute(insertQuery3, insertValues3);
            programId = result.insertId;
          }
          
          // Handle collaboration invitations if provided
          if (data.collaborators && Array.isArray(data.collaborators) && data.collaborators.length > 0) {
            // First, try to update existing collaboration requests from submission
            // IMPORTANT: Preserve existing status (accepted/declined) - don't reset to 'pending'
            const [updateResult] = await connection.execute(`
              UPDATE program_collaborations 
              SET program_id = ?, program_title = ?
              WHERE submission_id = ? AND program_id IS NULL
            `, [programId, data.title, id]);
            
            // If no existing collaboration requests were updated, create new ones
            if (updateResult.affectedRows === 0) {
              // Extract collaborator IDs (handle both object format and ID format)
              const collaboratorIds = data.collaborators.map(collab => {
                // If collaborator is an object with id property, extract the id
                if (typeof collab === 'object' && collab.id) {
                  return collab.id;
                }
                // If collaborator is already just an ID, use it directly
                return collab;
              }).filter(id => id && id !== submission.submitted_by);
              
              for (const collaboratorId of collaboratorIds) {
                try {
                  await connection.execute(`
                    INSERT INTO program_collaborations (program_id, collaborator_admin_id, invited_by_admin_id, status, program_title)
                    VALUES (?, ?, ?, 'pending', ?)
                  `, [programId, collaboratorId, submission.submitted_by, data.title]);
                } catch (collabError) {
                  // Continue if collaborator addition fails
                }
              }
            }
            
            // Send notifications to all collaborators (both updated and newly created)
            const [allCollaborations] = await connection.execute(`
              SELECT collaborator_admin_id FROM program_collaborations 
              WHERE program_id = ? AND status = 'pending'
            `, [programId]);
            
            for (const collab of allCollaborations) {
              try {
                await NotificationController.createNotification(
                  collab.collaborator_admin_id,
                  'collaboration_request',
                  'New Collaboration Request',
                  `You have received a collaboration request for "${data.title}". Please review and respond in the Collaboration section.`,
                  'programs',
                  programId
                );
              } catch (notificationError) {
                // Error sending collaboration request notification
              }
            }
          }
          
          if (data.multiple_dates && Array.isArray(data.multiple_dates) && data.multiple_dates.length > 0) {
            for (const date of data.multiple_dates) {
              await connection.execute(
                `INSERT INTO program_event_dates (program_id, event_date) VALUES (?, ?)`,
                [programId, date]
              );
            }
          }

          // Handle additional images upload to Cloudinary
          if (data.additionalImages && Array.isArray(data.additionalImages) && data.additionalImages.length > 0) {
            const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
            const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
            
            for (let i = 0; i < data.additionalImages.length; i++) {
              const imageData = data.additionalImages[i];
              
              if (!imageData) {
                continue; // Skip empty entries
              }
              
              // Check if it's a new base64 image that needs to be uploaded
              if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
                try {
                  // Convert base64 to buffer
                  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
                  const buffer = Buffer.from(base64Data, 'base64');
                  
                  // Create a file-like object for Cloudinary upload
                  const file = {
                    buffer: buffer,
                    originalname: `additional-${i}.jpg`,
                    mimetype: imageData.match(/data:image\/(\w+);/)?.[1] || 'jpg',
                    size: buffer.length
                  };
                  
                  // Upload to Cloudinary
                  const uploadResult = await uploadSingleToCloudinary(
                    file, 
                    CLOUDINARY_FOLDERS.PROGRAMS.ADDITIONAL,
                    { prefix: 'prog_add_' }
                  );
                  
                  if (!uploadResult || !uploadResult.url) {
                    logError(`Cloudinary upload failed for additional image ${i}: No URL returned`, null, { context: 'bulk_approval_controller', imageIndex: i });
                    continue;
                  }
                  
                  // Store Cloudinary URL in database
                  await connection.execute(
                    `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                    [programId, uploadResult.url, i]
                  );
                  
                } catch (uploadError) {
                  logError(`Cloudinary upload failed for additional image ${i}`, uploadError, { context: 'bulk_approval_controller', imageIndex: i });
                  // Fallback: Store base64 in database if Cloudinary fails (for resilience)
                  // This ensures images aren't lost if Cloudinary is temporarily unavailable
                  try {
                    await connection.execute(
                      `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                      [programId, imageData, i]
                    );
                  } catch (dbError) {
                    logError(`Failed to store base64 fallback for image ${i}`, dbError, { context: 'bulk_approval_controller', imageIndex: i });
                  }
                }
              } else if (typeof imageData === 'string' && (imageData.startsWith('http://') || imageData.startsWith('https://'))) {
                // It's an existing Cloudinary URL - store it directly
                try {
                  await connection.execute(
                    `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                    [programId, imageData, i]
                  );
                } catch (dbError) {
                  logError(`Failed to store existing image ${i}`, dbError, { context: 'bulk_approval_controller', imageIndex: i });
                }
              }
              // Skip any invalid formats
            }
          }

          // Handle post-act report if provided (for completed programs created with post-act report)
          // When a program with post-act report is approved, the post-act report is automatically approved
          // without creating a duplicate submission that needs separate approval
          if (data.postActReport && data.postActReport.file_url && programId) {
            try {
              // Check if program_post_act_reports table exists
              const [tableCheckRows] = await connection.execute(
                `SELECT COUNT(*) as cnt FROM information_schema.tables 
                  WHERE table_schema = DATABASE() AND table_name = 'program_post_act_reports'`
              );
              const hasPostActTable = tableCheckRows?.[0]?.cnt > 0;
              
              if (hasPostActTable) {
                // Check if a post-act report already exists for this program
                // This prevents duplicates if program was already approved with a post-act report
                const [existingReport] = await connection.execute(
                  `SELECT id, status FROM program_post_act_reports WHERE program_id = ? LIMIT 1`,
                  [programId]
                );
                
                if (existingReport.length > 0) {
                  // Post-act report already exists - update it instead of creating duplicate
                  const existingReportId = existingReport[0].id;
                  await connection.execute(
                    `UPDATE program_post_act_reports 
                     SET file_public_id = ?, file_url = ?, status = 'approved', 
                         uploaded_by_admin_id = ?, reviewed_by_superadmin_id = ?, reviewed_at = NOW()
                     WHERE id = ?`,
                    [
                      data.postActReport.file_public_id || null,
                      data.postActReport.file_url,
                      submission.submitted_by || null,
                      req.superadmin?.id || null,
                      existingReportId
                    ]
                  );
                  logInfo(`Updated existing post-act report ${existingReportId} for program ${programId} during bulk program approval`, { context: 'approval_controller' });
                } else {
                  // Create new post-act report record with status 'approved' (auto-approved as part of program approval)
                  // No separate submission is created since it's already included in the program submission
                  const [reportResult] = await connection.execute(
                    `INSERT INTO program_post_act_reports (program_id, file_public_id, file_url, status, uploaded_by_admin_id, reviewed_by_superadmin_id, reviewed_at)
                     VALUES (?, ?, ?, 'approved', ?, ?, NOW())`,
                    [
                      programId,
                      data.postActReport.file_public_id || null,
                      data.postActReport.file_url,
                      submission.submitted_by || null,
                      req.superadmin?.id || null
                    ]
                  );
                  
                  const reportId = reportResult.insertId;
                  logInfo(`Created new post-act report ${reportId} for program ${programId} during bulk program approval`, { context: 'approval_controller' });
                }
                
                // Update program status to Completed with manual override since post-act report is approved
                await connection.execute(
                  `UPDATE programs_projects SET status = 'Completed', manual_status_override = TRUE WHERE id = ?`,
                  [programId]
                );
                
                // Notify admin that the post-act report was auto-approved with the program
                try {
                  if (submission.submitted_by) {
                    await NotificationController.createNotification(
                      submission.submitted_by,
                      'post_act_report_approved',
                      'Post Act Report Approved',
                      `Your Post Act Report for program "${data.title}" was automatically approved with the program. The program is now marked as Completed.`,
                      'programs',
                      programId
                    );
                  }
                } catch (notifErr) {
                  // Non-fatal: notification failure should not block approval
                  logError('Failed to send post-act report auto-approval notification in bulk approval', notifErr, { context: 'approval_controller' });
                }
              }
            } catch (postActError) {
              // Non-fatal: post-act report handling failure should not block program approval
              logError('Failed to handle post-act report during bulk program approval', postActError, { context: 'approval_controller' });
            }
          }
        }

        // Note: For collaborative programs, they are set to pending_collaboration status
        // and will only be approved by superadmin after collaborators accept
        // Collaborators are notified individually when collaboration requests are created

    if (section === 'highlights') {
      const action = data.action;
      
      // Extract highlight_id with proper type conversion
      let highlightId = null;
      if (data.highlight_id !== undefined && data.highlight_id !== null) {
        // Convert to integer, handling both string and number types
        highlightId = typeof data.highlight_id === 'string' 
          ? parseInt(data.highlight_id, 10) 
          : parseInt(data.highlight_id, 10);
        
        // Validate the conversion
        if (isNaN(highlightId)) {
          highlightId = null;
          logError(`Invalid highlight_id in bulk approval: ${data.highlight_id}`, null, { context: 'approval_controller', submissionId: id });
        }
      }
      
      if (action === 'delete') {
        // For deletions, ensure the highlight is actually deleted
        if (highlightId) {
          // Check if highlight still exists
          const [existingHighlight] = await connection.execute(
            'SELECT id FROM admin_highlights WHERE id = ?',
            [highlightId]
          );
          
          if (existingHighlight.length > 0) {
            // Highlight still exists, delete it now (approved deletion)
            await connection.execute(
              'DELETE FROM admin_highlights WHERE id = ?',
              [highlightId]
            );
            logInfo(`Highlight ${highlightId} deleted successfully in bulk approval`, { context: 'approval_controller' });
          }
        }
      } else if (highlightId) {
        // For create/update actions, update status to approved
        // First, verify the highlight exists and get its current status
        const [existingHighlight] = await connection.execute(
          'SELECT id, status FROM admin_highlights WHERE id = ?',
          [highlightId]
        );
        
        if (existingHighlight.length === 0) {
          logError(`Highlight ${highlightId} not found in database during bulk approval`, null, { 
            context: 'approval_controller', 
            highlightId: highlightId,
            action: action
          });
          
          // Try fallback by title
          if (data.title) {
            const [fallbackResult] = await connection.execute(
              'UPDATE admin_highlights SET status = ?, updated_at = NOW() WHERE title = ? AND status = ?',
              ['approved', data.title, 'pending']
            );
            if (fallbackResult.affectedRows > 0) {
              logInfo(`Highlight updated by title fallback in bulk approval: ${data.title}`, { context: 'approval_controller' });
            }
          }
        } else {
          // Highlight exists, update its status
          const currentStatus = existingHighlight[0].status;
          const highlightIdInt = parseInt(highlightId, 10);
          
          const [updateResult] = await connection.execute(
            'UPDATE admin_highlights SET status = ?, updated_at = NOW() WHERE id = ?',
            ['approved', highlightIdInt]
          );
          
          if (updateResult.affectedRows === 0) {
            logError(`Failed to update highlight ${highlightId} in bulk approval - no rows affected`, null, { 
              context: 'approval_controller', 
              highlightId: highlightId,
              currentStatus: currentStatus
            });
            
            // Try fallback by title
            if (data.title) {
              const [fallbackResult] = await connection.execute(
                'UPDATE admin_highlights SET status = ?, updated_at = NOW() WHERE title = ? AND status = ?',
                ['approved', data.title, 'pending']
              );
              if (fallbackResult.affectedRows > 0) {
                logInfo(`Highlight updated by title fallback in bulk approval: ${data.title}`, { context: 'approval_controller' });
              }
            }
          } else {
            // Verify the update
            const [verifyResult] = await connection.execute(
              'SELECT status FROM admin_highlights WHERE id = ?',
              [highlightIdInt]
            );
            
            if (verifyResult.length > 0 && verifyResult[0].status === 'approved') {
              logInfo(`Highlight ${highlightId} status updated to approved in bulk approval (was: ${currentStatus})`, { 
                context: 'approval_controller' 
              });
            }
          }
        }
      } else {
        logError(`Cannot update highlight in bulk approval: missing or invalid highlight_id. Data: ${JSON.stringify(data)}`, null, { 
          context: 'approval_controller',
          action: action
        });
      }
    }

        // Handle Post Act Report approval
        if (section === 'Post Act Report') {
          // Extract report_id and program_id from proposed_data
          const reportId = data.report_id;
          const programId = data.program_id;

          if (!reportId || !programId) {
            errors.push(`Submission ${id} missing report_id or program_id`);
            errorCount++;
            continue;
          }

          // Check if report exists and is pending
          const [reportRows] = await connection.execute(
            `SELECT id, program_id, status FROM program_post_act_reports WHERE id = ? FOR UPDATE`,
            [reportId]
          );

          if (reportRows.length === 0) {
            errors.push(`Submission ${id}: Post Act Report not found`);
            errorCount++;
            continue;
          }

          const report = reportRows[0];
          
          // Verify the program_id matches
          if (report.program_id !== programId) {
            errors.push(`Submission ${id}: Post Act Report program_id mismatch`);
            errorCount++;
            continue;
          }

          if (report.status !== 'pending') {
            errors.push(`Submission ${id}: Post Act Report is not pending (current status: ${report.status})`);
            errorCount++;
            continue;
          }

          // Update post act report status to approved
          await connection.execute(
            `UPDATE program_post_act_reports SET status = 'approved', reviewed_by_superadmin_id = ?, reviewed_at = NOW() WHERE id = ?`,
            [req.superadmin?.id || null, reportId]
          );

          // Update program status to Completed with manual override
          await connection.execute(
            `UPDATE programs_projects SET status = 'Completed', manual_status_override = TRUE WHERE id = ?`,
            [programId]
          );
        }

        // Update submission status
        await connection.execute(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id]);

        // Create individual notification for this submission
        let notificationMessage = `Your submission for ${section} has been approved by SuperAdmin`;
        
        // Add specific details for Post Act Report
        if (section === 'Post Act Report') {
          // Get program title for the notification message
          try {
            const [programRows] = await connection.execute(
              `SELECT title FROM programs_projects WHERE id = ?`,
              [data.program_id]
            );
            const programTitle = programRows.length > 0 ? programRows[0].title : 'program';
            notificationMessage = `Your Post Act Report was approved. The program "${programTitle}" is now marked as Completed.`;
          } catch (err) {
            notificationMessage = 'Your Post Act Report was approved. The program is now marked as Completed.';
          }
        }
        // Add specific details for programs
        else if (section === 'programs' && data.title) {
          if (data.collaborators && data.collaborators.length > 0) {
            notificationMessage = `Your collaborative program "${data.title}" has been approved by SuperAdmin. Collaboration requests have been sent to the invited organizations.`;
          } else {
            notificationMessage = `Your program "${data.title}" has been approved by SuperAdmin`;
          }
        }
        // Add specific details for news
        else if (section === 'news' && data.title) {
          notificationMessage = `Your news "${data.title}" has been approved by SuperAdmin`;
        }
        // Add specific details for highlights
        else if (section === 'highlights' && data) {
          if (data.action === 'delete' && data.title) {
            notificationMessage = `Your deletion request for highlight "${data.title}" has been approved by SuperAdmin. The highlight has been removed.`;
          } else if (data.title) {
            notificationMessage = `Your highlight "${data.title}" has been approved by SuperAdmin`;
          }
        }
        
        // Create notification for the admin
        const notificationResult = await NotificationController.createNotification(
          submission.submitted_by,
          'approval',
          'Submission Approved',
          notificationMessage,
          section,
          id
        );

        if (!notificationResult.success) {
          // Don't fail the main operation if notification fails
        }


        successCount++;
      } catch (error) {
        errors.push(`Failed to approve submission ${id}: ${error.message}`);
        errorCount++;
      }
    }

     // Commit transaction if all operations succeeded
     await connection.commit();
    
    res.json({
      success: true,
      message: `Bulk approval completed: ${successCount} approved, ${errorCount} failed`,
      details: {
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    // Rollback transaction on error
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({
      success: false,
      message: 'Failed to bulk approve submissions',
      error: error.message
    });
  } finally {
    // Always release the connection back to the pool
    if (connection) {
      connection.release();
    }
  }
};

// Bulk reject submissions
export const bulkRejectSubmissions = async (req, res) => {
  const { ids, rejection_comment } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No submission IDs provided'
    });
  }

  try {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        // Note: previous_data is not used in submission flow - only fetch columns we need
        const [rows] = await db.execute(
          `SELECT id, organization_id, section, proposed_data, submitted_by, 
                  status, rejection_reason, submitted_at, updated_at 
           FROM submissions WHERE id = ?`, 
          [id]
        );
        
        if (rows.length === 0) {
          errors.push(`Submission ${id} not found`);
          errorCount++;
          continue;
        }

        const submission = rows[0];
        
        if (submission.status !== 'pending') {
          errors.push(`Submission ${id} is not pending`);
          errorCount++;
          continue;
        }

        // Handle highlights rejection by updating highlight status
        if (submission.section === 'highlights') {
          try {
            const data = safeParseJSON(submission.proposed_data, {});
            if (data.highlight_id) {
              await db.execute(
                'UPDATE admin_highlights SET status = ? WHERE id = ?',
                ['rejected', data.highlight_id]
              );
            }
          } catch (parseError) {
            // Continue with submission rejection even if highlight update fails
          }
        }

        // Handle Post Act Report rejection
        if (submission.section === 'Post Act Report') {
          try {
            const data = safeParseJSON(submission.proposed_data, {});
            const reportId = data.report_id;
            
            if (reportId) {
              // Update post act report status to rejected
              await db.execute(
                `UPDATE program_post_act_reports 
                 SET status = 'rejected', reviewed_by_superadmin_id = ?, reviewed_at = NOW()
                 WHERE id = ? AND status = 'pending'`,
                [req.superadmin?.id || null, reportId]
              );
            }
          } catch (parseError) {
            // Continue with submission rejection even if report update fails
          }
        }

        // Handle program rejection - clean up unapproved programs and collaboration records
        if (submission.section === 'programs') {
          try {
            const data = safeParseJSON(submission.proposed_data, {});
            const programId = data.program_id;
            
            if (programId) {
              await cleanupUnapprovedProgram(programId, id);
            } else {
              // No program_id in submission - clean up collaboration records linked to this submission
              await db.execute(
                'DELETE FROM program_collaborations WHERE submission_id = ? AND program_id IS NULL',
                [id]
              );
            }
          } catch (parseError) {
            // Continue with submission rejection even if program cleanup fails
            // Still try to clean up collaboration records
            try {
              await db.execute(
                'DELETE FROM program_collaborations WHERE submission_id = ? AND program_id IS NULL',
                [id]
              );
            } catch (cleanupError) {
              // Continue with submission rejection even if cleanup fails
            }
          }
        }

        // Update submission status to rejected
        await db.execute(
          'UPDATE submissions SET status = ?, rejection_reason = ? WHERE id = ?',
          ['rejected', rejection_comment || '', id]
        );

        // Create individual notification for this submission
        let notificationMessage = `Your submission for ${submission.section} has been declined by SuperAdmin`;
        
        // Parse the proposed data to get specific details
        try {
          const data = safeParseJSON(submission.proposed_data, {});
          
          // Add specific details for Post Act Report
          if (submission.section === 'Post Act Report') {
            try {
              const [programRows] = await db.execute(
                `SELECT title FROM programs_projects WHERE id = ?`,
                [data.program_id]
              );
              const programTitle = programRows.length > 0 ? programRows[0].title : 'program';
              notificationMessage = `Your Post Act Report for "${programTitle}" has been declined by SuperAdmin. Please review the note and re-upload.`;
            } catch (err) {
              notificationMessage = 'Your Post Act Report has been declined by SuperAdmin. Please review the note and re-upload.';
            }
          }
          // Add specific details for programs
          else if (submission.section === 'programs' && data.title) {
            notificationMessage = `Your program "${data.title}" has been declined by SuperAdmin`;
          }
          // Add specific details for highlights
          else if (submission.section === 'highlights' && data.title) {
            notificationMessage = `Your highlight "${data.title}" has been declined by SuperAdmin`;
          }
        } catch (parseError) {
          // Keep the generic message if parsing fails
        }

        // Create notification for the admin
        const notificationResult = await NotificationController.createNotification(
          submission.submitted_by,
          'decline',
          'Submission Declined',
          notificationMessage,
          submission.section,
          id
        );

        if (!notificationResult.success) {
          // Don't fail the main operation if notification fails
        }

        successCount++;
      } catch (error) {
        errors.push(`Failed to reject submission ${id}: ${error.message}`);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Bulk rejection completed: ${successCount} rejected, ${errorCount} failed`,
      details: {
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk reject submissions',
      error: error.message
    });
  }
};

// Delete individual submission
export const deleteSubmission = async (req, res) => {
  const { id } = req.params;

  try {
    // First, get the submission to check if it's a highlight submission
    const [submissionRows] = await db.execute(
      'SELECT section, proposed_data FROM submissions WHERE id = ?',
      [id]
    );
    
    if (submissionRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or already deleted'
      });
    }

    const submission = submissionRows[0];
    let highlightId = null;

    // If this is a highlight submission, extract highlight_id and delete the highlight
    if (submission.section === 'highlights') {
      try {
        let data = safeParseJSON(submission.proposed_data, {});
        
        // Extract highlight_id
        if (data && data.highlight_id !== undefined && data.highlight_id !== null) {
          highlightId = typeof data.highlight_id === 'string' 
            ? parseInt(data.highlight_id, 10) 
            : parseInt(data.highlight_id, 10);
          
          if (isNaN(highlightId)) {
            highlightId = null;
          }
        }
        
        // If we have a highlight_id, delete the highlight from admin_highlights
        if (highlightId) {
          const [highlightResult] = await db.execute(
            'DELETE FROM admin_highlights WHERE id = ?',
            [highlightId]
          );
          
          if (highlightResult.affectedRows > 0) {
            logInfo(`Highlight ${highlightId} deleted along with submission ${id}`, { 
              context: 'approval_controller',
              submissionId: id,
              highlightId: highlightId
            });
          } else {
            logWarn(`Highlight ${highlightId} not found when deleting submission ${id}`, { 
              context: 'approval_controller',
              submissionId: id,
              highlightId: highlightId
            });
          }
        } else {
          logWarn(`No highlight_id found in submission ${id} data`, { 
            context: 'approval_controller',
            submissionId: id,
            proposedData: submission.proposed_data,
          });
        }
      } catch (parseError) {
        logError(parseError, { 
          context: 'approval_controller-deleteSubmission-highlight',
          submissionId: id
        });
        // Continue with submission deletion even if highlight deletion fails
      }
    }

    // Delete the submission
    const [result] = await db.execute('DELETE FROM submissions WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or already deleted'
      });
    }

    res.json({
      success: true,
      message: 'Submission deleted successfully',
      deletedHighlight: highlightId || null
    });
  } catch (error) {
    logError(error, { context: 'approval_controller-deleteSubmission', submissionId: id });
    res.status(500).json({
      success: false,
      message: 'Failed to delete submission',
      error: error.message
    });
  }
};

// Bulk delete submissions
export const bulkDeleteSubmissions = async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No submission IDs provided'
    });
  }

  try {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const deletedHighlightIds = [];

    for (const id of ids) {
      try {
        // First, get the submission to check if it's a highlight submission
        const [submissionRows] = await db.execute(
          'SELECT section, proposed_data FROM submissions WHERE id = ?',
          [id]
        );
        
        if (submissionRows.length === 0) {
          errors.push(`Submission ${id} not found or already deleted`);
          errorCount++;
          continue;
        }

        const submission = submissionRows[0];
        let highlightId = null;

        // If this is a highlight submission, extract highlight_id and delete the highlight
        if (submission.section === 'highlights') {
          try {
            let data = safeParseJSON(submission.proposed_data, {});
            
            
            // Extract highlight_id
            if (data && data.highlight_id !== undefined && data.highlight_id !== null) {
              highlightId = typeof data.highlight_id === 'string' 
                ? parseInt(data.highlight_id, 10) 
                : parseInt(data.highlight_id, 10);
              
              if (isNaN(highlightId)) {
                highlightId = null;
              }
            }
            
            // If we have a highlight_id, delete the highlight from admin_highlights
            if (highlightId) {
              const [highlightResult] = await db.execute(
                'DELETE FROM admin_highlights WHERE id = ?',
                [highlightId]
              );
              
              if (highlightResult.affectedRows > 0) {
                deletedHighlightIds.push(highlightId);
                logInfo(`Highlight ${highlightId} deleted along with submission ${id} in bulk delete`, { 
                  context: 'approval_controller',
                  submissionId: id,
                  highlightId: highlightId
                });
              }
            }
          } catch (parseError) {
            logError(parseError, { 
              context: 'approval_controller-bulkDeleteSubmissions-highlight',
              submissionId: id
            });
            // Continue with submission deletion even if highlight deletion fails
          }
        }

        // Delete the submission
        const [result] = await db.execute('DELETE FROM submissions WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
          errors.push(`Submission ${id} not found or already deleted`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        errors.push(`Failed to delete submission ${id}: ${error.message}`);
        errorCount++;
        logError(error, { context: 'approval_controller-bulkDeleteSubmissions', submissionId: id });
      }
    }

    res.json({
      success: true,
      message: `Bulk deletion completed: ${successCount} deleted, ${errorCount} failed`,
      details: {
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
        deletedHighlightIds: deletedHighlightIds.length > 0 ? deletedHighlightIds : undefined
      }
    });
  } catch (error) {
    logError(error, { context: 'approval_controller-bulkDeleteSubmissions' });
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete submissions',
      error: error.message
    });
  }
};

// Note: getPendingCollaborativePrograms function removed as it's no longer needed
// Collaborative programs are now created immediately when superadmin approves the submission

// Note: Collaborative program approval/rejection functions removed as they're no longer needed
// Collaborative programs are now created immediately when superadmin approves the submission
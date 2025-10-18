//db table: submissions
import db from '../../database.js';
import NotificationController from '../../admin/controllers/notificationController.js';
import { logSuperadminAction } from '../../utils/audit.js';
import { logError, logWarn, logInfo } from '../../utils/logger.js';

export const getPendingSubmissions = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.*, 
             o.orgName, o.org, 
             submitted_admin.email as submitted_by_email,
             submitted_org.orgName as submitted_by_name 
      FROM submissions s 
      LEFT JOIN organizations o ON o.id = s.organization_id 
      LEFT JOIN admins submitted_admin ON s.submitted_by = submitted_admin.id 
      LEFT JOIN organizations submitted_org ON submitted_admin.organization_id = submitted_org.id
      WHERE s.status = 'pending' 
      ORDER BY s.submitted_at DESC
    `);

    // Parse JSON data for each submission
    const submissions = rows.map(submission => {
      try {
        return {
          ...submission,
          previous_data: JSON.parse(submission.previous_data || '{}'),
          proposed_data: JSON.parse(submission.proposed_data || '{}')
        };
      } catch (parseError) {
        return {
          ...submission,
          previous_data: {},
          proposed_data: {}
        };
      }
    });

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending submissions',
      error: error.message
    });
  }
};

export const getAllSubmissions = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.*, 
             o.orgName, o.org, 
             submitted_admin.email as submitted_by_email,
             submitted_org.orgName as submitted_by_name 
      FROM submissions s 
      LEFT JOIN organizations o ON o.id = s.organization_id 
      LEFT JOIN admins submitted_admin ON s.submitted_by = submitted_admin.id 
      LEFT JOIN organizations submitted_org ON submitted_admin.organization_id = submitted_org.id
      ORDER BY s.submitted_at DESC
    `);

    // Parse JSON data for each submission
    const submissions = rows.map(submission => {
      try {
        return {
          ...submission,
          previous_data: JSON.parse(submission.previous_data || '{}'),
          proposed_data: JSON.parse(submission.proposed_data || '{}')
        };
      } catch (parseError) {
        return {
          ...submission,
          previous_data: {},
          proposed_data: {}
        };
      }
    });

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
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
    
    const [rows] = await connection.execute('SELECT * FROM submissions WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = rows[0];
    
    // Validate and parse the proposed data
    let data;
    try {
      data = JSON.parse(submission.proposed_data);
    } catch (parseError) {
      logError('Failed to parse submission data', parseError, { context: 'approval_controller' });
      throw new Error(`Invalid submission data: ${parseError.message}`);
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
    if (section === 'organization') {
      // Update organizations table with all organization data including org/orgName
      await connection.execute(
        `UPDATE organizations SET org = ?, orgName = ?, logo = ?, facebook = ?, description = ? WHERE id = ?`,
        [data.org, data.orgName, data.logo, data.facebook, data.description, orgId]
      );
    }

    if (section === 'advocacy') {
      // Check if advocacy record exists
      const [existingAdvocacy] = await connection.execute(
        'SELECT id FROM advocacies WHERE organization_id = ?',
        [orgId]
      );
      
      // For advocacy, data is already a string from the parsed JSON
      const advocacyData = typeof data === 'string' ? data.trim() : JSON.stringify(data).trim();
      
      if (existingAdvocacy.length > 0) {
        // Update existing record
        await connection.execute(
          'UPDATE advocacies SET advocacy = ? WHERE organization_id = ?',
          [advocacyData, orgId]
        );
      } else {
        // Insert new record
        await connection.execute(
          'INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)',
          [orgId, advocacyData]
        );
      }
    }

    if (section === 'competency') {
      // Check if competency record exists
      const [existingCompetency] = await connection.execute(
        'SELECT id FROM competencies WHERE organization_id = ?',
        [orgId]
      );
      
      // For competency, data is already a string from the parsed JSON
      const competencyData = typeof data === 'string' ? data.trim() : JSON.stringify(data).trim();
      
      if (existingCompetency.length > 0) {
        // Update existing record
        await connection.execute(
          'UPDATE competencies SET competency = ? WHERE organization_id = ?',
          [competencyData, orgId]
        );
      } else {
        // Insert new record
        await connection.execute(
          'INSERT INTO competencies (organization_id, competency) VALUES (?, ?)',
          [orgId, competencyData]
        );
      }
    }

    if (section === 'org_heads') {
      await connection.execute(`DELETE FROM organization_heads WHERE organization_id = ?`, [orgId]);
      for (let head of data) {
        // Handle head photo upload to Cloudinary
        let cloudinaryPhotoUrl = head.photo;
        if (head.photo && head.photo.startsWith('data:image/')) {
          try {
            const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
            const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
            
            // Convert base64 to buffer
            const base64Data = head.photo.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Create a file-like object for Cloudinary upload
            const file = {
              buffer: buffer,
              originalname: `org-head-${Date.now()}.jpg`,
              mimetype: head.photo.match(/data:image\/(\w+);/)[0].replace('data:', '').replace(';', ''),
              size: buffer.length
            };
            
            // Upload to Cloudinary
            const uploadResult = await uploadSingleToCloudinary(
              file, 
              CLOUDINARY_FOLDERS.ORGANIZATIONS.HEADS,
              { prefix: 'org_head_' }
            );
            
            cloudinaryPhotoUrl = uploadResult.url;
          } catch (uploadError) {
            // Continue with base64 as fallback
          }
        }
        
        await connection.execute(
          `INSERT INTO organization_heads (organization_id, head_name, role, facebook, email, photo)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orgId, head.name, head.position, head.facebook, head.email, cloudinaryPhotoUrl]
        );
      }
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
        // Generate slug from title
        const slug = data.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim('-'); // Remove leading/trailing hyphens
        
        // Ensure uniqueness by appending counter if needed
        let finalSlug = slug;
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

        // For collaborative programs, create the program immediately but mark as pending collaboration
        if (data.collaborators && Array.isArray(data.collaborators) && data.collaborators.length > 0) {
          
          // Create the program immediately
          
          const [result] = await connection.execute(
            `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative, accepts_volunteers, manual_status_override)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orgId,
              data.title,
              data.description,
              data.category,
              'Upcoming',
              cloudinaryImageUrl,
              data.event_start_date || null,
              data.event_end_date || null,
              finalSlug,
              true, // Approved by superadmin
              true, // Collaborative - will be updated based on collaborator responses
              data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
              false // New approved programs start with automatic status (no manual override)
            ]
          );
          
          const programId = result.insertId;
          
          // Update existing collaboration requests to link to the new program
          const [updateResult] = await connection.execute(`
            UPDATE program_collaborations 
            SET program_id = ?, status = 'pending', program_title = ?
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
          
          // Note: Collaborators should only receive the original collaboration request notification
          // when the program is first submitted, not when it's approved by superadmin
          // The collaboration request notifications are handled in submissionController.js
          
        } else {
          // For non-collaborative programs, create the program immediately
          
          const [result] = await connection.execute(
            `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative, accepts_volunteers, manual_status_override)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
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
              false, // Not collaborative
              data.accepts_volunteers !== undefined ? data.accepts_volunteers : true,
              false // New approved programs start with automatic status (no manual override)
            ]
          );
          
          const programId = result.insertId;
          
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
            
            if (imageData && imageData.startsWith('data:image/')) {
              try {
                // Convert base64 to buffer
                const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                // Create a file-like object for Cloudinary upload
                const file = {
                  buffer: buffer,
                  originalname: `additional-${i}.jpg`,
                  mimetype: imageData.match(/data:image\/(\w+);/)[1],
                  size: buffer.length
                };
                
                // Upload to Cloudinary
                const uploadResult = await uploadSingleToCloudinary(
                  file, 
                  CLOUDINARY_FOLDERS.PROGRAMS.ADDITIONAL,
                  { prefix: 'prog_add_' }
                );
                
                // Store Cloudinary URL in database
                await connection.execute(
                  `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                  [programId, uploadResult.url, i]
                );
                
              } catch (uploadError) {
                logError(`Cloudinary upload failed for additional image ${i}`, uploadError, { context: 'approval_controller', imageIndex: i });
                // Continue with base64 as fallback
                await connection.execute(
                  `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                  [programId, imageData, i]
                );
              }
            } else {
              // If it's not base64, store as is (might already be a Cloudinary URL)
              await connection.execute(
                `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                [programId, imageData, i]
              );
            }
          }
        }

        // Note: For collaborative programs, they are set to pending_collaboration status
        // and will only be approved by superadmin after collaborators accept
        // Collaborators are notified individually when collaboration requests are created
        
      } catch (insertError) {
        throw insertError;
      }
    }

    // Update submission status to approved
    await connection.execute(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id]);
    
    // Create dynamic notification message based on section and data
    let notificationMessage = `Your submission for ${section} has been approved by SuperAdmin`;
    
    // Add specific details for programs
    if (section === 'programs' && data.title) {
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
    // Add specific details for organization
    else if (section === 'organization' && data.orgName) {
      notificationMessage = `Your organization "${data.orgName}" has been approved by SuperAdmin`;
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
      await connection.rollback();
    }
    logError(`Error approving submission ${id}`, err, { context: 'approval_controller', submissionId: id });
    res.status(500).json({ success: false, message: 'Failed to apply submission', error: err.message });
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
    const [rows] = await db.execute('SELECT * FROM submissions WHERE id = ? AND status = "pending"', [id]);
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
        const data = JSON.parse(submission.proposed_data);
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

    // Update submission status to rejected
    await db.execute(
      'UPDATE submissions SET status = "rejected", rejection_reason = ? WHERE id = ?',
      [rejection_comment || 'No reason provided', id]
    );

    // Create dynamic notification message based on section and data
    let notificationMessage = `Your submission for ${submission.section} has been declined by SuperAdmin`;
    
    // Parse the proposed data to get specific details
    try {
      const data = JSON.parse(submission.proposed_data);
      
      // Add specific details for programs
      if (submission.section === 'programs' && data.title) {
        notificationMessage = `Your program "${data.title}" has been declined by SuperAdmin`;
      }
      // Add specific details for organization
      else if (submission.section === 'organization' && data.orgName) {
        notificationMessage = `Your organization "${data.orgName}" has been declined by SuperAdmin`;
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
        const [rows] = await connection.execute('SELECT * FROM submissions WHERE id = ?', [id]);
        
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

        const data = JSON.parse(submission.proposed_data);
        const section = submission.section;
        const orgId = submission.organization_id;

        // Apply changes based on section - same logic as individual approveSubmission
        if (section === 'organization') {
          // Update organizations table with all organization data including org/orgName
          await connection.execute(
            `UPDATE organizations SET org = ?, orgName = ?, logo = ?, facebook = ?, description = ? WHERE id = ?`,
            [data.org, data.orgName, data.logo, data.facebook, data.description, orgId]
          );
        }

        if (section === 'advocacy') {
          const [existingAdvocacy] = await connection.execute(
            'SELECT id FROM advocacies WHERE organization_id = ?',
            [orgId]
          );
          
          const advocacyData = typeof data === 'string' ? data.trim() : JSON.stringify(data).trim();
          
          if (existingAdvocacy.length > 0) {
            await connection.execute(
              'UPDATE advocacies SET advocacy = ? WHERE organization_id = ?',
              [advocacyData, orgId]
            );
          } else {
            await connection.execute(
              'INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)',
              [orgId, advocacyData]
            );
          }
        }

        if (section === 'competency') {
          const [existingCompetency] = await connection.execute(
            'SELECT id FROM competencies WHERE organization_id = ?',
            [orgId]
          );
          
          const competencyData = typeof data === 'string' ? data.trim() : JSON.stringify(data).trim();
          
          if (existingCompetency.length > 0) {
            await connection.execute(
              'UPDATE competencies SET competency = ? WHERE organization_id = ?',
              [competencyData, orgId]
            );
          } else {
            await connection.execute(
              'INSERT INTO competencies (organization_id, competency) VALUES (?, ?)',
              [orgId, competencyData]
            );
          }
        }

        if (section === 'org_heads') {
          await connection.execute(`DELETE FROM organization_heads WHERE organization_id = ?`, [orgId]);
          for (let head of data) {
            // Handle head photo upload to Cloudinary
            let cloudinaryPhotoUrl = head.photo;
            if (head.photo && head.photo.startsWith('data:image/')) {
              try {
                const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
                const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
                
                // Convert base64 to buffer
                const base64Data = head.photo.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                // Create a file-like object for Cloudinary upload
                const file = {
                  buffer: buffer,
                  originalname: `org-head-${Date.now()}.jpg`,
                  mimetype: head.photo.match(/data:image\/(\w+);/)[0].replace('data:', '').replace(';', ''),
                  size: buffer.length
                };
                
                // Upload to Cloudinary
                const uploadResult = await uploadSingleToCloudinary(
                  file, 
                  CLOUDINARY_FOLDERS.ORGANIZATIONS.HEADS,
                  { prefix: 'org_head_' }
                );
                
                cloudinaryPhotoUrl = uploadResult.url;
              } catch (uploadError) {
                // Continue with base64 as fallback
              }
            }
            
            await connection.execute(
              `INSERT INTO organization_heads (organization_id, head_name, role, facebook, email, photo)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [orgId, head.name, head.position, head.facebook, head.email, cloudinaryPhotoUrl]
            );
          }
        }

        if (section === 'programs') {
          // Validate required program data
          if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
            throw new Error('Program title is required and must be a non-empty string');
          }
          if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
            throw new Error('Program description is required and must be a non-empty string');
          }
          if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
            throw new Error('Program category is required and must be a non-empty string');
          }
          
          // Generate slug from title
          const slug = data.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim('-'); // Remove leading/trailing hyphens
          
          // Ensure uniqueness by appending counter if needed
          let finalSlug = slug;
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

          const [result] = await connection.execute(
            `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative, accepts_volunteers, manual_status_override)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
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
            ]
          );
          
          const programId = result.insertId;
          
          // Handle collaboration invitations if provided
          if (data.collaborators && Array.isArray(data.collaborators) && data.collaborators.length > 0) {
            // First, try to update existing collaboration requests from submission
            const [updateResult] = await connection.execute(`
              UPDATE program_collaborations 
              SET program_id = ?, status = 'pending', program_title = ?
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
              
              if (imageData && imageData.startsWith('data:image/')) {
                try {
                  // Convert base64 to buffer
                  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
                  const buffer = Buffer.from(base64Data, 'base64');
                  
                  // Create a file-like object for Cloudinary upload
                  const file = {
                    buffer: buffer,
                    originalname: `additional-${i}.jpg`,
                    mimetype: imageData.match(/data:image\/(\w+);/)[1],
                    size: buffer.length
                  };
                  
                  // Upload to Cloudinary
                  const uploadResult = await uploadSingleToCloudinary(
                    file, 
                    CLOUDINARY_FOLDERS.PROGRAMS.ADDITIONAL,
                    { prefix: 'prog_add_' }
                  );
                  
                  // Store Cloudinary URL in database
                  await connection.execute(
                    `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                    [programId, uploadResult.url, i]
                  );
                  
                } catch (uploadError) {
                  // Continue with base64 as fallback
                  await connection.execute(
                    `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                    [programId, imageData, i]
                  );
                }
              } else {
                // If it's not base64, store as is (might already be a Cloudinary URL)
                await connection.execute(
                  `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                  [programId, imageData, i]
                );
              }
            }
          }
        }

        // Note: For collaborative programs, they are set to pending_collaboration status
        // and will only be approved by superadmin after collaborators accept
        // Collaborators are notified individually when collaboration requests are created

    if (section === 'highlights') {
      const action = data.action;
      
      if (action === 'create') {
        // For new highlights, update the status to approved
        await connection.execute(
          'UPDATE admin_highlights SET status = ? WHERE id = ?',
          ['approved', data.highlight_id]
        );
      } else if (action === 'update') {
        // For updates, the highlight is already updated, just change status to approved
        await connection.execute(
          'UPDATE admin_highlights SET status = ? WHERE id = ?',
          ['approved', data.highlight_id]
        );
      } else if (action === 'delete') {
        // For deletions, the highlight is already deleted, no additional action needed
        // The submission record will show the deletion was approved
      }
    }

        // Update submission status
        await connection.execute(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id]);

        // Create individual notification for this submission
        let notificationMessage = `Your submission for ${section} has been approved by SuperAdmin`;
        
        // Add specific details for programs
        if (section === 'programs' && data.title) {
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
        // Add specific details for organization
        else if (section === 'organization' && data.orgName) {
          notificationMessage = `Your organization "${data.orgName}" has been approved by SuperAdmin`;
        }
        // Add specific details for highlights
        else if (section === 'highlights' && data.title) {
          notificationMessage = `Your highlight "${data.title}" has been approved by SuperAdmin`;
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
        const [rows] = await db.execute('SELECT * FROM submissions WHERE id = ?', [id]);
        
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
            const data = JSON.parse(submission.proposed_data);
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

        // Update submission status to rejected
        await db.execute(
          'UPDATE submissions SET status = ?, rejection_reason = ? WHERE id = ?',
          ['rejected', rejection_comment || '', id]
        );

        // Create individual notification for this submission
        let notificationMessage = `Your submission for ${submission.section} has been declined by SuperAdmin`;
        
        // Parse the proposed data to get specific details
        try {
          const data = JSON.parse(submission.proposed_data);
          
          // Add specific details for programs
          if (submission.section === 'programs' && data.title) {
            notificationMessage = `Your program "${data.title}" has been declined by SuperAdmin`;
          }
          // Add specific details for organization
          else if (submission.section === 'organization' && data.orgName) {
            notificationMessage = `Your organization "${data.orgName}" has been declined by SuperAdmin`;
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
    const [result] = await db.execute('DELETE FROM submissions WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found or already deleted'
      });
    }

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
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

    for (const id of ids) {
      try {
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
      }
    }

    res.json({
      success: true,
      message: `Bulk deletion completed: ${successCount} deleted, ${errorCount} failed`,
      details: {
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
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
//db table: submissions
import db from '../../database.js';
import NotificationController from '../../admin/controllers/notificationController.js';
import { logSuperadminAction } from '../../utils/audit.js';

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

  try {
    console.log(`🔍 Starting approval process for submission ID: ${id}`);
    
    const [rows] = await db.execute('SELECT * FROM submissions WHERE id = ?', [id]);
    if (rows.length === 0) {
      console.log(`❌ Submission not found: ${id}`);
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = rows[0];
    console.log(`📋 Processing submission: ${submission.section} for org ${submission.organization_id}`);
    console.log(`📋 Submission data:`, {
      id: submission.id,
      section: submission.section,
      organization_id: submission.organization_id,
      submitted_by: submission.submitted_by,
      status: submission.status,
      proposed_data_length: submission.proposed_data?.length || 0
    });
    
    // Validate and parse the proposed data
    let data;
    try {
      data = JSON.parse(submission.proposed_data);
    } catch (parseError) {
      console.error(`❌ Failed to parse proposed_data for submission ${id}:`, parseError);
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
    
    console.log(`📊 Section: ${section}, Org ID: ${orgId}`);
    console.log(`📊 Parsed data keys:`, Object.keys(data));

    // Apply changes based on section
    if (section === 'organization') {
      // Update organizations table with all organization data including org/orgName
      await db.execute(
        `UPDATE organizations SET org = ?, orgName = ?, logo = ?, facebook = ?, description = ? WHERE id = ?`,
        [data.org, data.orgName, data.logo, data.facebook, data.description, orgId]
      );
    }

    if (section === 'advocacy') {
      // Check if advocacy record exists
      const [existingAdvocacy] = await db.execute(
        'SELECT id FROM advocacies WHERE organization_id = ?',
        [orgId]
      );
      
      // For advocacy, data is already a string from the parsed JSON
      const advocacyData = typeof data === 'string' ? data.trim() : JSON.stringify(data).trim();
      
      if (existingAdvocacy.length > 0) {
        // Update existing record
        await db.execute(
          'UPDATE advocacies SET advocacy = ? WHERE organization_id = ?',
          [advocacyData, orgId]
        );
      } else {
        // Insert new record
        await db.execute(
          'INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)',
          [orgId, advocacyData]
        );
      }
    }

    if (section === 'competency') {
      // Check if competency record exists
      const [existingCompetency] = await db.execute(
        'SELECT id FROM competencies WHERE organization_id = ?',
        [orgId]
      );
      
      // For competency, data is already a string from the parsed JSON
      const competencyData = typeof data === 'string' ? data.trim() : JSON.stringify(data).trim();
      
      if (existingCompetency.length > 0) {
        // Update existing record
        await db.execute(
          'UPDATE competencies SET competency = ? WHERE organization_id = ?',
          [competencyData, orgId]
        );
      } else {
        // Insert new record
        await db.execute(
          'INSERT INTO competencies (organization_id, competency) VALUES (?, ?)',
          [orgId, competencyData]
        );
      }
    }

    if (section === 'org_heads') {
      await db.execute(`DELETE FROM organization_heads WHERE organization_id = ?`, [orgId]);
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
        
        await db.execute(
          `INSERT INTO organization_heads (organization_id, head_name, role, facebook, email, photo)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orgId, head.name, head.position, head.facebook, head.email, cloudinaryPhotoUrl]
        );
      }
    }

    if (section === 'programs') {
      console.log(`🎯 Processing programs section for submission ${id}`);
      
      // Validate required program data
      if (!data.title) {
        throw new Error('Program title is required');
      }
      if (!data.description) {
        throw new Error('Program description is required');
      }
      
      // For collaborative programs, ensure they go through the proper workflow
      if (data.collaborators && data.collaborators.length > 0) {
        console.log(`🤝 Collaborative program detected - will be set to pending_collaboration status`);
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
          const [existingSlug] = await db.execute(
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
        if (data.image && data.image.startsWith('data:image/')) {
          try {
            console.log(`📸 Uploading main image to Cloudinary for program: ${data.title}`);
            const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
            const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
            
            // Convert base64 to buffer
            const base64Data = data.image.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Create a file-like object for Cloudinary upload
            const file = {
              buffer: buffer,
              originalname: `program-${Date.now()}.jpg`,
              mimetype: data.image.match(/data:image\/(\w+);/)[0].replace('data:', '').replace(';', ''),
              size: buffer.length
            };
            
            // Upload to Cloudinary
            const uploadResult = await uploadSingleToCloudinary(
              file, 
              CLOUDINARY_FOLDERS.PROGRAMS.MAIN,
              { prefix: 'prog_main_' }
            );
            
            cloudinaryImageUrl = uploadResult.url;
            console.log(`✅ Main image uploaded successfully: ${cloudinaryImageUrl}`);
          } catch (uploadError) {
            console.error('❌ Error uploading main image to Cloudinary:', uploadError);
            // Continue with base64 as fallback
            console.log(`⚠️ Using base64 image as fallback for program: ${data.title}`);
          }
        }

        // Insert new program into programs_projects table
        // For collaborative programs, set status to pending_collaboration and is_approved to false
        // The program will be approved by superadmin only after collaborators accept
        console.log(`💾 Inserting program into database: ${data.title}`);
        const [result] = await db.execute(
          `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orgId,
            data.title,
            data.description,
            data.category,
            data.collaborators && data.collaborators.length > 0 ? 'pending_collaboration' : 'pending', // Set status based on collaborators
            cloudinaryImageUrl, // Use Cloudinary URL instead of base64
            data.event_start_date || null,
            data.event_end_date || null,
            finalSlug,
            data.collaborators && data.collaborators.length > 0 ? false : true, // Only auto-approve if no collaborators
            data.collaborators && data.collaborators.length > 0
          ]
        );
        console.log(`✅ Program inserted successfully with ID: ${result.insertId}`);
        
        const programId = result.insertId;
        
        // Handle collaboration invitations if provided
        if (data.collaborators && Array.isArray(data.collaborators) && data.collaborators.length > 0) {
          console.log(`🤝 Processing ${data.collaborators.length} collaboration invitations`);
          // Extract collaborator IDs (handle both object format and ID format)
          const collaboratorIds = data.collaborators.map(collab => {
            // If collaborator is an object with id property, extract the id
            if (typeof collab === 'object' && collab.id) {
              return collab.id;
            }
            // If collaborator is already just an ID, use it directly
            return collab;
          }).filter(id => id && id !== submission.submitted_by);
          
          console.log(`🤝 Valid collaborator IDs: ${collaboratorIds.join(', ')}`);
          
          for (const collaboratorId of collaboratorIds) {
              try {
                await db.execute(`
                  INSERT INTO program_collaborations (program_id, collaborator_admin_id, invited_by_admin_id, status)
                  VALUES (?, ?, ?, 'pending')
                `, [programId, collaboratorId, submission.submitted_by]);
                
                // Notify collaborator about the collaboration request
                try {
                  const NotificationController = (await import('../../admin/controllers/notificationController.js')).default;
                  await NotificationController.createNotification({
                    admin_id: collaboratorId,
                    title: 'New Collaboration Request',
                    message: `You have received a collaboration request for "${data.title}". Please review and respond.`,
                    type: 'collaboration_request',
                    submission_id: programId
                  });
                } catch (notificationError) {
                  console.error('Failed to send collaboration request notification:', notificationError);
                  // Don't fail the main operation if notification fails
                }
              } catch (collabError) {
                console.error('Failed to add collaborator during approval:', collabError);
              }
          }
        }
        
        // If multiple dates are provided, insert them into program_event_dates table
        if (data.multiple_dates && Array.isArray(data.multiple_dates) && data.multiple_dates.length > 0) {
          
          for (const date of data.multiple_dates) {
            await db.execute(
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
                await db.execute(
                  `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                  [programId, uploadResult.url, i]
                );
                
              } catch (uploadError) {
                // Continue with base64 as fallback
                await db.execute(
                  `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                  [programId, imageData, i]
                );
              }
            } else {
              // If it's not base64, store as is (might already be a Cloudinary URL)
              await db.execute(
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
        console.error(`❌ Error in programs section processing:`, insertError);
        throw insertError;
      }
    }


    await db.execute(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id]);
    
    // Create dynamic notification message based on section and data
    let notificationMessage = `Your submission for ${section} has been approved by SuperAdmin`;
    
    // Add specific details for programs
    if (section === 'programs' && data.title) {
      if (data.collaborators && data.collaborators.length > 0) {
        notificationMessage = `Your collaborative program "${data.title}" has been submitted and collaboration requests have been sent to the invited organizations. The program will be sent to the superadmin for final approval only after collaborators accept the requests.`;
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
    console.log(`📧 Creating notification for admin ${submission.submitted_by}`);
    try {
      const notificationResult = await NotificationController.createNotification({
        admin_id: submission.submitted_by,
        type: 'approval',
        title: 'Submission Approved',
        message: notificationMessage,
        section: section,
        related_id: id
      });
      console.log(`📧 Notification result:`, notificationResult);

      if (!notificationResult.success) {
        console.error('Failed to create notification:', notificationResult.error);
        // Don't fail the main operation if notification fails
      }
    } catch (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    // Note: Collaborator notifications are handled within the section-specific blocks

    // Log superadmin action
    try {
      await logSuperadminAction(req.superadmin?.id, 'approve_submission', `Approved submission ${id} (${section}) for org ${orgId}`, req);
    } catch (auditError) {
      console.error('❌ Error logging superadmin action:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    console.log(`✅ Successfully approved submission ${id}`);
    res.json({ success: true, message: 'Submission approved and applied.' });
  } catch (err) {
    console.error(`❌ Error approving submission ${id}:`, err);
    res.status(500).json({ success: false, message: 'Failed to apply submission', error: err.message });
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
      console.error('Failed to create notification:', notificationResult.error);
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

        const data = JSON.parse(submission.proposed_data);
        const section = submission.section;
        const orgId = submission.organization_id;

        // Apply changes based on section - same logic as individual approveSubmission
        if (section === 'organization') {
          // Update organizations table with all organization data including org/orgName
          await db.execute(
            `UPDATE organizations SET org = ?, orgName = ?, logo = ?, facebook = ?, description = ? WHERE id = ?`,
            [data.org, data.orgName, data.logo, data.facebook, data.description, orgId]
          );
        }

        if (section === 'advocacy') {
          const [existingAdvocacy] = await db.execute(
            'SELECT id FROM advocacies WHERE organization_id = ?',
            [orgId]
          );
          
          const advocacyData = typeof data === 'string' ? data.trim() : JSON.stringify(data).trim();
          
          if (existingAdvocacy.length > 0) {
            await db.execute(
              'UPDATE advocacies SET advocacy = ? WHERE organization_id = ?',
              [advocacyData, orgId]
            );
          } else {
            await db.execute(
              'INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)',
              [orgId, advocacyData]
            );
          }
        }

        if (section === 'competency') {
          const [existingCompetency] = await db.execute(
            'SELECT id FROM competencies WHERE organization_id = ?',
            [orgId]
          );
          
          const competencyData = typeof data === 'string' ? data.trim() : JSON.stringify(data).trim();
          
          if (existingCompetency.length > 0) {
            await db.execute(
              'UPDATE competencies SET competency = ? WHERE organization_id = ?',
              [competencyData, orgId]
            );
          } else {
            await db.execute(
              'INSERT INTO competencies (organization_id, competency) VALUES (?, ?)',
              [orgId, competencyData]
            );
          }
        }

        if (section === 'org_heads') {
          await db.execute(`DELETE FROM organization_heads WHERE organization_id = ?`, [orgId]);
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
                console.error('❌ Error uploading organization head photo to Cloudinary:', uploadError);
                // Continue with base64 as fallback
              }
            }
            
            await db.execute(
              `INSERT INTO organization_heads (organization_id, head_name, role, facebook, email, photo)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [orgId, head.name, head.position, head.facebook, head.email, cloudinaryPhotoUrl]
            );
          }
        }

        if (section === 'programs') {
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
            const [existingSlug] = await db.execute(
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
          if (data.image && data.image.startsWith('data:image/')) {
            try {
              const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
              const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
              
              // Convert base64 to buffer
              const base64Data = data.image.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              
              // Create a file-like object for Cloudinary upload
              const file = {
                buffer: buffer,
                originalname: `program-${Date.now()}.jpg`,
                mimetype: data.image.match(/data:image\/(\w+);/)[0].replace('data:', '').replace(';', ''),
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
              console.error('❌ Error uploading main program image to Cloudinary:', uploadError);
              // Continue with base64 as fallback
            }
          }

          const [result] = await db.execute(
            `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date, slug, is_approved, is_collaborative)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orgId,
              data.title,
              data.description,
              data.category,
              data.collaborators && data.collaborators.length > 0 ? 'pending_collaboration' : 'pending', // Set status based on collaborators
              cloudinaryImageUrl, // Use Cloudinary URL instead of base64
              data.event_start_date || null,
              data.event_end_date || null,
              finalSlug,
              data.collaborators && data.collaborators.length > 0 ? false : true, // Only auto-approve if no collaborators
              data.collaborators && data.collaborators.length > 0
            ]
          );
          
          const programId = result.insertId;
          
          // Handle collaboration invitations if provided
          if (data.collaborators && Array.isArray(data.collaborators) && data.collaborators.length > 0) {
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
                await db.execute(`
                  INSERT INTO program_collaborations (program_id, collaborator_admin_id, invited_by_admin_id, status)
                  VALUES (?, ?, ?, 'pending')
                `, [programId, collaboratorId, submission.submitted_by]);
                
                // Notify collaborator about the collaboration request
                try {
                  const NotificationController = (await import('../../admin/controllers/notificationController.js')).default;
                  await NotificationController.createNotification({
                    admin_id: collaboratorId,
                    title: 'New Collaboration Request',
                    message: `You have received a collaboration request for "${data.title}". Please review and respond.`,
                    type: 'collaboration_request',
                    submission_id: programId
                  });
                } catch (notificationError) {
                  console.error('Failed to send collaboration request notification:', notificationError);
                  // Don't fail the main operation if notification fails
                }
              } catch (collabError) {
                console.error('Failed to add collaborator during bulk approval:', collabError);
              }
            }
          }
          
          if (data.multiple_dates && Array.isArray(data.multiple_dates) && data.multiple_dates.length > 0) {
            for (const date of data.multiple_dates) {
              await db.execute(
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
                  await db.execute(
                    `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                    [programId, uploadResult.url, i]
                  );
                  
                } catch (uploadError) {
                  console.error(`❌ Error uploading additional image ${i + 1} to Cloudinary:`, uploadError);
                  // Continue with base64 as fallback
                  await db.execute(
                    `INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)`,
                    [programId, imageData, i]
                  );
                }
              } else {
                // If it's not base64, store as is (might already be a Cloudinary URL)
                await db.execute(
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
        await db.execute(
          'UPDATE admin_highlights SET status = ? WHERE id = ?',
          ['approved', data.highlight_id]
        );
      } else if (action === 'update') {
        // For updates, the highlight is already updated, just change status to approved
        await db.execute(
          'UPDATE admin_highlights SET status = ? WHERE id = ?',
          ['approved', data.highlight_id]
        );
      } else if (action === 'delete') {
        // For deletions, the highlight is already deleted, no additional action needed
        // The submission record will show the deletion was approved
      }
    }

        // Update submission status
        await db.execute(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id]);

        // Create individual notification for this submission
        let notificationMessage = `Your submission for ${section} has been approved by SuperAdmin`;
        
        // Add specific details for programs
        if (section === 'programs' && data.title) {
          if (data.collaborators && data.collaborators.length > 0) {
            notificationMessage = `Your collaborative program "${data.title}" has been submitted and collaboration requests have been sent to the invited organizations. The program will be sent to the superadmin for final approval only after collaborators accept the requests.`;
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
          console.error('Failed to create notification:', notificationResult.error);
          // Don't fail the main operation if notification fails
        }


        successCount++;
      } catch (error) {
        errors.push(`Failed to approve submission ${id}: ${error.message}`);
        errorCount++;
      }
    }

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
    res.status(500).json({
      success: false,
      message: 'Failed to bulk approve submissions',
      error: error.message
    });
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
          console.error('Failed to create notification:', notificationResult.error);
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

// Get pending collaborative programs that need superadmin approval
export const getPendingCollaborativePrograms = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        pp.id,
        pp.title,
        pp.description,
        pp.category,
        pp.status,
        pp.image,
        pp.event_start_date,
        pp.event_end_date,
        pp.created_at,
        pp.updated_at,
        pp.organization_id,
        pp.is_collaborative,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as orgLogo,
        o.org_color as organization_color,
        COUNT(pc.id) as collaboration_count
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      LEFT JOIN program_collaborations pc ON pp.id = pc.program_id AND pc.status = 'accepted'
      WHERE pp.status = 'pending_superadmin_approval' AND pp.is_collaborative = 1
      GROUP BY pp.id
      ORDER BY pp.created_at DESC
    `);

    // Get collaboration details for each program
    const programsWithCollaborations = await Promise.all(rows.map(async (program) => {
      const [collaborations] = await db.execute(`
        SELECT 
          pc.id,
          pc.status,
          pc.responded_at,
          inviter.email as inviter_email,
          inviter_org.orgName as inviter_org_name,
          invitee.email as invitee_email,
          invitee_org.orgName as invitee_org_name
        FROM program_collaborations pc
        LEFT JOIN admins inviter ON pc.invited_by_admin_id = inviter.id
        LEFT JOIN organizations inviter_org ON inviter.organization_id = inviter_org.id
        LEFT JOIN admins invitee ON pc.collaborator_admin_id = invitee.id
        LEFT JOIN organizations invitee_org ON invitee.organization_id = invitee_org.id
        WHERE pc.program_id = ? AND pc.status = 'accepted'
      `, [program.id]);

      return {
        ...program,
        collaborations: collaborations
      };
    }));

    res.json({
      success: true,
      data: programsWithCollaborations
    });
  } catch (error) {
    console.error('Error fetching pending collaborative programs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending collaborative programs',
      error: error.message
    });
  }
};

// Approve collaborative program
export const approveCollaborativeProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const currentSuperadminId = req.superadmin?.id;

    // Get program details and verify it has accepted collaborations
    const [programRows] = await db.execute(`
      SELECT pp.id, pp.title, pp.status, pp.is_approved, pp.is_collaborative,
             COUNT(pc.id) as accepted_collaborations
      FROM programs_projects pp
      LEFT JOIN program_collaborations pc ON pp.id = pc.program_id AND pc.status = 'accepted'
      WHERE pp.id = ? AND pp.status = 'pending_superadmin_approval' AND pp.is_collaborative = 1
      GROUP BY pp.id
    `, [programId]);

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaborative program not found or already processed'
      });
    }

    const program = programRows[0];
    
    // Ensure the program has at least one accepted collaboration
    if (program.accepted_collaborations === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve collaborative program without accepted collaborations'
      });
    }

    // Update program status to approved
    await db.execute(`
      UPDATE programs_projects 
      SET status = 'approved', is_approved = 1, updated_at = NOW()
      WHERE id = ?
    `, [programId]);

    // Notify all collaborators about the approval
    try {
      const [collaborators] = await db.execute(`
        SELECT 
          pc.collaborator_admin_id,
          pc.invited_by_admin_id,
          a.email as collaborator_email,
          inviter.email as inviter_email
        FROM program_collaborations pc
        LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
        LEFT JOIN admins inviter ON pc.invited_by_admin_id = inviter.id
        WHERE pc.program_id = ? AND pc.status = 'accepted'
      `, [programId]);

      const NotificationController = (await import('../../admin/controllers/notificationController.js')).default;
      
      // Notify all collaborators
      for (const collaborator of collaborators) {
        await NotificationController.createNotification({
          admin_id: collaborator.collaborator_admin_id,
          title: 'Collaborative Program Approved',
          message: `The collaborative program "${program.title}" has been approved by the superadmin and is now live.`,
          type: 'program_approval',
          submission_id: programId
        });
      }

      // Notify the creator
      if (collaborators.length > 0) {
        await NotificationController.createNotification({
          admin_id: collaborators[0].invited_by_admin_id,
          title: 'Collaborative Program Approved',
          message: `Your collaborative program "${program.title}" has been approved by the superadmin and is now live.`,
          type: 'program_approval',
          submission_id: programId
        });
      }
    } catch (notificationError) {
      console.error('Failed to send approval notifications:', notificationError);
      // Don't fail the main operation if notification fails
    }

    // Log the approval action
    await logSuperadminAction(
      currentSuperadminId,
      'approve_collaborative_program',
      `Approved collaborative program: ${program.title}`,
      { program_id: programId, program_title: program.title }
    );

    res.json({
      success: true,
      message: 'Collaborative program approved successfully'
    });
  } catch (error) {
    console.error('Error approving collaborative program:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve collaborative program',
      error: error.message
    });
  }
};

// Reject collaborative program
export const rejectCollaborativeProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const currentSuperadminId = req.superadmin?.id;

    // Get program details and verify it has accepted collaborations
    const [programRows] = await db.execute(`
      SELECT pp.id, pp.title, pp.status, pp.is_approved, pp.is_collaborative,
             COUNT(pc.id) as accepted_collaborations
      FROM programs_projects pp
      LEFT JOIN program_collaborations pc ON pp.id = pc.program_id AND pc.status = 'accepted'
      WHERE pp.id = ? AND pp.status = 'pending_superadmin_approval' AND pp.is_collaborative = 1
      GROUP BY pp.id
    `, [programId]);

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaborative program not found or already processed'
      });
    }

    const program = programRows[0];
    
    // Ensure the program has at least one accepted collaboration
    if (program.accepted_collaborations === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process collaborative program without accepted collaborations'
      });
    }

    // Update program status to declined
    await db.execute(`
      UPDATE programs_projects 
      SET status = 'declined', is_approved = 0, updated_at = NOW()
      WHERE id = ?
    `, [programId]);

    // Notify all collaborators about the rejection
    try {
      const [collaborators] = await db.execute(`
        SELECT 
          pc.collaborator_admin_id,
          pc.invited_by_admin_id,
          a.email as collaborator_email,
          inviter.email as inviter_email
        FROM program_collaborations pc
        LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
        LEFT JOIN admins inviter ON pc.invited_by_admin_id = inviter.id
        WHERE pc.program_id = ? AND pc.status = 'accepted'
      `, [programId]);

      const NotificationController = (await import('../../admin/controllers/notificationController.js')).default;
      
      // Notify all collaborators
      for (const collaborator of collaborators) {
        await NotificationController.createNotification({
          admin_id: collaborator.collaborator_admin_id,
          title: 'Collaborative Program Declined',
          message: `The collaborative program "${program.title}" has been declined by the superadmin.`,
          type: 'program_declined',
          submission_id: programId
        });
      }

      // Notify the creator
      if (collaborators.length > 0) {
        await NotificationController.createNotification({
          admin_id: collaborators[0].invited_by_admin_id,
          title: 'Collaborative Program Declined',
          message: `Your collaborative program "${program.title}" has been declined by the superadmin.`,
          type: 'program_declined',
          submission_id: programId
        });
      }
    } catch (notificationError) {
      console.error('Failed to send rejection notifications:', notificationError);
      // Don't fail the main operation if notification fails
    }

    // Log the rejection action
    await logSuperadminAction(
      currentSuperadminId,
      'reject_collaborative_program',
      `Rejected collaborative program: ${program.title}`,
      { program_id: programId, program_title: program.title }
    );

    res.json({
      success: true,
      message: 'Collaborative program rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting collaborative program:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject collaborative program',
      error: error.message
    });
  }
};
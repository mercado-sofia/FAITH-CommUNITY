// db table: programs_projects
import db from "../../database.js";
import path from 'path';
import fs from 'fs';
import { sendToSubscribers } from './subscribersController.js';
import { getOrganizationLogoUrl, getProgramImageUrl } from "../../utils/imageUrlUtils.js";

// ---------------- Helper: escape HTML ----------------
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Get programs for admin view (including collaboration data)
export const getAdminPrograms = async (req, res) => {
  try {
    // Handle both admin and superadmin tokens
    const currentAdminId = req.admin?.id || req.superadmin?.id;
    
    if (!currentAdminId) {
      return res.status(401).json({
        success: false,
        message: 'Admin ID not found in request'
      });
    }

    // Get programs where current admin is creator or collaborator
    // First, get the admin's organization
    const [adminRows] = await db.execute(`
      SELECT organization_id FROM admins WHERE id = ?
    `, [currentAdminId]);
    
    if (adminRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    const adminOrgId = adminRows[0].organization_id;
    
    // Get programs where admin is creator (from their organization) OR collaborator (from other organizations)
    // Exclude programs where admin has opted out (status = 'declined') or pending collaboration requests
    const [programRows] = await db.execute(`
      SELECT DISTINCT p.*, o.org as orgAcronym, o.orgName as orgName, o.logo as orgLogo
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.organization_id = ? 
         OR p.id IN (
           SELECT program_id FROM program_collaborations 
           WHERE collaborator_admin_id = ? AND status = 'accepted'
         )
      ORDER BY p.created_at DESC
    `, [adminOrgId, currentAdminId]);

    // Get collaboration data for each program
    const programsWithCollaboration = await Promise.all(programRows.map(async (program) => {
      // Get multiple dates
      let multipleDates = [];
      if (program.event_start_date && program.event_end_date) {
        if (program.event_start_date === program.event_end_date) {
          multipleDates = [program.event_start_date];
        }
      } else {
        const [dateRows] = await db.execute(
          'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
          [program.id]
        );
        multipleDates = dateRows.map(row => row.event_date);
      }

      // Get additional images
      const [imageRows] = await db.execute(
        'SELECT image_data FROM program_additional_images WHERE program_id = ? ORDER BY image_order ASC',
        [program.id]
      );
      const additionalImages = imageRows.map(row => row.image_data);

      // Get collaboration info for current admin
      const [collaborationRows] = await db.execute(`
        SELECT 
          pc.id as collaboration_id,
          pc.status as collaboration_status,
          a.email as collaborator_email,
          o.orgName as collaborator_org
        FROM program_collaborations pc
        LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
        LEFT JOIN organizations o ON a.organization_id = o.id
        WHERE pc.program_id = ? AND pc.collaborator_admin_id = ?
      `, [program.id, currentAdminId]);

      // Determine user's role in this program
      let userRole = 'creator';
      let collaborationStatus = null;
      
      if (collaborationRows.length > 0) {
        userRole = 'collaborator';
        collaborationStatus = collaborationRows[0].collaboration_status;
      }

      // Get all collaborators for this program (including all statuses for visibility)
      const [allCollaborators] = await db.execute(`
        SELECT 
          a.id,
          a.email,
          o.orgName as organization_name,
          o.org as organization_acronym,
          pc.status as collaboration_status
        FROM program_collaborations pc
        LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
        LEFT JOIN organizations o ON a.organization_id = o.id
        WHERE pc.program_id = ? AND pc.status IN ('accepted', 'pending', 'declined')
      `, [program.id]);

      let logoUrl;
      if (program.orgLogo) {
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      } else {
        logoUrl = `/logo/faith_community_logo.png`;
      }

      return {
        id: program.id,
        title: program.title,
        description: program.description,
        category: program.category,
        status: program.status || 'Upcoming',
        image: program.image,
        additional_images: additionalImages,
        event_start_date: program.event_start_date,
        event_end_date: program.event_end_date,
        multiple_dates: multipleDates,
        created_at: program.created_at,
        orgID: program.orgAcronym,
        orgName: program.orgName,
        orgLogo: logoUrl,
        slug: program.slug,
        is_approved: program.is_approved,
        is_collaborative: program.is_collaborative,
        accepts_volunteers: program.accepts_volunteers !== undefined ? program.accepts_volunteers : true,
        user_role: userRole,
        collaboration_status: collaborationStatus,
        collaboration_id: collaborationRows.length > 0 ? collaborationRows[0].collaboration_id : null,
        collaborators: allCollaborators
      };
    }));

    res.json({
      success: true,
      data: programsWithCollaboration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch programs",
      error: error.message,
    });
  }
};

// Get programs for a specific organization (for admin view)
export const getProgramsByOrg = async (req, res) => {
  const { orgId } = req.params;

  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    });
  }

  try {
    
    // First try to get organization by ID (numeric) from organizations table
    let [orgRows] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [orgId]
    );

    // If not found by ID, try to find by org acronym from organizations table
    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Organization not found: ${orgId}`,
      });
    }

    const organization = orgRows[0];

    // Get only approved programs from programs_projects table
    // Exclude programs that have pending collaboration requests (they should appear in Collaborations tab)
    const [approvedRows] = await db.execute(
      `SELECT p.*, 'approved' as source_type, o.org as orgAcronym, o.orgName as orgName, o.logo as orgLogo
       FROM programs_projects p
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE p.organization_id = ? 
       AND p.is_approved = TRUE
       AND p.id NOT IN (
         SELECT DISTINCT program_id 
         FROM program_collaborations 
         WHERE program_id IS NOT NULL 
         AND status = 'pending'
       )
       ORDER BY p.created_at DESC`,
      [organization.id]
    );

    // Get multiple dates and additional images for each program
    const programsWithDates = await Promise.all(approvedRows.map(async (program) => {
      let multipleDates = [];
      
      // If program has event_start_date and event_end_date, check if they're the same (single day)
      if (program.event_start_date && program.event_end_date) {
        if (program.event_start_date === program.event_end_date) {
          // Single day program
          multipleDates = [program.event_start_date];
        }
      } else {
        // Check for multiple dates in program_event_dates table
        const [dateRows] = await db.execute(
          'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
          [program.id]
        );
        multipleDates = dateRows.map(row => row.event_date);
      }

      // Get additional images for this program
      const [imageRows] = await db.execute(
        'SELECT image_data FROM program_additional_images WHERE program_id = ? ORDER BY image_order ASC',
        [program.id]
      );
      const additionalImages = imageRows.map(row => row.image_data);

      return {
        ...program,
        multiple_dates: multipleDates,
        additional_images: additionalImages
      };
    }));

    // Map approved programs with organization info
    const approvedPrograms = programsWithDates.map(program => {
      let logoUrl;
      if (program.orgLogo) {
        // If logo is stored as a filename, construct the proper URL
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        id: program.id,
        title: program.title,
        description: program.description,
        category: program.category,
        status: program.status || 'Upcoming',
        date: program.date || program.date_completed || program.date_created || program.created_at,
        image: program.image,
        additional_images: program.additional_images,
        event_start_date: program.event_start_date,
        event_end_date: program.event_end_date,
        multiple_dates: program.multiple_dates,
        created_at: program.created_at,
        orgID: program.orgAcronym || organization.org,
        orgName: program.orgName || organization.orgName,
        orgLogo: logoUrl,
        slug: program.slug,
        is_collaborative: program.is_collaborative,
        collaborators: program.collaborators
      };
    });

    res.json(approvedPrograms);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch programs",
      error: error.message,
    });
  }
};

// Get approved programs for public display
export const getApprovedPrograms = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.is_approved = TRUE
      ORDER BY p.created_at DESC
    `);

    // Get multiple dates, additional images, and collaboration data for each program
    const programsWithDates = await Promise.all(rows.map(async (program) => {
      let multipleDates = [];
      
      // If program has event_start_date and event_end_date, check if they're the same (single day)
      if (program.event_start_date && program.event_end_date) {
        if (program.event_start_date === program.event_end_date) {
          // Single day program
          multipleDates = [program.event_start_date];
        }
      } else {
        // Check for multiple dates in program_event_dates table
        const [dateRows] = await db.execute(
          'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
          [program.id]
        );
        multipleDates = dateRows.map(row => row.event_date);
      }

      // Get additional images for this program
      const [imageRows] = await db.execute(
        'SELECT image_data FROM program_additional_images WHERE program_id = ? ORDER BY image_order ASC',
        [program.id]
      );
      const additionalImages = imageRows.map(row => row.image_data);

      // Get collaboration data if program is collaborative
      let collaborators = [];
      if (program.is_collaborative) {
        const [collaborationRows] = await db.execute(`
          SELECT 
            o.orgName as organization_name,
            o.org as organization_acronym,
            o.logo as organization_logo
          FROM program_collaborations pc
          LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
          LEFT JOIN organizations o ON a.organization_id = o.id
          WHERE pc.program_id = ? AND pc.status = 'accepted'
          ORDER BY o.orgName ASC
        `, [program.id]);
        
        collaborators = collaborationRows.map(collab => ({
          organization_name: collab.organization_name,
          organization_acronym: collab.organization_acronym,
          organization_logo: collab.organization_logo ? getOrganizationLogoUrl(collab.organization_logo) : null
        }));
      }

      return {
        ...program,
        multiple_dates: multipleDates,
        additional_images: additionalImages,
        collaborators: collaborators
      };
    }));

    const programs = programsWithDates.map(program => {
      let logoUrl;
      if (program.orgLogo) {
        // If logo is stored as a filename, construct the proper URL
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        id: program.id,
        title: program.title,
        description: program.description,
        category: program.category,
        status: program.status,
        date: program.date || program.created_at,
        image: program.image,
        additional_images: program.additional_images,
        event_start_date: program.event_start_date,
        event_end_date: program.event_end_date,
        multiple_dates: program.multiple_dates,
        orgID: program.orgAcronym,
        orgName: program.orgName,
        orgLogo: logoUrl,
        created_at: program.created_at,
        slug: program.slug,
        is_collaborative: program.is_collaborative,
        collaborators: program.collaborators
      };
    });

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch approved programs",
      error: error.message,
    });
  }
};

// Get approved programs for a specific organization (public view)
export const getApprovedProgramsByOrg = async (req, res) => {
  const { orgId } = req.params;

  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    });
  }

  try {
    // First try to get organization by ID (numeric) from organizations table
    let [orgRows] = await db.execute(
      "SELECT id, org, orgName, logo FROM organizations WHERE id = ?",
      [orgId]
    );

    // If not found by ID, try to find by org acronym from organizations table
    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, org, orgName, logo FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Organization not found: ${orgId}`,
      });
    }

    const organization = orgRows[0];

    // Get approved programs for this organization
    const [rows] = await db.execute(`
      SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE p.organization_id = ? AND p.is_approved = TRUE
       ORDER BY p.created_at DESC
    `, [organization.id]);

    // Get multiple dates and additional images for each program
    const programsWithDates = await Promise.all(rows.map(async (program) => {
      let multipleDates = [];
      
      // If program has event_start_date and event_end_date, check if they're the same (single day)
      if (program.event_start_date && program.event_end_date) {
        if (program.event_start_date === program.event_end_date) {
          // Single day program
          multipleDates = [program.event_start_date];
        }
      } else {
        // Check for multiple dates in program_event_dates table
        const [dateRows] = await db.execute(
          'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
          [program.id]
        );
        multipleDates = dateRows.map(row => row.event_date);
      }

      // Get additional images for this program
      const [imageRows] = await db.execute(
        'SELECT image_data FROM program_additional_images WHERE program_id = ? ORDER BY image_order ASC',
        [program.id]
      );
      const additionalImages = imageRows.map(row => row.image_data);

      return {
        ...program,
        multiple_dates: multipleDates,
        additional_images: additionalImages
      };
    }));

    const programs = programsWithDates.map(program => {
      let logoUrl;
      if (program.orgLogo) {
        // If logo is stored as a filename, construct the proper URL
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        id: program.id,
        title: program.title,
        description: program.description,
        category: program.category,
        status: program.status,
        date: program.date_completed || program.date_created,
        image: program.image,
        additional_images: program.additional_images,
        event_start_date: program.event_start_date,
        event_end_date: program.event_end_date,
        multiple_dates: program.multiple_dates,
        orgID: program.orgAcronym,
        orgName: program.orgName,
        orgLogo: logoUrl,
        created_at: program.created_at,
        slug: program.slug,
        is_collaborative: program.is_collaborative,
        collaborators: program.collaborators
      };
    });

    res.json({
      success: true,
      data: programs,
      organization: {
        id: organization.id,
        name: organization.orgName,
        acronym: organization.org
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch organization programs",
      error: error.message,
    });
  }
};

// Delete a program submission (admin only)
export const deleteProgramSubmission = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Program ID is required",
    });
  }

  try {
    // Check if it's a submission ID or approved program ID
    if (id.startsWith('submission_')) {
      const submissionId = id.replace('submission_', '');
      
      // Delete from submissions table
      const [result] = await db.execute(
        'DELETE FROM submissions WHERE id = ? AND section = "programs" AND status = "pending"',
        [submissionId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Program submission not found or cannot be deleted",
        });
      }
    } else {
      // Delete from programs_projects table (approved programs)
      // The program_event_dates will be automatically deleted due to CASCADE
      const [result] = await db.execute(
        'DELETE FROM programs_projects WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Program not found",
        });
      }
    }

    res.json({
      success: true,
      message: "Program deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete program",
      error: error.message,
    });
  }
};

// Update an approved program (admin only)
export const updateProgram = async (req, res) => {
  const { id } = req.params;
  const { title, description, category, status, image, additionalImages, event_start_date, event_end_date, multiple_dates, collaborators, accepts_volunteers } = req.body;

  // Update program request received

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Program ID is required",
    });
  }

  if (!title || !description || !category) {
    return res.status(400).json({
      success: false,
      message: "Title, description, and category are required",
    });
  }

  try {
    // Check if program exists
    const [existingProgram] = await db.execute(
      'SELECT id, organization_id, image FROM programs_projects WHERE id = ?',
      [id]
    );

    if (existingProgram.length === 0) {
      // Program not found
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Program found
    let imagePath = existingProgram[0].image; // Keep existing image by default

    // Handle main image if provided (base64 or Cloudinary URL)
    if (image && image.startsWith('data:image/')) {
      // Convert base64 to buffer and upload to Cloudinary
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Create a temporary file object for Cloudinary upload
      const tempFile = {
        buffer: buffer,
        originalname: `program-${Date.now()}.${image.match(/data:image\/(\w+);/)[1]}`,
        mimetype: image.match(/data:image\/(\w+);/)[0].replace('data:', '').replace(';', ''),
        size: buffer.length
      };
      
      // Upload to Cloudinary
      const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
      const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
      
      const uploadResult = await uploadSingleToCloudinary(
        tempFile, 
        CLOUDINARY_FOLDERS.PROGRAMS.MAIN,
        { prefix: 'prog_main_' }
      );
      
      imagePath = uploadResult.public_id;
      // Main image uploaded to Cloudinary
    } else if (image === null) {
      // User wants to remove the image
      imagePath = null;
      // User requested to remove main image
    } else if (image === undefined) {
      // No change to image - keep existing
      // Keeping existing main image
    } else {
      // Keeping existing main image
    }
    // If image is null, keep the existing image (imagePath already set to existingProgram[0].image)

    // Updating program in database
    // Update the program
    const [result] = await db.execute(
      `UPDATE programs_projects 
       SET title = ?, description = ?, category = ?, status = ?, image = ?, event_start_date = ?, event_end_date = ?, accepts_volunteers = ?
       WHERE id = ?`,
      [title, description, category, status || 'active', imagePath, event_start_date || null, event_end_date || null, accepts_volunteers !== undefined ? accepts_volunteers : true, id]
    );

    if (result.affectedRows === 0) {
      // No rows affected during update
      return res.status(404).json({
        success: false,
        message: "Program not found or no changes made",
      });
    }

    // Program updated successfully

    // Handle multiple dates if provided
    if (multiple_dates && Array.isArray(multiple_dates)) {
      // Processing multiple dates
      // First, delete existing multiple dates for this program
      await db.execute('DELETE FROM program_event_dates WHERE program_id = ?', [id]);
      
      // Then insert new multiple dates
      if (multiple_dates.length > 0) {
        for (const date of multiple_dates) {
          await db.execute(
            'INSERT INTO program_event_dates (program_id, event_date) VALUES (?, ?)',
            [id, date]
          );
        }
      }
      // Multiple dates updated
    }

    // Handle additional images if provided
    if (additionalImages && Array.isArray(additionalImages)) {
      // Processing additional images
      // First, delete existing additional images for this program
      await db.execute('DELETE FROM program_additional_images WHERE program_id = ?', [id]);
      
      // Then insert new additional images
      if (additionalImages.length > 0) {
        const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
        const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');

        for (let i = 0; i < additionalImages.length; i++) {
          const imageData = additionalImages[i];
          
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
                'INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)',
                [id, uploadResult.url, i]
              );
            } catch (uploadError) {
              // Continue with other images even if one fails
            }
          }
        }
      }
      // Additional images updated
    }

    // Handle collaborators if provided
    if (collaborators !== undefined) {
      // Processing collaborators update
      // First, delete existing collaborators for this program
      await db.execute('DELETE FROM program_collaborations WHERE program_id = ?', [id]);
      
      // Then insert new collaborators if any
      if (collaborators && Array.isArray(collaborators) && collaborators.length > 0) {
        // Get the current admin ID from the request (assuming it's available in req.user)
        const currentAdminId = req.user?.id || req.user?.admin_id;
        
        if (!currentAdminId) {
          return res.status(400).json({
            success: false,
            message: "Admin ID is required for collaboration updates",
          });
        }
        
        for (const collaboratorId of collaborators) {
          if (collaboratorId && typeof collaboratorId === 'number') {
            await db.execute(
              'INSERT INTO program_collaborations (program_id, collaborator_admin_id, invited_by_admin_id, status, program_title) VALUES (?, ?, ?, ?, ?)',
              [id, collaboratorId, currentAdminId, 'pending', title]
            );
          }
        }
      }
      // Collaborators updated
    }

    // Program update completed successfully
    res.json({
      success: true,
      message: "Program updated successfully",
      data: {
        id: parseInt(id),
        title,
        description,
        category,
        status: status || 'active',
        image: imagePath,
        event_start_date,
        event_end_date,
        multiple_dates
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update program",
      error: error.message,
    });
  }
};

// Toggle featured status of a program (superadmin only)
export const toggleFeaturedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;

    // Check if program exists
    const [existingProgram] = await db.execute(
      'SELECT id, title FROM programs_projects WHERE id = ?',
      [id]
    );

    if (existingProgram.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    // Update featured status
    const [result] = await db.execute(
      'UPDATE programs_projects SET is_featured = ? WHERE id = ?',
      [isFeatured, id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update featured status'
      });
    }

    res.json({
      success: true,
      message: `Program ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: {
        id: id,
        isFeatured: isFeatured,
        title: existingProgram[0].title
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle featured status",
      error: error.message,
    });
  }
};

// Get single program by ID (for checking featured status)
export const getProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.execute(`
      SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo, o.org_color as orgColor
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }

    const program = rows[0];
    
    res.json({
      success: true,
      data: {
        id: program.id,
        title: program.title,
        description: program.description,
        category: program.category,
        status: program.status,
        image: program.image,
        event_start_date: program.event_start_date,
        event_end_date: program.event_end_date,
        is_featured: program.is_featured,
        orgAcronym: program.orgAcronym,
        orgName: program.orgName,
        orgColor: program.orgColor,
        created_at: program.created_at,
        slug: program.slug
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch program",
      error: error.message,
    });
  }
};

// Get all featured programs (for superadmin)
export const getAllFeaturedPrograms = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo, o.org_color as orgColor
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.is_featured = TRUE
      ORDER BY p.created_at DESC
    `);

    // Get multiple dates and additional images for each program
    const programsWithDates = await Promise.all(rows.map(async (program) => {
      let multipleDates = [];
      
      // If program has event_start_date and event_end_date, check if they're the same (single day)
      if (program.event_start_date && program.event_end_date) {
        if (program.event_start_date === program.event_end_date) {
          // Single day program
          multipleDates = [program.event_start_date];
        }
      } else {
        // Check for multiple dates in program_event_dates table
        const [dateRows] = await db.execute(
          'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
          [program.id]
        );
        multipleDates = dateRows.map(row => row.event_date);
      }

      // Get additional images for this program
      const [imageRows] = await db.execute(
        'SELECT image_data FROM program_additional_images WHERE program_id = ? ORDER BY image_order ASC',
        [program.id]
      );
      const additionalImages = imageRows.map(row => row.image_data);

      return {
        ...program,
        multiple_dates: multipleDates,
        additional_images: additionalImages
      };
    }));

    const programs = programsWithDates.map(program => {
      let logoUrl;
      if (program.orgLogo) {
        // If logo is stored as a filename, construct the proper URL
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        id: program.id,
        title: program.title,
        description: program.description,
        category: program.category,
        status: program.status,
        date: program.date || program.created_at,
        image: program.image,
        additional_images: program.additional_images,
        event_start_date: program.event_start_date,
        event_end_date: program.event_end_date,
        multiple_dates: program.multiple_dates,
        orgID: program.orgAcronym,
        orgName: program.orgName,
        orgAcronym: program.orgAcronym,
        orgColor: program.orgColor,
        orgLogo: logoUrl,
        created_at: program.created_at,
        slug: program.slug,
        is_collaborative: program.is_collaborative,
        collaborators: program.collaborators
      };
    });

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured programs",
      error: error.message,
    });
  }
};

// Get featured programs for public display
export const getFeaturedPrograms = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo, o.org_color as orgColor
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.is_featured = TRUE AND p.is_approved = TRUE
      ORDER BY p.created_at DESC
    `);

    // Get multiple dates, additional images, and collaboration data for each program
    const programsWithDates = await Promise.all(rows.map(async (program) => {
      let multipleDates = [];
      
      // If program has event_start_date and event_end_date, check if they're the same (single day)
      if (program.event_start_date && program.event_end_date) {
        if (program.event_start_date === program.event_end_date) {
          // Single day program
          multipleDates = [program.event_start_date];
        }
      } else {
        // Check for multiple dates in program_event_dates table
        const [dateRows] = await db.execute(
          'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
          [program.id]
        );
        multipleDates = dateRows.map(row => row.event_date);
      }

      // Get additional images for this program
      const [imageRows] = await db.execute(
        'SELECT image_data FROM program_additional_images WHERE program_id = ? ORDER BY image_order ASC',
        [program.id]
      );
      const additionalImages = imageRows.map(row => row.image_data);

      // Get collaboration data if program is collaborative
      let collaborators = [];
      if (program.is_collaborative) {
        // Get all organizations involved in the collaboration
        // This includes both the primary organization and accepted collaborators
        const [collaborationRows] = await db.execute(`
          SELECT DISTINCT
            o.orgName as organization_name,
            o.org as organization_acronym,
            o.org_color as organization_color,
            CASE 
              WHEN o.id = ? THEN 'primary'
              ELSE 'collaborator'
            END as role
          FROM (
            -- Primary organization (the one that created the program)
            SELECT ? as org_id, 'primary' as role
            
            UNION ALL
            
            -- Collaborator organizations (those who accepted collaboration)
            SELECT o.id as org_id, 'collaborator' as role
            FROM program_collaborations pc
            LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE pc.program_id = ? AND pc.status = 'accepted'
          ) org_roles
          LEFT JOIN organizations o ON org_roles.org_id = o.id
          WHERE o.id IS NOT NULL
          ORDER BY 
            CASE WHEN org_roles.role = 'primary' THEN 0 ELSE 1 END,
            o.orgName ASC
        `, [program.organization_id, program.organization_id, program.id]);
        
        collaborators = collaborationRows.map(collab => ({
          organization_name: collab.organization_name,
          organization_acronym: collab.organization_acronym,
          organization_color: collab.organization_color,
          role: collab.role
        }));
      }

      return {
        ...program,
        multiple_dates: multipleDates,
        additional_images: additionalImages,
        collaborators: collaborators
      };
    }));

    const programs = programsWithDates.map(program => {
      let logoUrl;
      if (program.orgLogo) {
        // If logo is stored as a filename, construct the proper URL
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        id: program.id,
        title: program.title,
        description: program.description,
        category: program.category,
        status: program.status,
        date: program.date || program.created_at,
        image: program.image,
        additional_images: program.additional_images,
        event_start_date: program.event_start_date,
        event_end_date: program.event_end_date,
        multiple_dates: program.multiple_dates,
        orgID: program.orgAcronym,
        orgName: program.orgName,
        orgAcronym: program.orgAcronym,
        orgColor: program.orgColor,
        orgLogo: logoUrl,
        created_at: program.created_at,
        slug: program.slug,
        is_collaborative: program.is_collaborative,
        collaborators: program.collaborators
      };
    });

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured programs",
      error: error.message,
    });
  }
};

// Get program by slug for public display
export const getProgramBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const query = `
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
        pp.slug,
        pp.is_collaborative,
        pp.accepts_volunteers,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as orgLogo,
        o.org_color as organization_color
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      WHERE pp.slug = ? AND pp.is_approved = TRUE
    `;
    
    const [results] = await db.execute(query, [slug]);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }
    
    const program = results[0];
    
    // Get multiple dates for this program
    let multipleDates = [];
    
    // If program has event_start_date and event_end_date, check if they're the same (single day)
    if (program.event_start_date && program.event_end_date) {
      if (program.event_start_date === program.event_end_date) {
        // Single day program
        multipleDates = [program.event_start_date];
      }
    } else {
      // Check for multiple dates in program_event_dates table
      const [dateRows] = await db.execute(
        'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
        [program.id]
      );
      multipleDates = dateRows.map(row => row.event_date);
    }

    // Get additional images for this program
    const [imageRows] = await db.execute(
      'SELECT image_data FROM program_additional_images WHERE program_id = ? ORDER BY image_order ASC',
      [program.id]
    );
    const additionalImages = imageRows.map(row => row.image_data);

    // Get collaboration data if program is collaborative
    let collaborators = [];
    if (program.is_collaborative) {
      const [collaborationRows] = await db.execute(`
        SELECT 
          o.orgName as organization_name,
          o.org as organization_acronym,
          o.logo as organization_logo
        FROM program_collaborations pc
        LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
        LEFT JOIN organizations o ON a.organization_id = o.id
        WHERE pc.program_id = ? AND pc.status = 'accepted'
        ORDER BY o.orgName ASC
      `, [program.id]);
      
      collaborators = collaborationRows.map(collab => ({
        organization_name: collab.organization_name,
        organization_acronym: collab.organization_acronym,
        organization_logo: collab.organization_logo ? getOrganizationLogoUrl(collab.organization_logo) : null
      }));
    }

    // Construct proper logo URL
    let logoUrl;
    if (program.orgLogo) {
      if (program.orgLogo.includes('/')) {
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      }
    } else {
      // Fallback to default logo
      logoUrl = `/logo/faith_community_logo.png`;
    }

    const programWithDates = {
      ...program,
      orgLogo: logoUrl,
      multiple_dates: multipleDates,
      additional_images: additionalImages,
      collaborators: collaborators
    };
    
    res.json({
      success: true,
      data: programWithDates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch program',
      error: error.message
    });
  }
};

// Get other programs from the same organization (excluding current program)
export const getOtherProgramsByOrganization = async (req, res) => {
  try {
    const { organizationId, excludeProgramId } = req.params;
    
    const query = `
      SELECT 
        pp.id,
        pp.title,
        pp.description,
        pp.category,
        pp.status,
        pp.image,
        pp.slug,
        pp.created_at,
        pp.accepts_volunteers,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as orgLogo
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      WHERE pp.organization_id = ? AND pp.id != ? AND pp.is_approved = TRUE
      ORDER BY pp.created_at DESC
      LIMIT 6
    `;
    
    const [results] = await db.execute(query, [organizationId, excludeProgramId]);
    
    const programs = results.map(program => {
      let logoUrl;
      if (program.orgLogo) {
        logoUrl = getOrganizationLogoUrl(program.orgLogo);
      } else {
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        ...program,
        orgLogo: logoUrl
      };
    });
    
    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch other programs',
      error: error.message
    });
  }
};

// ---------------- Add new program (from programProjectsController) ----------------
// SECURITY NOTE: This function should only be used by superadmins or through the approval process
// The direct route has been removed to enforce submission workflow
export const addProgramProject = async (req, res) => {
  const { 
    title, 
    description, 
    category,
    event_start_date,
    event_end_date,
    collaborators: collaboratorsRaw 
  } = req.body;
  let image = '';
  
  // Parse collaborators if it's a string (from FormData)
  let collaborators = [];
  if (collaboratorsRaw) {
    try {
      if (typeof collaboratorsRaw === 'string') {
        collaborators = JSON.parse(collaboratorsRaw);
      } else if (Array.isArray(collaboratorsRaw)) {
        collaborators = collaboratorsRaw;
      }
    } catch (error) {
      collaborators = [];
    }
  }

  // Get the current admin ID
  const currentAdminId = req.admin?.id || req.superadmin?.id;
  
  if (!currentAdminId) {
    return res.status(401).json({
      success: false,
      message: 'Admin ID not found in request'
    });
  }

  // Get the admin's organization ID
  const [adminRows] = await db.execute(`
    SELECT organization_id FROM admins WHERE id = ?
  `, [currentAdminId]);
  
  if (adminRows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Admin not found'
    });
  }
  
  const adminOrgId = adminRows[0].organization_id;

  if (req.file) {
    try {
      const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
      const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
      const uploadResult = await uploadSingleToCloudinary(
        req.file, 
        CLOUDINARY_FOLDERS.PROGRAMS.MAIN,
        { prefix: 'prog_main_' }
      );
      image = uploadResult.url;
    } catch (uploadError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload program image' 
      });
    }
  }

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    // Generate slug from title
    const slug = title
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

    const [result] = await db.execute(
      `INSERT INTO programs_projects (organization_id, title, description, category, event_start_date, event_end_date, image, status, slug, is_approved, is_collaborative)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminOrgId, 
        title, 
        description ?? null, 
        category ?? null,
        event_start_date ?? null,
        event_end_date ?? null,
        image ?? null, 
        'Upcoming', // Default status for new programs 
        finalSlug, 
        false, // SECURITY FIX: Always require superadmin approval - never auto-approve
        collaborators && collaborators.length > 0
      ]
    );

    const newId = result.insertId;

    // Handle collaboration invitations if provided
    if (collaborators && collaborators.length > 0) {
      
      // Filter out self-collaboration
      const validCollaborators = collaborators.filter(collaboratorId => 
        collaboratorId !== currentAdminId
      );
      
      for (const collaboratorId of validCollaborators) {
        try {
          await db.execute(`
            INSERT INTO program_collaborations (program_id, collaborator_admin_id, invited_by_admin_id, status)
            VALUES (?, ?, ?, 'pending')
          `, [newId, collaboratorId, currentAdminId]);

          // Notify collaborator about the collaboration request
          try {
            const NotificationController = (await import('./notificationController.js')).default;
            await NotificationController.createNotification(
              collaboratorId,
              'collaboration_request',
              'New Collaboration Request',
              `You have received a collaboration request for "${title}". Please review and respond.`,
              'programs',
              newId
            );
          } catch (notificationError) {
            // Don't fail the main operation if notification fails
          }
        } catch (collabError) {
          // Continue with other collaborators even if one fails
        }
      }
    }
    const appBase = process.env.APP_BASE_URL;
    const programUrl = `${appBase}/programs/${finalSlug}`;

    // 🔔 Email subscribers (non-blocking but awaited here for logs)
    try {
      await sendToSubscribers({
        subject: `New Program: ${title}`,
        html: `
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description || "")}</p>
          ${image ? `<p><img src="${escapeHtml(getProgramImageUrl(image))}" alt="${escapeHtml(title)}" style="max-width:100%;height:auto"/></p>` : ""}
          <p><a href="${programUrl}">View details</a></p>
        `,
      });
    } catch (mailErr) {
    }

    return res
      .status(201)
      .json({ message: 'Project submitted for approval', id: newId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ---------------- Update existing program (from programProjectsController) ----------------
export const updateProgramProject = async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;
  let image = null;

  // Handle image upload to Cloudinary if file is provided
  if (req.file) {
    try {
      const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
      const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
      const uploadResult = await uploadSingleToCloudinary(
        req.file, 
        CLOUDINARY_FOLDERS.PROGRAMS.MAIN,
        { prefix: 'prog_main_' }
      );
      image = uploadResult.url;
    } catch (uploadError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload program image' 
      });
    }
  }

  try {
    // Generate new slug if title changed
    let slugUpdate = '';
    let slugValue = null;
    
    if (title) {
      const slug = title
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
          'SELECT id FROM programs_projects WHERE slug = ? AND id != ?',
          [finalSlug, id]
        );
        
        if (existingSlug.length === 0) {
          break;
        }
        finalSlug = `${slug}-${counter}`;
        counter++;
      }
      
      slugUpdate = ', slug = ?';
      slugValue = finalSlug;
    }

    await db.execute(
      `UPDATE programs_projects
       SET title = ?, description = ?, image = COALESCE(?, image), status = ?${slugUpdate}
       WHERE id = ?`,
      title ? [title, description ?? null, image, status ?? 'pending', slugValue, id] 
            : [title, description ?? null, image, status ?? 'pending', id]
    );

    // Get the current slug for the URL
    const [programRows] = await db.execute(
      'SELECT slug FROM programs_projects WHERE id = ?',
      [id]
    );
    const currentSlug = programRows[0]?.slug || id;

    const appBase = process.env.APP_BASE_URL;
    const programUrl = `${appBase}/programs/${currentSlug}`;

    // 🔔 Email subscribers about the update
    try {
      await sendToSubscribers({
        subject: `Program Updated: ${title}`,
        html: `
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description || "")}</p>
          ${image ? `<p><img src="${escapeHtml(getProgramImageUrl(image))}" alt="${escapeHtml(title)}" style="max-width:100%;height:auto"/></p>` : ""}
          <p><a href="${programUrl}">View details</a></p>
        `,
      });
    } catch (mailErr) {
    }

    return res.json({ message: "Program updated successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ---------------- Get all program projects (from programProjectsController) ----------------
export const getProgramProjects = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM programs_projects');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ---------------- Get all programs with organization details for superadmin (from programProjectsController) ----------------
export const getAllProgramsForSuperadmin = async (req, res) => {
  try {
    const query = `
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
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as orgLogo,
        o.org_color as organization_color
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      ORDER BY o.orgName ASC, pp.created_at DESC
    `;
    
    const [rows] = await db.execute(query);
    
    const programsWithDates = await Promise.all(
      rows.map(async (program) => {
        let multipleDates = [];

        if (program.event_start_date && program.event_end_date) {
          if (program.event_start_date === program.event_end_date) {
            multipleDates = [program.event_start_date];
          }
        } else {
          const [dateRows] = await db.execute(
            'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
            [program.id]
          );
          multipleDates = dateRows.map((row) => row.event_date);
        }

        let logoUrl;
        if (program.orgLogo) {
          logoUrl = getOrganizationLogoUrl(program.orgLogo);
        } else {
          logoUrl = `/logo/faith_community_logo.png`;
        }

        return {
          ...program,
          orgLogo: logoUrl,
          multiple_dates: multipleDates,
        };
      })
    );
    
    res.json({
      success: true,
      data: programsWithDates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
      error: error.message,
    });
  }
};

// ---------------- Programs statistics (from programProjectsController) ----------------
export const getProgramsStatistics = async (req, res) => {
  try {
    const statisticsQuery = `
      SELECT 
        COUNT(*) as total_programs,
        SUM(CASE WHEN LOWER(status) = 'upcoming' THEN 1 ELSE 0 END) as upcoming_programs,
        SUM(CASE WHEN LOWER(status) = 'active' THEN 1 ELSE 0 END) as active_programs,
        SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed_programs,
        COUNT(DISTINCT organization_id) as total_organizations
       FROM programs_projects
       WHERE organization_id IS NOT NULL
    `;
    
    const [results] = await db.execute(statisticsQuery);
    
    res.json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs statistics',
      error: error.message,
    });
  }
};

// Mark program as completed
export const markProgramAsCompleted = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Program ID is required",
    });
  }

  try {
    // Check if program exists
    const [programRows] = await db.execute(
      "SELECT id, title, status FROM programs_projects WHERE id = ?",
      [id]
    );

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Update program status to completed
    await db.execute(
      "UPDATE programs_projects SET status = 'Completed' WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Program marked as completed successfully",
      data: {
        id: id,
        title: programRows[0].title,
        status: 'Completed'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark program as completed",
      error: error.message
    });
  }
};

// Mark program as active
export const markProgramAsActive = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Program ID is required",
    });
  }

  try {
    // Check if program exists
    const [programRows] = await db.execute(
      "SELECT id, title, status FROM programs_projects WHERE id = ?",
      [id]
    );

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Update program status to active
    await db.execute(
      "UPDATE programs_projects SET status = 'Active' WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "Program marked as active successfully",
      data: {
        id: id,
        title: programRows[0].title,
        status: 'Active'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark program as active",
      error: error.message
    });
  }
};

// Toggle volunteer acceptance for a program
export const toggleVolunteerAcceptance = async (req, res) => {
  try {
    const { id } = req.params;
    const { accepts_volunteers } = req.body;

    // Validate input
    if (typeof accepts_volunteers !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "accepts_volunteers must be a boolean value"
      });
    }

    // Check if program exists and admin has permission
    const [programRows] = await db.execute(`
      SELECT p.*, o.orgName 
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = ? AND p.organization_id = ?
    `, [id, req.admin.organization_id]);

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Program not found or you don't have permission to modify it"
      });
    }

    // Update volunteer acceptance status
    await db.execute(
      "UPDATE programs_projects SET accepts_volunteers = ? WHERE id = ?",
      [accepts_volunteers, id]
    );

    const action = accepts_volunteers ? 'accepting' : 'not accepting';
    res.json({
      success: true,
      message: `Program is now ${action} volunteer applications`,
      data: {
        id: id,
        title: programRows[0].title,
        accepts_volunteers: accepts_volunteers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update volunteer acceptance status",
      error: error.message
    });
  }
};
// db table: programs_projects
import db from "../../database.js";
import path from 'path';
import fs from 'fs';
import { sendToSubscribers } from './subscribersController.js';

// ---------------- Helper: escape HTML ----------------
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

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
      console.error(`[ERROR] Organization not found for ID/acronym: ${orgId}`);
      return res.status(404).json({
        success: false,
        message: `Organization not found: ${orgId}`,
      });
    }

    const organization = orgRows[0];

    // Get only approved programs from programs_projects table
    const [approvedRows] = await db.execute(
      `SELECT p.*, 'approved' as source_type, o.org as orgAcronym, o.orgName as orgName, o.logo as orgLogo
       FROM programs_projects p
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE p.organization_id = ? AND p.is_approved = TRUE
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
        if (program.orgLogo.includes('/')) {
          // Legacy path - extract filename
          const filename = program.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${program.orgLogo}`;
        }
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        id: program.id,
        title: program.title,
        description: program.description,
        category: program.category,
        status: program.status || 'active',
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
        slug: program.slug
      };
    });

    res.json(approvedPrograms);
  } catch (error) {
    console.error("❌ Error fetching programs:", error);
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
        if (program.orgLogo.includes('/')) {
          // Legacy path - extract filename
          const filename = program.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${program.orgLogo}`;
        }
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
        slug: program.slug
      };
    });

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    console.error("❌ Error fetching approved programs:", error);
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
      console.error(`[ERROR] Organization not found for ID/acronym: ${orgId}`);
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
        if (program.orgLogo.includes('/')) {
          // Legacy path - extract filename
          const filename = program.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${program.orgLogo}`;
        }
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
        slug: program.slug
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
    console.error("❌ Error fetching organization programs:", error);
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
    console.error("❌ Error deleting program:", error);
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
  const { title, description, category, status, image, additionalImages, event_start_date, event_end_date, multiple_dates } = req.body;

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

    // Handle main image if provided
    if (image && image.startsWith('data:image/')) {
      // Convert base64 to file
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1e9);
      const extension = image.match(/data:image\/(\w+);/)[1];
      const filename = `program-${timestamp}-${randomSuffix}.${extension}`;
      
      // Save file to uploads directory
      const fs = await import('fs');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(), 'uploads', 'programs', 'main-images');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      imagePath = `programs/main-images/${filename}`;
      // Main image saved
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
       SET title = ?, description = ?, category = ?, status = ?, image = ?, event_start_date = ?, event_end_date = ?
       WHERE id = ?`,
      [title, description, category, status || 'active', imagePath, event_start_date || null, event_end_date || null, id]
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
        const fs = await import('fs');
        const path = await import('path');
        const uploadsDir = path.join(process.cwd(), 'uploads', 'programs', 'additional-images');
        
        // Ensure directory exists
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        for (let i = 0; i < additionalImages.length; i++) {
          const imageData = additionalImages[i];
          
          if (imageData && imageData.startsWith('data:image/')) {
            // Convert base64 to file
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Generate unique filename
            const timestamp = Date.now();
            const randomSuffix = Math.round(Math.random() * 1e9);
            const extension = imageData.match(/data:image\/(\w+);/)[1];
            const filename = `additional-${timestamp}-${randomSuffix}-${i}.${extension}`;
            
            const filePath = path.join(uploadsDir, filename);
            fs.writeFileSync(filePath, buffer);
            
            // Store file path in database
            await db.execute(
              'INSERT INTO program_additional_images (program_id, image_data, image_order) VALUES (?, ?, ?)',
              [id, `programs/additional-images/${filename}`, i]
            );
          }
        }
      }
      // Additional images updated
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
    console.error("❌ Error updating program:", error);
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
    console.error("❌ Error toggling featured status:", error);
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
    console.error("❌ Error fetching program by ID:", error);
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
        if (program.orgLogo.includes('/')) {
          // Legacy path - extract filename
          const filename = program.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${program.orgLogo}`;
        }
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
        slug: program.slug
      };
    });

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    console.error("❌ Error fetching featured programs:", error);
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
        if (program.orgLogo.includes('/')) {
          // Legacy path - extract filename
          const filename = program.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${program.orgLogo}`;
        }
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
        slug: program.slug
      };
    });

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    console.error("❌ Error fetching featured programs:", error);
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

    // Construct proper logo URL
    let logoUrl;
    if (program.orgLogo) {
      if (program.orgLogo.includes('/')) {
        // Legacy path - extract filename
        const filename = program.orgLogo.split('/').pop();
        logoUrl = `/uploads/organizations/logos/${filename}`;
      } else {
        // New structure - direct filename
        logoUrl = `/uploads/organizations/logos/${program.orgLogo}`;
      }
    } else {
      // Fallback to default logo
      logoUrl = `/logo/faith_community_logo.png`;
    }

    const programWithDates = {
      ...program,
      orgLogo: logoUrl,
      multiple_dates: multipleDates,
      additional_images: additionalImages
    };
    
    res.json({
      success: true,
      data: programWithDates
    });
  } catch (error) {
    console.error('Error fetching program by slug:', error);
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
        if (program.orgLogo.includes('/')) {
          const filename = program.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          logoUrl = `/uploads/organizations/logos/${program.orgLogo}`;
        }
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
    console.error('Error fetching other programs by organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch other programs',
      error: error.message
    });
  }
};

// ---------------- Add new program (from programProjectsController) ----------------
export const addProgramProject = async (req, res) => {
  const { title, description } = req.body;
  let image = '';

  if (req.file) {
    image = req.file.filename;
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
      `INSERT INTO programs_projects (title, description, image, status, slug, is_approved)
       VALUES (?, ?, ?, 'pending', ?, FALSE)`,
      [title, description ?? null, image ?? null, finalSlug]
    );

    const newId = result.insertId;
    const appBase = process.env.APP_BASE_URL || 'http://localhost:3000';
    const programUrl = `${appBase}/programs/${finalSlug}`;

    // 🔔 Email subscribers (non-blocking but awaited here for logs)
    try {
      await sendToSubscribers({
        subject: `New Program: ${title}`,
        html: `
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description || "")}</p>
          ${image ? `<p><img src="${escapeHtml("/uploads/" + image)}" alt="${escapeHtml(title)}" style="max-width:100%;height:auto"/></p>` : ""}
          <p><a href="${programUrl}">View details</a></p>
        `,
      });
    } catch (mailErr) {
      console.warn("sendToSubscribers failed:", mailErr?.message || mailErr);
    }

    return res
      .status(201)
      .json({ message: 'Project submitted for approval', id: newId });
  } catch (error) {
    console.error('addProgramProject error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------- Update existing program (from programProjectsController) ----------------
export const updateProgramProject = async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;
  let image = req.file ? req.file.filename : null;

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

    const appBase = process.env.APP_BASE_URL || 'http://localhost:3000';
    const programUrl = `${appBase}/programs/${currentSlug}`;

    // 🔔 Email subscribers about the update
    try {
      await sendToSubscribers({
        subject: `Program Updated: ${title}`,
        html: `
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description || "")}</p>
          ${image ? `<p><img src="${escapeHtml("/uploads/" + image)}" alt="${escapeHtml(title)}" style="max-width:100%;height:auto"/></p>` : ""}
          <p><a href="${programUrl}">View details</a></p>
        `,
      });
    } catch (mailErr) {
      console.warn("sendToSubscribers failed:", mailErr?.message || mailErr);
    }

    return res.json({ message: "Program updated successfully." });
  } catch (error) {
    console.error('updateProgramProject error:', error);
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
          if (String(program.orgLogo).includes('/')) {
            const filename = String(program.orgLogo).split('/').pop();
            logoUrl = `/uploads/organizations/logos/${filename}`;
          } else {
            logoUrl = `/uploads/organizations/logos/${program.orgLogo}`;
          }
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
    console.error('Error fetching all programs for superadmin:', error);
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
    console.error('Error fetching programs statistics:', error);
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
    console.error('Error marking program as completed:', error);
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
    console.error('Error marking program as active:', error);
    res.status(500).json({
      success: false,
      message: "Failed to mark program as active",
      error: error.message
    });
  }
};

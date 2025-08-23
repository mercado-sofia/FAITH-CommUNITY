// db table: programs_projects
import db from "../../database.js";

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
      "SELECT id, orgName, org FROM organizations WHERE id = ?",
      [orgId]
    );

    // If not found by ID, try by org acronym from organizations table
    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, orgName, org FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    // If still not found, try admins table as fallback and sync to organizations
    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, orgName, org FROM admins WHERE org = ?",
        [orgId]
      );
      
      // If found in admins table, sync to organizations table
      if (orgRows.length > 0) {
        const adminOrg = orgRows[0];
  
        
        // Check if organization already exists in organizations table
        const [existingOrg] = await db.execute(
          "SELECT id FROM organizations WHERE org = ?",
          [adminOrg.org]
        );
        
        if (existingOrg.length === 0) {
          // Insert into organizations table
          const [insertResult] = await db.execute(
            "INSERT INTO organizations (org, orgName, description, status) VALUES (?, ?, NULL, 'ACTIVE')",
            [adminOrg.org, adminOrg.orgName]
          );
  
          
          // Update the orgRows with the new organization data
          [orgRows] = await db.execute(
            "SELECT id, orgName, org FROM organizations WHERE id = ?",
            [insertResult.insertId]
          );
        } else {
          // Use existing organization
          [orgRows] = await db.execute(
            "SELECT id, orgName, org FROM organizations WHERE org = ?",
            [adminOrg.org]
          );
        }
      }
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
      `SELECT p.*, 'approved' as source_type, o.org as orgAcronym, o.logo as orgLogo
       FROM programs_projects p
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE p.organization_id = ? 
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
        icon: logoUrl
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
        icon: logoUrl,
        created_at: program.created_at
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
    // Get organization info
    const [orgRows] = await db.execute(
      "SELECT id, orgName, org FROM admins WHERE org = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const organization = orgRows[0];

    // Get approved programs for this organization
    const [rows] = await db.execute(`
       SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo
       FROM programs_projects p
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE o.org = ?
       ORDER BY p.created_at DESC
    `, [orgId]);

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
        icon: logoUrl,
        created_at: program.created_at
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

  console.log('🔄 Update program request received:', { id, title, description, category, status });
  console.log('📅 Date data:', { event_start_date, event_end_date, multiple_dates });
  console.log('🖼️ Image data:', image ? 'Image provided' : 'No image provided');
  console.log('🖼️ Additional images:', additionalImages ? `${additionalImages.length} images` : 'No additional images');

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
      console.log('❌ Program not found:', id);
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    console.log('✅ Program found:', existingProgram[0]);
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
      console.log('✅ Main image saved:', imagePath);
    } else if (image === null) {
      // User wants to remove the image
      imagePath = null;
      console.log('🗑️ User requested to remove main image');
    } else if (image === undefined) {
      // No change to image - keep existing
      console.log('🔄 Keeping existing main image:', imagePath);
    } else {
      console.log('🔄 Keeping existing main image:', imagePath);
    }
    // If image is null, keep the existing image (imagePath already set to existingProgram[0].image)

    console.log('📝 Updating program in database...');
    // Update the program
    const [result] = await db.execute(
      `UPDATE programs_projects 
       SET title = ?, description = ?, category = ?, status = ?, image = ?, event_start_date = ?, event_end_date = ?
       WHERE id = ?`,
      [title, description, category, status || 'active', imagePath, event_start_date || null, event_end_date || null, id]
    );

    if (result.affectedRows === 0) {
      console.log('❌ No rows affected during update');
      return res.status(404).json({
        success: false,
        message: "Program not found or no changes made",
      });
    }

    console.log('✅ Program updated successfully, rows affected:', result.affectedRows);

    // Handle multiple dates if provided
    if (multiple_dates && Array.isArray(multiple_dates)) {
      console.log('📅 Processing multiple dates:', multiple_dates);
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
      console.log('✅ Multiple dates updated');
    }

    // Handle additional images if provided
    if (additionalImages && Array.isArray(additionalImages)) {
      console.log('🖼️ Processing additional images:', additionalImages.length);
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
      console.log('✅ Additional images updated');
    }

    console.log('🎉 Program update completed successfully');
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

// Get program by title/slug for public display
export const getProgramByTitle = async (req, res) => {
  try {
    const { title } = req.params;
    
    // Convert URL-friendly slug back to title format
    const decodedTitle = decodeURIComponent(title);
    
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
        o.logo as organization_logo,
        o.org_color as organization_color
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      WHERE pp.title = ?
    `;
    
    const [results] = await db.execute(query, [decodedTitle]);
    
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
    if (program.organization_logo) {
      if (program.organization_logo.includes('/')) {
        // Legacy path - extract filename
        const filename = program.organization_logo.split('/').pop();
        logoUrl = `/uploads/organizations/logos/${filename}`;
      } else {
        // New structure - direct filename
        logoUrl = `/uploads/organizations/logos/${program.organization_logo}`;
      }
    } else {
      // Fallback to default logo
      logoUrl = `/logo/faith_community_logo.png`;
    }

    const programWithDates = {
      ...program,
      organization_logo: logoUrl,
      multiple_dates: multipleDates,
      additional_images: additionalImages
    };
    
    res.json({
      success: true,
      data: programWithDates
    });
  } catch (error) {
    console.error('Error fetching program by title:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch program',
      error: error.message
    });
  }
};

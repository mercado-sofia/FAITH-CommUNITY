// controllers/programsController.js
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
    console.log(`[DEBUG] Fetching programs for org ID: ${orgId}`);
    
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
        console.log(`[DEBUG] Found organization in admins table, syncing to organizations table:`, adminOrg);
        
        // Check if organization already exists in organizations table
        const [existingOrg] = await db.execute(
          "SELECT id FROM organizations WHERE org = ?",
          [adminOrg.org]
        );
        
        if (existingOrg.length === 0) {
          // Insert into organizations table
          const [insertResult] = await db.execute(
            "INSERT INTO organizations (org, orgName, email, description, status) VALUES (?, ?, NULL, NULL, 'ACTIVE')",
            [adminOrg.org, adminOrg.orgName]
          );
          console.log(`[DEBUG] Synced organization to organizations table with ID: ${insertResult.insertId}`);
          
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
    console.log(`[DEBUG] Found organization:`, organization);

    // Get only approved programs from programs_projects table
    const [approvedRows] = await db.execute(
      `SELECT p.*, 'approved' as source_type, o.org as orgAcronym, o.logo as orgLogo
       FROM programs_projects p
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE p.organization_id = ? 
       ORDER BY p.created_at DESC`,
      [organization.id]
    );
    console.log(`[DEBUG] Found ${approvedRows.length} approved programs`);

    // Map approved programs with organization info
    const approvedPrograms = approvedRows.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description,
      category: program.category,
      status: program.status || 'active',
      date: program.date || program.date_completed || program.date_created || program.created_at,
      image: program.image,
      created_at: program.created_at,
      orgID: program.orgAcronym || organization.org,
      orgName: program.orgName || organization.orgName,
      icon: program.orgLogo || null
    }));

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

    const programs = rows.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description,
      category: program.category,
      status: program.status,
      date: program.date || program.created_at,
      image: program.image,
      orgID: program.orgAcronym,
      orgName: program.orgName,
      icon: program.orgLogo,
      created_at: program.created_at
    }));

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

    const programs = rows.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description,
      category: program.category,
      status: program.status,
      date: program.date_completed || program.date_created,
      image: program.image,
      orgID: program.orgAcronym,
      orgName: program.orgName,
      icon: program.orgLogo,
      created_at: program.created_at
    }));

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
  const { title, description, category, status, image } = req.body;

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
      'SELECT id, organization_id FROM programs_projects WHERE id = ?',
      [id]
    );

    if (existingProgram.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Update the program
    const [result] = await db.execute(
      `UPDATE programs_projects 
       SET title = ?, description = ?, category = ?, status = ?, image = ?
       WHERE id = ?`,
      [title, description, category, status || 'active', image, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Program not found or no changes made",
      });
    }

    res.json({
      success: true,
      message: "Program updated successfully",
      data: {
        id: parseInt(id),
        title,
        description,
        category,
        status: status || 'active',
        image
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

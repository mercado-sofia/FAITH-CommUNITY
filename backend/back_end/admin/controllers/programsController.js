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
    // Get organization info first
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

    // Get programs from submissions table (pending approval) and programs table (approved)
    const [submissionRows] = await db.execute(
      `SELECT s.*, 'pending' as source_type
       FROM submissions s 
       WHERE s.organization_id = ? AND s.section = 'programs' AND s.status = 'pending'
       ORDER BY s.submitted_at DESC`,
      [organization.id]
    );

    const [approvedRows] = await db.execute(
      `SELECT p.*, 'approved' as source_type, p.created_at as submitted_at
       FROM programs_projects p 
       WHERE p.organization_id = ?
       ORDER BY p.created_at DESC`,
      [organization.id]
    );

    // Parse submission data and combine with approved programs
    const pendingPrograms = submissionRows.map(submission => {
      try {
        const data = JSON.parse(submission.data || submission.proposed_data);
        return {
          id: `submission_${submission.id}`,
          submission_id: submission.id,
          title: data.title,
          description: data.description,
          category: data.category,
          status: data.status,
          date: data.date,
          image: data.image,
          created_at: submission.submitted_at,
          approval_status: 'pending',
          source_type: 'pending'
        };
      } catch (error) {
        console.error('Error parsing submission data:', error);
        return null;
      }
    }).filter(Boolean);

    const approvedPrograms = approvedRows.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description,
      category: program.category,
      status: program.status,
      date: program.date_completed || program.date_created,
      image: program.image,
      created_at: program.created_at,
      approval_status: 'approved',
      source_type: 'approved'
    }));

    // Combine and sort by creation date
    const allPrograms = [...pendingPrograms, ...approvedPrograms]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      data: allPrograms,
      organization: {
        id: organization.id,
        name: organization.orgName,
        acronym: organization.org
      }
    });
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
      date: program.date_completed || program.date_created,
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
    const [rows] = await db.execute(
      `SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo
       FROM programs_projects p
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE o.org = ?
       ORDER BY p.created_at DESC`,
      [orgId]
    );

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

// Program collaboration management controller
import db from '../../database.js';
import NotificationController from './notificationController.js';

// Get all available admins (for new program creation)
export const getAllAvailableAdmins = async (req, res) => {
  try {
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    // Get all active admins except the current admin
    const [availableAdmins] = await db.execute(`
      SELECT a.id, a.email, o.orgName as organization_name, o.org as organization_acronym
      FROM admins a
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE a.is_active = TRUE 
      AND a.id != ?
      ORDER BY o.orgName ASC, a.email ASC
    `, [currentAdminId]);

    res.json({
      success: true,
      data: availableAdmins
    });
  } catch (error) {
    console.error('Error fetching available admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available admins',
      error: error.message
    });
  }
};

// Get available admins to invite (existing admins only)
export const getAvailableAdmins = async (req, res) => {
  try {
    const { programId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    // Build query based on whether programId is provided
    let query, params;
    
    if (programId && programId !== 'null') {
      // For existing programs, exclude already invited/accepted collaborators
      query = `
        SELECT a.id, a.email, o.orgName as organization_name, o.org as organization_acronym
        FROM admins a
        LEFT JOIN organizations o ON a.organization_id = o.id
        WHERE a.is_active = TRUE 
        AND a.id != ?
        AND a.id NOT IN (
          SELECT collaborator_admin_id 
          FROM program_collaborations 
          WHERE program_id = ? AND status IN ('pending', 'accepted')
        )
        ORDER BY o.orgName ASC, a.email ASC
      `;
      params = [currentAdminId, programId];
    } else {
      // For new programs, just exclude current admin
      query = `
        SELECT a.id, a.email, o.orgName as organization_name, o.org as organization_acronym
        FROM admins a
        LEFT JOIN organizations o ON a.organization_id = o.id
        WHERE a.is_active = TRUE 
        AND a.id != ?
        ORDER BY o.orgName ASC, a.email ASC
      `;
      params = [currentAdminId];
    }

    const [availableAdmins] = await db.execute(query, params);

    res.json({
      success: true,
      data: availableAdmins
    });
  } catch (error) {
    console.error('Error fetching available admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available admins',
      error: error.message
    });
  }
};

// Invite collaborator to program
export const inviteCollaborator = async (req, res) => {
  try {
    const { programId } = req.params;
    const { collaboratorAdminId } = req.body;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    // Verify the program exists and current admin is the creator
    const [programRows] = await db.execute(`
      SELECT p.id, p.title, p.organization_id, a.organization_id as admin_org_id
      FROM programs_projects p
      LEFT JOIN admins a ON a.id = ?
      WHERE p.id = ? AND p.organization_id = a.organization_id
    `, [currentAdminId, programId]);

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found or you do not have permission to invite collaborators'
      });
    }

    const program = programRows[0];

    // Check if collaboration already exists
    const [existingCollaboration] = await db.execute(`
      SELECT id, status FROM program_collaborations 
      WHERE program_id = ? AND collaborator_admin_id = ?
    `, [programId, collaboratorAdminId]);

    if (existingCollaboration.length > 0) {
      const collaboration = existingCollaboration[0];
      if (collaboration.status === 'pending') {
        return res.status(409).json({
          success: false,
          message: 'Collaboration invitation already pending'
        });
      } else if (collaboration.status === 'accepted') {
        return res.status(409).json({
          success: false,
          message: 'Admin is already a collaborator'
        });
      }
    }

    // Create collaboration invitation with auto-accept
    const [result] = await db.execute(`
      INSERT INTO program_collaborations (program_id, collaborator_admin_id, invited_by_admin_id, status)
      VALUES (?, ?, ?, 'accepted')
    `, [programId, collaboratorAdminId, currentAdminId]);

    // Update program to mark as collaborative
    await db.execute(`
      UPDATE programs_projects SET is_collaborative = TRUE WHERE id = ?
    `, [programId]);

    // Create notification for the auto-accepted collaborator
    try {
      await NotificationController.createNotification(
        collaboratorAdminId,
        'collaboration',
        'Added as Program Collaborator',
        `You've been added as a collaborator on "${program.title}". You can now view and manage this program. If you don't want to participate, you can opt out from the program details.`,
        'programs',
        programId
      );
    } catch (notificationError) {
    }

    res.status(201).json({
      success: true,
      message: 'Collaborator added successfully',
      collaborationId: result.insertId
    });
  } catch (error) {
    console.error('Error inviting collaborator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invite collaborator',
      error: error.message
    });
  }
};

// Get program collaborators
export const getProgramCollaborators = async (req, res) => {
  try {
    const { programId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    // Verify the program exists and current admin has access
    const [programRows] = await db.execute(`
      SELECT id, title, organization_id 
      FROM programs_projects 
      WHERE id = ? AND (
        organization_id = (SELECT organization_id FROM admins WHERE id = ?)
        OR id IN (SELECT program_id FROM program_collaborations WHERE collaborator_admin_id = ? AND status = 'accepted')
      )
    `, [programId, currentAdminId, currentAdminId]);

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found or you do not have access'
      });
    }

    // Get collaborators
    const [collaborators] = await db.execute(`
      SELECT 
        pc.id,
        pc.status,
        pc.invited_at,
        pc.responded_at,
        a.id as admin_id,
        a.email,
        o.orgName as organization_name,
        o.org as organization_acronym
      FROM program_collaborations pc
      LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE pc.program_id = ?
      ORDER BY pc.invited_at DESC
    `, [programId]);

    res.json({
      success: true,
      data: collaborators
    });
  } catch (error) {
    console.error('Error fetching program collaborators:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collaborators',
      error: error.message
    });
  }
};

// Remove collaborator from program
export const removeCollaborator = async (req, res) => {
  try {
    const { programId, adminId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    // Verify the program exists and current admin is the creator
    const [programRows] = await db.execute(`
      SELECT id, title, organization_id 
      FROM programs_projects 
      WHERE id = ? AND organization_id = (
        SELECT organization_id FROM admins WHERE id = ?
      )
    `, [programId, currentAdminId]);

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found or you do not have permission to remove collaborators'
      });
    }

    // Remove collaboration
    const [result] = await db.execute(`
      DELETE FROM program_collaborations 
      WHERE program_id = ? AND collaborator_admin_id = ?
    `, [programId, adminId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration not found'
      });
    }

    // Check if there are any remaining collaborators
    const [remainingCollaborations] = await db.execute(`
      SELECT COUNT(*) as count FROM program_collaborations 
      WHERE program_id = ? AND status = 'accepted'
    `, [programId]);

    // If no collaborators left, mark program as non-collaborative
    if (remainingCollaborations[0].count === 0) {
      await db.execute(`
        UPDATE programs_projects SET is_collaborative = FALSE WHERE id = ?
      `, [programId]);
    }

    res.json({
      success: true,
      message: 'Collaborator removed successfully'
    });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove collaborator',
      error: error.message
    });
  }
};

// Accept collaboration invitation
export const acceptCollaboration = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    // Update collaboration status
    const [result] = await db.execute(`
      UPDATE program_collaborations 
      SET status = 'accepted', responded_at = NOW()
      WHERE id = ? AND collaborator_admin_id = ? AND status = 'pending'
    `, [collaborationId, currentAdminId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration invitation not found or already responded'
      });
    }

    // Get program details for notification
    const [programDetails] = await db.execute(`
      SELECT pp.title, pp.id, a.email as inviter_email
      FROM program_collaborations pc
      LEFT JOIN programs_projects pp ON pc.program_id = pp.id
      LEFT JOIN admins a ON pc.invited_by_admin_id = a.id
      WHERE pc.id = ?
    `, [collaborationId]);

    // Notify the inviter
    if (programDetails.length > 0) {
      const program = programDetails[0];
      try {
        await NotificationController.createNotification(
          req.admin.id, // This should be the inviter's ID, but we need to get it from the collaboration
          'collaboration',
          'Collaboration Accepted',
          `Your collaboration invitation for "${program.title}" has been accepted`,
          'programs',
          program.id
        );
      } catch (notificationError) {
      }
    }

    res.json({
      success: true,
      message: 'Collaboration invitation accepted'
    });
  } catch (error) {
    console.error('Error accepting collaboration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept collaboration',
      error: error.message
    });
  }
};

// Opt out of collaboration (for auto-accepted collaborations)
export const optOutCollaboration = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    // Get collaboration details first
    const [collaborationRows] = await db.execute(`
      SELECT pc.id, pc.program_id, pp.title as program_title
      FROM program_collaborations pc
      LEFT JOIN programs_projects pp ON pc.program_id = pp.id
      WHERE pc.id = ? AND pc.collaborator_admin_id = ? AND pc.status = 'accepted'
    `, [collaborationId, currentAdminId]);

    if (collaborationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active collaboration not found'
      });
    }

    const collaboration = collaborationRows[0];

    // Update collaboration status to declined
    const [result] = await db.execute(`
      UPDATE program_collaborations 
      SET status = 'declined', responded_at = NOW()
      WHERE id = ? AND collaborator_admin_id = ? AND status = 'accepted'
    `, [collaborationId, currentAdminId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration not found or already opted out'
      });
    }

    // Check if there are any remaining active collaborators
    const [remainingCollaborations] = await db.execute(`
      SELECT COUNT(*) as count FROM program_collaborations 
      WHERE program_id = ? AND status = 'accepted'
    `, [collaboration.program_id]);

    // If no collaborators left, mark program as non-collaborative
    if (remainingCollaborations[0].count === 0) {
      await db.execute(`
        UPDATE programs_projects SET is_collaborative = FALSE WHERE id = ?
      `, [collaboration.program_id]);
    }

    res.json({
      success: true,
      message: `You have opted out of collaborating on "${collaboration.program_title}"`
    });
  } catch (error) {
    console.error('Error opting out of collaboration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to opt out of collaboration',
      error: error.message
    });
  }
};

// Decline collaboration invitation (legacy - for pending invitations)
export const declineCollaboration = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    // Update collaboration status
    const [result] = await db.execute(`
      UPDATE program_collaborations 
      SET status = 'declined', responded_at = NOW()
      WHERE id = ? AND collaborator_admin_id = ? AND status = 'pending'
    `, [collaborationId, currentAdminId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration invitation not found or already responded'
      });
    }

    res.json({
      success: true,
      message: 'Collaboration invitation declined'
    });
  } catch (error) {
    console.error('Error declining collaboration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline collaboration',
      error: error.message
    });
  }
};

// Get collaboration invitations for current admin
export const getCollaborationInvitations = async (req, res) => {
  try {
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    const [invitations] = await db.execute(`
      SELECT 
        pc.id,
        pc.status,
        pc.invited_at,
        pp.id as program_id,
        pp.title as program_title,
        pp.description as program_description,
        a.email as inviter_email,
        o.orgName as inviter_organization
      FROM program_collaborations pc
      LEFT JOIN programs_projects pp ON pc.program_id = pp.id
      LEFT JOIN admins a ON pc.invited_by_admin_id = a.id
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE pc.collaborator_admin_id = ? AND pc.status = 'pending'
      ORDER BY pc.invited_at DESC
    `, [currentAdminId]);

    res.json({
      success: true,
      data: invitations
    });
  } catch (error) {
    console.error('Error fetching collaboration invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collaboration invitations',
      error: error.message
    });
  }
};

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
    console.error('Error in getAllAvailableAdmins:', error);
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
          WHERE program_id = ? AND status IN ('accepted', 'declined')
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
    console.error('Error in getAvailableAdmins:', error);
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

    // Prevent self-collaboration
    if (collaboratorAdminId === currentAdminId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as a collaborator'
      });
    }

    // Check if collaboration already exists
    const [existingCollaboration] = await db.execute(`
      SELECT id, status FROM program_collaborations 
      WHERE program_id = ? AND collaborator_admin_id = ?
    `, [programId, collaboratorAdminId]);

    if (existingCollaboration.length > 0) {
      const collaboration = existingCollaboration[0];
      if (collaboration.status === 'accepted') {
        return res.status(409).json({
          success: false,
          message: 'Admin is already a collaborator'
        });
      } else if (collaboration.status === 'declined') {
        return res.status(409).json({
          success: false,
          message: 'Admin has previously opted out of this collaboration'
        });
      }
    }

    // Create collaboration invitation with pending status
    const [result] = await db.execute(`
      INSERT INTO program_collaborations (program_id, collaborator_admin_id, invited_by_admin_id, status)
      VALUES (?, ?, ?, 'pending')
    `, [programId, collaboratorAdminId, currentAdminId]);

    // Update program status to pending_collaboration if it's not already collaborative
    // This keeps the program in pending_collaboration status until collaborators accept
    await db.execute(`
      UPDATE programs_projects SET status = 'pending_collaboration', is_collaborative = TRUE WHERE id = ?
    `, [programId]);

    // Notify collaborator about the collaboration request
    try {
      const NotificationController = (await import('./notificationController.js')).default;
      await NotificationController.createNotification({
        admin_id: collaboratorAdminId,
        title: 'New Collaboration Request',
        message: `You have received a collaboration request for "${program.title}". Please review and respond.`,
        type: 'collaboration_request',
        submission_id: programId
      });
    } catch (notificationError) {
      console.error('Failed to send collaboration request notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Collaboration request sent successfully',
      collaborationId: result.insertId
    });
  } catch (error) {
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

    // Get collaborators (only active/accepted ones)
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
      WHERE pc.program_id = ? AND pc.status = 'accepted'
      ORDER BY pc.invited_at DESC
    `, [programId]);

    res.json({
      success: true,
      data: collaborators
    });
  } catch (error) {
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

    // Check if collaboration exists before attempting to delete
    const [existingCollaboration] = await db.execute(`
      SELECT id, status, collaborator_admin_id, program_id
      FROM program_collaborations 
      WHERE program_id = ? AND collaborator_admin_id = ?
    `, [programId, adminId]);

    if (existingCollaboration.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration not found - no collaboration exists between this program and admin'
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
        message: 'Collaboration not found - failed to delete collaboration record'
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
    res.status(500).json({
      success: false,
      message: 'Failed to remove collaborator',
      error: error.message
    });
  }
};

// Note: acceptCollaboration function removed - not needed in auto-accept model

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
    res.status(500).json({
      success: false,
      message: 'Failed to opt out of collaboration',
      error: error.message
    });
  }
};

// Note: declineCollaboration function removed - not needed in auto-accept model

// Get collaboration requests for the current admin (both sent and received)
export const getCollaborationRequests = async (req, res) => {
  try {
    const currentAdminId = req.admin?.id || req.superadmin?.id;
    
    // Fetching collaboration requests
    
    // Get admin's organization
    const [adminRows] = await db.execute(`
      SELECT organization_id, email FROM admins WHERE id = ?
    `, [currentAdminId]);
    
    if (adminRows.length === 0) {
      // Admin not found
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    const adminOrgId = adminRows[0].organization_id;
    const adminEmail = adminRows[0].email;
    // Admin found
    
    // Get all collaborative programs where the current admin is either creator or collaborator
    const [allCollaborations] = await db.execute(`
      SELECT DISTINCT
        p.id as program_id,
        p.title as program_title,
        p.description as program_description,
        p.status as program_status,
        p.is_approved,
        p.is_collaborative,
        p.created_at as program_created_at,
        p.image as program_image,
        p.category as program_category,
        p.event_start_date,
        p.event_end_date,
        p.slug as program_slug,
        p.organization_id as program_org_id,
        -- Program organization details
        prog_org.orgName as program_org_name,
        prog_org.org as program_org_acronym,
        prog_org.logo as program_org_logo
      FROM programs_projects p
      LEFT JOIN organizations prog_org ON p.organization_id = prog_org.id
      WHERE p.is_collaborative = 1 
        AND (
          p.organization_id = ? 
          OR p.id IN (
            SELECT program_id FROM program_collaborations 
            WHERE collaborator_admin_id = ?
          )
        )
      ORDER BY p.created_at DESC
    `, [adminOrgId, currentAdminId]);
    
    // Found collaborative programs
    
    // Process each program to get collaboration details
    const processedCollaborations = await Promise.all(allCollaborations.map(async (program) => {
      // Get all collaboration records for this program
      const [allCollaborators] = await db.execute(`
        SELECT 
          pc.id as collaboration_id,
          pc.status,
          pc.invited_at,
          pc.responded_at,
          pc.invited_by_admin_id,
          pc.collaborator_admin_id,
          inviter.email as inviter_email,
          inviter_org.orgName as inviter_org_name,
          inviter_org.org as inviter_org_acronym,
          invitee.email as invitee_email,
          invitee_org.orgName as invitee_org_name,
          invitee_org.org as invitee_org_acronym,
          CASE 
            WHEN pc.collaborator_admin_id = ? THEN 'received'
            WHEN pc.invited_by_admin_id = ? THEN 'sent'
            ELSE 'unknown'
          END as request_type
        FROM program_collaborations pc
        LEFT JOIN admins inviter ON pc.invited_by_admin_id = inviter.id
        LEFT JOIN organizations inviter_org ON inviter.organization_id = inviter_org.id
        LEFT JOIN admins invitee ON pc.collaborator_admin_id = invitee.id
        LEFT JOIN organizations invitee_org ON invitee.organization_id = invitee_org.id
        WHERE pc.program_id = ?
        ORDER BY pc.invited_at DESC
      `, [currentAdminId, currentAdminId, program.program_id]);
      
      // Find the most relevant collaboration for this admin
      const relevantCollab = allCollaborators.find(c => 
        c.collaborator_admin_id == currentAdminId || c.invited_by_admin_id == currentAdminId
      ) || allCollaborators[0];
      
      // Processing program collaborators
      
      // Determine if this admin is the creator or collaborator
      const isCreator = program.program_org_id == adminOrgId;
      
      return {
        ...program,
        all_collaborators: allCollaborators.map(c => ({
          id: c.collaboration_id,
          status: c.status,
          invited_at: c.invited_at,
          responded_at: c.responded_at,
          inviter_id: c.invited_by_admin_id,
          inviter_email: c.inviter_email,
          inviter_org_name: c.inviter_org_name,
          inviter_org_acronym: c.inviter_org_acronym,
          invitee_id: c.collaborator_admin_id,
          invitee_email: c.invitee_email,
          invitee_org_name: c.invitee_org_name,
          invitee_org_acronym: c.invitee_org_acronym,
          request_type: c.request_type
        })),
        collaboration_id: relevantCollab?.collaboration_id || null,
        status: relevantCollab?.status || 'pending',
        request_type: relevantCollab?.request_type || (isCreator ? 'sent' : 'received'),
        inviter_email: relevantCollab?.inviter_email || null,
        inviter_org_name: relevantCollab?.inviter_org_name || null,
        inviter_org_acronym: relevantCollab?.inviter_org_acronym || null,
        invitee_email: relevantCollab?.invitee_email || null,
        invitee_org_name: relevantCollab?.invitee_org_name || null,
        invitee_org_acronym: relevantCollab?.invitee_org_acronym || null,
        invited_at: relevantCollab?.invited_at || program.program_created_at,
        responded_at: relevantCollab?.responded_at || null
      };
    }));
    
    // Processed collaborations
    
    res.json({
      success: true,
      data: processedCollaborations
    });
  } catch (error) {
    console.error('Error fetching collaboration requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collaboration requests',
      error: error.message
    });
  }
};

// Accept collaboration request
export const acceptCollaborationRequest = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;
    
    if (!collaborationId) {
      return res.status(400).json({
        success: false,
        message: 'Collaboration ID is required'
      });
    }
    
    // Get collaboration details
    const [collaborationRows] = await db.execute(`
      SELECT pc.id, pc.program_id, pc.status, pp.title as program_title, pp.status as program_status, pp.is_approved, pp.organization_id
      FROM program_collaborations pc
      LEFT JOIN programs_projects pp ON pc.program_id = pp.id
      WHERE pc.id = ? AND pc.collaborator_admin_id = ? AND (pc.status = 'pending' OR pc.status IS NULL OR pc.status = '')
    `, [collaborationId, currentAdminId]);
    
    if (collaborationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration request not found or already processed'
      });
    }
    
    const collaboration = collaborationRows[0];
    
    // Update collaboration status to accepted
    await db.execute(`
      UPDATE program_collaborations 
      SET status = 'accepted', responded_at = NOW()
      WHERE id = ? AND collaborator_admin_id = ?
    `, [collaborationId, currentAdminId]);
    
    // Update program to mark as collaborative
    await db.execute(`
      UPDATE programs_projects SET is_collaborative = TRUE WHERE id = ?
    `, [collaboration.program_id]);
    
    // Check if all pending collaborations have been responded to
    const [pendingCollaborations] = await db.execute(`
      SELECT COUNT(*) as count FROM program_collaborations 
      WHERE program_id = ? AND (status = 'pending' OR status IS NULL OR status = '')
    `, [collaboration.program_id]);
    
    // If no pending collaborations remain, check if any were accepted
    if (pendingCollaborations[0].count === 0) {
      const [acceptedCollaborations] = await db.execute(`
        SELECT COUNT(*) as count FROM program_collaborations 
        WHERE program_id = ? AND status = 'accepted'
      `, [collaboration.program_id]);
      
      if (acceptedCollaborations[0].count > 0) {
        // Some collaborations were accepted, move to pending superadmin approval
        await db.execute(`
          UPDATE programs_projects SET status = 'pending_superadmin_approval', is_approved = 0 WHERE id = ?
        `, [collaboration.program_id]);
        
        // Notify superadmin about the new collaborative program pending approval
        try {
          const [superadminRows] = await db.execute(`SELECT id FROM superadmin LIMIT 1`);
          if (superadminRows.length > 0) {
            await db.execute(`
              INSERT INTO superadmin_notifications (superadmin_id, type, title, message, section, submission_id, organization_id)
              VALUES (?, 'approval_request', 'New Collaborative Program Pending Approval', ?, 'programs', ?, ?)
            `, [
              superadminRows[0].id,
              `A collaborative program "${collaboration.program_title}" is now pending your approval. All collaborators have accepted the collaboration request.`,
              collaboration.program_id,
              collaboration.organization_id
            ]);
          }
        } catch (superadminNotificationError) {
          console.error('Failed to send superadmin notification:', superadminNotificationError);
          // Don't fail the main operation if notification fails
        }
      } else {
        // No collaborations were accepted, mark program as declined
        await db.execute(`
          UPDATE programs_projects SET status = 'declined', is_approved = 0 WHERE id = ?
        `, [collaboration.program_id]);
      }
    }
    
    // Notify the creator organization about the acceptance
    try {
      const [creatorRows] = await db.execute(`
        SELECT invited_by_admin_id FROM program_collaborations WHERE id = ?
      `, [collaborationId]);
      
      if (creatorRows.length > 0) {
        const NotificationController = (await import('./notificationController.js')).default;
        await NotificationController.createNotification({
          admin_id: creatorRows[0].invited_by_admin_id,
          title: 'Collaboration Request Accepted',
          message: `Your collaboration request for "${collaboration.program_title}" has been accepted. The program is now pending superadmin approval.`,
          type: 'collaboration_accepted',
          submission_id: collaboration.program_id
        });
      }
    } catch (notificationError) {
      console.error('Failed to send acceptance notification:', notificationError);
      // Don't fail the main operation if notification fails
    }
    
    res.json({
      success: true,
      message: `Collaboration request for "${collaboration.program_title}" accepted successfully. The program is now pending superadmin approval.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to accept collaboration request',
      error: error.message
    });
  }
};

// Decline collaboration request
export const declineCollaborationRequest = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;
    
    // Declining collaboration
    
    if (!collaborationId) {
      return res.status(400).json({
        success: false,
        message: 'Collaboration ID is required'
      });
    }
    
    // Get collaboration details
    const [collaborationRows] = await db.execute(`
      SELECT pc.id, pc.program_id, pc.status, pp.title as program_title, pc.invited_by_admin_id
      FROM program_collaborations pc
      LEFT JOIN programs_projects pp ON pc.program_id = pp.id
      WHERE pc.id = ? AND pc.collaborator_admin_id = ? AND (pc.status = 'pending' OR pc.status IS NULL OR pc.status = '')
    `, [collaborationId, currentAdminId]);
    
    if (collaborationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration request not found or already processed'
      });
    }
    
    const collaboration = collaborationRows[0];
    
    // Update collaboration status to declined
    await db.execute(`
      UPDATE program_collaborations 
      SET status = 'declined', responded_at = NOW()
      WHERE id = ? AND collaborator_admin_id = ?
    `, [collaborationId, currentAdminId]);
    
    // Check if there are any remaining pending collaborations for this program
    const [remainingCollaborations] = await db.execute(`
      SELECT COUNT(*) as count FROM program_collaborations 
      WHERE program_id = ? AND status = 'pending'
    `, [collaboration.program_id]);
    
    // If no pending collaborations remain, check if any were accepted
    if (remainingCollaborations[0].count === 0) {
      // Check if there are any accepted collaborations
      const [acceptedCollaborations] = await db.execute(`
        SELECT COUNT(*) as count FROM program_collaborations 
        WHERE program_id = ? AND status = 'accepted'
      `, [collaboration.program_id]);
      
      if (acceptedCollaborations[0].count === 0) {
        // No accepted collaborations, mark program as declined
        await db.execute(`
          UPDATE programs_projects SET status = 'declined', is_approved = 0, is_collaborative = FALSE WHERE id = ?
        `, [collaboration.program_id]);
      } else {
        // Some collaborations were accepted, move to pending superadmin approval
        await db.execute(`
          UPDATE programs_projects SET status = 'pending_superadmin_approval', is_approved = 0 WHERE id = ?
        `, [collaboration.program_id]);
      }
    }
    
    // Notify the creator organization about the decline
    try {
      const NotificationController = (await import('./notificationController.js')).default;
      await NotificationController.createNotification({
        admin_id: collaboration.invited_by_admin_id,
        title: 'Collaboration Request Declined',
        message: `Your collaboration request for "${collaboration.program_title}" has been declined.`,
        type: 'collaboration_declined',
        related_id: collaboration.program_id
      });
    } catch (notificationError) {
      console.error('Failed to send decline notification:', notificationError);
      // Don't fail the main operation if notification fails
    }
    
    res.json({
      success: true,
      message: `Collaboration request for "${collaboration.program_title}" declined`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to decline collaboration request',
      error: error.message
    });
  }
};
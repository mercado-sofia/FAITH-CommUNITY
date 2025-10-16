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

    // Update program to mark as collaborative
    // The program status remains as 'Upcoming' until collaborators accept
    await db.execute(`
      UPDATE programs_projects SET is_collaborative = TRUE WHERE id = ?
    `, [programId]);

    // Notify collaborator about the collaboration request
    try {
      const NotificationController = (await import('./notificationController.js')).default;
      await NotificationController.createNotification(
        collaboratorAdminId,
        'collaboration_request',
        'New Collaboration Request',
        `You have received a collaboration request for "${program.title}". Please review and respond.`,
        'programs',
        programId
      );
    } catch (notificationError) {
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

    // Get collaboration details first with more comprehensive data
    const [collaborationRows] = await db.execute(`
      SELECT 
        pc.id, 
        pc.program_id, 
        pc.submission_id,
        pp.title as program_title,
        pp.organization_id as program_org_id,
        a.email as admin_email,
        o.orgName as admin_org_name
      FROM program_collaborations pc
      LEFT JOIN programs_projects pp ON pc.program_id = pp.id
      LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE pc.id = ? AND pc.collaborator_admin_id = ? AND pc.status IN ('accepted', 'pending')
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
      WHERE id = ? AND collaborator_admin_id = ? AND status IN ('accepted', 'pending')
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

    // Log the opt-out action for audit purposes
    try {
      const { logAuditEvent } = await import('../../utils/audit.js');
      await logAuditEvent({
        adminId: currentAdminId,
        action: 'COLLABORATION_OPT_OUT',
        details: {
          collaborationId: parseInt(collaborationId),
          programId: collaboration.program_id,
          programTitle: collaboration.program_title,
          adminEmail: collaboration.admin_email,
          adminOrg: collaboration.admin_org_name,
          remainingCollaborators: remainingCollaborations[0].count
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });
    } catch (auditError) {
      // Don't fail the opt-out if audit logging fails
    }

    res.json({
      success: true,
      message: `You have opted out of collaborating on "${collaboration.program_title}". The program will no longer appear in your programs list.`
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
    
    // Get all collaboration requests where the current admin is either creator or collaborator
    // This includes both pending submissions and existing programs
    // Also includes programs where the creator is waiting for responses from other admins
    const [allCollaborations] = await db.execute(`
      SELECT DISTINCT
        COALESCE(p.id, pc.submission_id) as program_id,
        COALESCE(p.title, pc.program_title) as program_title,
        COALESCE(p.description, JSON_EXTRACT(s.proposed_data, '$.description')) as program_description,
        COALESCE(p.status, 'pending_collaboration') as program_status,
        COALESCE(p.is_approved, 0) as is_approved,
        COALESCE(p.is_collaborative, 1) as is_collaborative,
        COALESCE(p.accepts_volunteers, JSON_EXTRACT(s.proposed_data, '$.accepts_volunteers'), 1) as accepts_volunteers,
        COALESCE(p.created_at, s.submitted_at) as program_created_at,
        COALESCE(p.image, JSON_EXTRACT(s.proposed_data, '$.image')) as program_image,
        COALESCE(p.category, JSON_EXTRACT(s.proposed_data, '$.category')) as program_category,
        COALESCE(p.event_start_date, JSON_EXTRACT(s.proposed_data, '$.event_start_date')) as event_start_date,
        COALESCE(p.event_end_date, JSON_EXTRACT(s.proposed_data, '$.event_end_date')) as event_end_date,
        COALESCE(p.slug, NULL) as program_slug,
        COALESCE(p.organization_id, s.organization_id) as program_org_id,
        -- Program organization details
        prog_org.orgName as program_org_name,
        prog_org.org as program_org_acronym,
        prog_org.logo as program_org_logo,
        pc.submission_id,
        s.status as submission_status,
        pc.id as collaboration_id,
        pc.status as collaboration_status
      FROM program_collaborations pc
      LEFT JOIN programs_projects p ON pc.program_id = p.id
      LEFT JOIN submissions s ON pc.submission_id = s.id
      LEFT JOIN organizations prog_org ON COALESCE(p.organization_id, s.organization_id) = prog_org.id
      WHERE (
        pc.collaborator_admin_id = ? 
        OR pc.invited_by_admin_id = ?
        OR COALESCE(p.organization_id, s.organization_id) = ?
      )
      AND pc.status IN ('pending', 'accepted', 'declined')
      ORDER BY COALESCE(p.created_at, s.submitted_at) DESC
    `, [currentAdminId, currentAdminId, adminOrgId]);
    
    // Found collaborative programs
    
    // Process each program to get collaboration details
    const processedCollaborations = await Promise.all(allCollaborations.map(async (program) => {
      // Get all collaboration records for this program/submission
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
        WHERE (pc.program_id = ? OR pc.submission_id = ?)
        ORDER BY pc.invited_at DESC
      `, [currentAdminId, currentAdminId, program.program_id, program.submission_id]);
      
      // Find the most relevant collaboration for this admin
      const relevantCollab = allCollaborators.find(c => 
        c.collaborator_admin_id == currentAdminId || c.invited_by_admin_id == currentAdminId
      ) || allCollaborators[0];
      
      // Use the collaboration data from the main query if available
      const mainCollab = {
        collaboration_id: program.collaboration_id,
        status: program.collaboration_status,
        request_type: relevantCollab?.request_type || (isCreator ? 'sent' : 'received')
      };
      
      // Processing program collaborators
      
      // Determine if this admin is the creator or collaborator
      const isCreator = program.program_org_id == adminOrgId;
      
      // Check if there are any pending collaboration requests for this program
      const hasPendingCollaborations = allCollaborators.some(c => c.status === 'pending');
      
      // Check if all collaborators have declined (making it a solo program)
      const allCollaboratorsDeclined = allCollaborators.length > 0 && allCollaborators.every(c => c.status === 'declined');
      
      // Determine if this program should be shown in collaborations tab
      // Show if: current admin is involved (but not if they opted out) OR there are pending collaborations OR not all have declined
      const currentAdminOptedOut = relevantCollab && relevantCollab.status === 'declined';
      const shouldShowInCollaborations = (
        (relevantCollab && !currentAdminOptedOut) || // Current admin is involved but hasn't opted out
        hasPendingCollaborations || // There are pending requests
        (!allCollaboratorsDeclined && allCollaborators.length > 0) // Not all have declined and there are collaborators
      );
      
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
        collaboration_id: mainCollab.collaboration_id || relevantCollab?.collaboration_id || null,
        status: mainCollab.status || relevantCollab?.status || 'pending',
        request_type: mainCollab.request_type || relevantCollab?.request_type || (isCreator ? 'sent' : 'received'),
        inviter_email: relevantCollab?.inviter_email || null,
        inviter_org_name: relevantCollab?.inviter_org_name || null,
        inviter_org_acronym: relevantCollab?.inviter_org_acronym || null,
        invitee_email: relevantCollab?.invitee_email || null,
        invitee_org_name: relevantCollab?.invitee_org_name || null,
        invitee_org_acronym: relevantCollab?.invitee_org_acronym || null,
        invited_at: relevantCollab?.invited_at || program.program_created_at,
        responded_at: relevantCollab?.responded_at || null,
        has_pending_collaborations: hasPendingCollaborations,
        all_collaborators_declined: allCollaboratorsDeclined,
        should_show_in_collaborations: shouldShowInCollaborations
      };
    }));
    
    // Filter to only show programs that should be displayed in collaborations tab
    const filteredCollaborations = processedCollaborations.filter(program => 
      program.should_show_in_collaborations
    );
    
    // Processed collaborations
    
    res.json({
      success: true,
      data: filteredCollaborations
    });
  } catch (error) {
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
    
    // Get collaboration details - check for both submission_id and program_id
    const [collaborationRows] = await db.execute(`
      SELECT pc.id, pc.submission_id, pc.program_id, pc.status, pc.program_title, pc.invited_by_admin_id,
             s.organization_id, s.proposed_data, s.submitted_by
      FROM program_collaborations pc
      LEFT JOIN submissions s ON pc.submission_id = s.id
      WHERE pc.id = ? AND pc.collaborator_admin_id = ? AND pc.status = 'pending'
    `, [collaborationId, currentAdminId]);
    
    if (collaborationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration request not found or already processed'
      });
    }
    
    const collaboration = collaborationRows[0];
    
    if (!collaboration.program_id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collaboration request - no program found'
      });
    }
    
    // Update collaboration status to accepted
    await db.execute(`
      UPDATE program_collaborations 
      SET status = 'accepted', responded_at = NOW()
      WHERE id = ? AND collaborator_admin_id = ?
    `, [collaborationId, currentAdminId]);
    
    // Check if all pending collaborations have been responded to for this program
    const [pendingCollaborations] = await db.execute(`
      SELECT COUNT(*) as count FROM program_collaborations 
      WHERE program_id = ? AND status = 'pending'
    `, [collaboration.program_id]);
    
    // If no pending collaborations remain, check if any were accepted
    if (pendingCollaborations[0].count === 0) {
      const [acceptedCollaborations] = await db.execute(`
        SELECT COUNT(*) as count FROM program_collaborations 
        WHERE program_id = ? AND status = 'accepted'
      `, [collaboration.program_id]);
      
      if (acceptedCollaborations[0].count > 0) {
        // Some collaborations were accepted, update program to show it's collaborative
        // The program already exists, just update its status
        await db.execute(`
          UPDATE programs_projects 
          SET is_collaborative = 1
          WHERE id = ?
        `, [collaboration.program_id]);
        
        // Notify the creator organization about the collaboration acceptance
        try {
          const NotificationController = (await import('./notificationController.js')).default;
          await NotificationController.createNotification(
            collaboration.invited_by_admin_id,
            'collaboration_accepted',
            'Collaboration Accepted',
            `Your collaboration request for "${collaboration.program_title}" has been accepted. The program is now marked as collaborative.`,
            'programs',
            collaboration.program_id
          );
        } catch (notificationError) {
        }
      } else {
        // No collaborations were accepted, update program to be non-collaborative (solo program)
        await db.execute(`
          UPDATE programs_projects 
          SET is_collaborative = 0
          WHERE id = ?
        `, [collaboration.program_id]);
      }
    }
    
    // Notify the creator organization about the acceptance
    try {
      const NotificationController = (await import('./notificationController.js')).default;
      await NotificationController.createNotification(
        collaboration.invited_by_admin_id,
        'collaboration_accepted',
        'Collaboration Request Accepted',
        `Your collaboration request for "${collaboration.program_title}" has been accepted.`,
        'programs',
        collaboration.submission_id
      );
    } catch (notificationError) {
    }
    
    res.json({
      success: true,
      message: `Collaboration request for "${collaboration.program_title}" accepted successfully.`
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
    
    // Get collaboration details - check for program_id
    const [collaborationRows] = await db.execute(`
      SELECT pc.id, pc.submission_id, pc.program_id, pc.status, pc.program_title, pc.invited_by_admin_id
      FROM program_collaborations pc
      WHERE pc.id = ? AND pc.collaborator_admin_id = ? AND pc.status = 'pending'
    `, [collaborationId, currentAdminId]);
    
    if (collaborationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration request not found or already processed'
      });
    }
    
    const collaboration = collaborationRows[0];
    
    if (!collaboration.program_id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collaboration request - no program found'
      });
    }
    
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
        // No accepted collaborations, update program to be non-collaborative (solo program)
        await db.execute(`
          UPDATE programs_projects 
          SET is_collaborative = 0
          WHERE id = ?
        `, [collaboration.program_id]);
      } else {
        // Some collaborations were accepted, keep program as collaborative
        await db.execute(`
          UPDATE programs_projects 
          SET is_collaborative = 1
          WHERE id = ?
        `, [collaboration.program_id]);
      }
    }
    
    // Notify the creator organization about the decline
    try {
      const NotificationController = (await import('./notificationController.js')).default;
      await NotificationController.createNotification(
        collaboration.invited_by_admin_id,
        'collaboration_declined',
        'Collaboration Request Declined',
        `Your collaboration request for "${collaboration.program_title}" has been declined. The program will remain as a solo program.`,
        'programs',
        collaboration.program_id
      );
    } catch (notificationError) {
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
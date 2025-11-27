import db from '../../database.js';
import NotificationController from './notificationController.js';
import { getClientIpAddress } from '../../utils/ipAddressHelper.js';

export const getAllAvailableAdmins = async (req, res) => {
  try {
    const currentAdminId = req.admin?.id || req.superadmin?.id;
    const [availableAdmins] = await db.execute(`
      SELECT u.id, u.email, o.orgName as organization_name, o.org as organization_acronym
      FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.role = 'admin' AND u.is_active = TRUE 
      AND u.id != ?
      ORDER BY o.orgName ASC, u.email ASC
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

export const getAvailableAdmins = async (req, res) => {
  try {
    const { programId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;
    let query, params;
    
    if (programId && programId !== 'null') {
      query = `
        SELECT u.id, u.email, o.orgName as organization_name, o.org as organization_acronym
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE u.role = 'admin' AND u.is_active = TRUE 
        AND u.id != ?
        AND u.id NOT IN (
          SELECT collaborator_admin_id 
          FROM program_collaborations 
          WHERE program_id = ? AND status IN ('accepted', 'declined')
        )
        ORDER BY o.orgName ASC, u.email ASC
      `;
      params = [currentAdminId, programId];
    } else {
      query = `
        SELECT u.id, u.email, o.orgName as organization_name, o.org as organization_acronym
        FROM users u
        LEFT JOIN organizations o ON u.organization_id = o.id
        WHERE u.role = 'admin' AND u.is_active = TRUE 
        AND u.id != ?
        ORDER BY o.orgName ASC, u.email ASC
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

export const inviteCollaborator = async (req, res) => {
  try {
    const { programId } = req.params;
    const { collaboratorAdminId } = req.body;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    const [programRows] = await db.execute(`
      SELECT p.id, p.title, p.organization_id, p.is_approved, u.organization_id as admin_org_id
      FROM programs_projects p
      LEFT JOIN users u ON u.id = ? AND u.role = 'admin'
      WHERE p.id = ? AND p.organization_id = u.organization_id AND p.is_approved = TRUE
    `, [currentAdminId, programId]);

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found or you do not have permission to invite collaborators'
      });
    }

    const program = programRows[0];
    
    const isProgramPosted = program.is_approved === 1;

    if (collaboratorAdminId === currentAdminId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as a collaborator'
      });
    }

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
      if (collaboration.status === 'pending') {
        return res.status(200).json({
          success: true,
          message: 'Collaboration invitation already pending',
          collaborationId: collaboration.id,
          status: 'pending'
        });
      }
    }

    const collaborationStatus = 'pending';

    const [result] = await db.execute(`
      INSERT INTO program_collaborations (program_id, collaborator_admin_id, invited_by_admin_id, status)
      VALUES (?, ?, ?, ?)
    `, [programId, collaboratorAdminId, currentAdminId, collaborationStatus]);

    // Update program to mark as collaborative
    await db.execute(`
      UPDATE programs_projects SET is_collaborative = TRUE WHERE id = ?
      `, [programId]);

    if (isProgramPosted) {
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
      }
    }

    res.status(201).json({
      success: true,
      message: isProgramPosted 
        ? 'Collaboration request sent successfully' 
        : 'Collaboration request will be sent after superadmin approval',
      collaborationId: result.insertId,
      status: collaborationStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to invite collaborator',
      error: error.message
    });
  }
};

export const getProgramCollaborators = async (req, res) => {
  try {
    const { programId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    const [programRows] = await db.execute(`
      SELECT p.id, p.title, p.organization_id, p.is_approved
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = ? AND p.is_approved = TRUE 
      AND o.status = 'ACTIVE'
      AND (
        p.organization_id = (SELECT organization_id FROM users WHERE id = ? AND role = 'admin')
        OR p.id IN (SELECT program_id FROM program_collaborations WHERE collaborator_admin_id = ? AND status = 'accepted' AND program_id IS NOT NULL)
      )
    `, [programId, currentAdminId, currentAdminId]);

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found or you do not have access'
      });
    }

    const [collaborators] = await db.execute(`
      SELECT 
        pc.id,
        pc.status,
        pc.invited_at,
        pc.responded_at,
        u.id as admin_id,
        u.email,
        o.orgName as organization_name,
        o.org as organization_acronym
      FROM program_collaborations pc
      LEFT JOIN users u ON pc.collaborator_admin_id = u.id AND u.role = 'admin'
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE pc.program_id = ?
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

export const removeCollaborator = async (req, res) => {
  try {
    const { programId, adminId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    const [programRows] = await db.execute(`
      SELECT id, title, organization_id 
      FROM programs_projects 
      WHERE id = ? AND organization_id = (
        SELECT organization_id FROM users WHERE id = ? AND role = 'admin'
      )
    `, [programId, currentAdminId]);

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found or you do not have permission to remove collaborators'
      });
    }

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

    const [remainingCollaborations] = await db.execute(`
      SELECT COUNT(*) as count FROM program_collaborations 
      WHERE program_id = ? AND status = 'accepted'
      `, [programId]);

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

export const optOutCollaboration = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    const [collaborationRows] = await db.execute(`
      SELECT 
        pc.id, 
        pc.program_id, 
        pc.submission_id,
        pp.title as program_title,
        pp.organization_id as program_org_id,
        u.email as admin_email,
        o.orgName as admin_org_name
      FROM program_collaborations pc
      LEFT JOIN programs_projects pp ON pc.program_id = pp.id
      LEFT JOIN users u ON pc.collaborator_admin_id = u.id AND u.role = 'admin'
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE pc.id = ? AND pc.collaborator_admin_id = ? AND pc.status IN ('accepted', 'pending')
    `, [collaborationId, currentAdminId]);

    if (collaborationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active collaboration not found'
      });
    }

    const collaboration = collaborationRows[0];

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

    const [remainingCollaborations] = await db.execute(`
      SELECT COUNT(*) as count FROM program_collaborations 
      WHERE program_id = ? AND status = 'accepted'
      `, [collaboration.program_id]);

    if (remainingCollaborations[0].count === 0) {
      await db.execute(`
        UPDATE programs_projects SET is_collaborative = FALSE WHERE id = ?
      `, [collaboration.program_id]);
    }

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
        ipAddress: getClientIpAddress(req),
        userAgent: req.get('User-Agent')
      });
    } catch (auditError) {
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

export const getCollaborationRequests = async (req, res) => {
  try {
    const currentAdminId = req.admin?.id || req.superadmin?.id;
    
    const [adminRows] = await db.execute(`
      SELECT organization_id, email FROM users WHERE id = ? AND role = 'admin'
    `, [currentAdminId]);
    
    if (adminRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    const adminOrgId = adminRows[0].organization_id;
    
    const [allCollaborations] = await db.execute(`
      SELECT DISTINCT
        p.id as program_id,
        p.title as program_title,
        p.description as program_description,
        p.status as program_status,
        p.is_approved as is_approved,
        p.is_collaborative as is_collaborative,
        p.accepts_volunteers as accepts_volunteers,
        p.created_at as program_created_at,
        p.image as program_image,
        p.category as program_category,
        p.event_start_date as event_start_date,
        p.event_end_date as event_end_date,
        p.slug as program_slug,
        p.organization_id as program_org_id,
        -- Program organization details
        prog_org.orgName as program_org_name,
        prog_org.org as program_org_acronym,
        prog_org.logo as program_org_logo,
        -- Inviter details
        inviter.id as inviter_admin_id,
        inviter.email as inviter_email,
        inviter_org.orgName as inviter_org_name,
        inviter_org.org as inviter_org_acronym,
        inviter_org.logo as inviter_org_logo,
        -- Invitee details
        invitee.id as invitee_admin_id,
        invitee.email as invitee_email,
        invitee_org.orgName as invitee_org_name,
        invitee_org.org as invitee_org_acronym,
        invitee_org.logo as invitee_org_logo,
        pc.submission_id,
        s.status as submission_status,
        pc.id as collaboration_id,
        pc.status as collaboration_status,
        pc.invited_at,
        pc.responded_at,
        -- Determine request type
        CASE 
          WHEN pc.collaborator_admin_id = ? THEN 'received'
          WHEN pc.invited_by_admin_id = ? THEN 'sent'
          ELSE 'unknown'
        END as request_type
      FROM program_collaborations pc
      INNER JOIN programs_projects p ON pc.program_id = p.id
      LEFT JOIN submissions s ON pc.submission_id = s.id
      LEFT JOIN organizations prog_org ON p.organization_id = prog_org.id
      LEFT JOIN users inviter ON pc.invited_by_admin_id = inviter.id AND inviter.role = 'admin'
      LEFT JOIN organizations inviter_org ON inviter.organization_id = inviter_org.id
      LEFT JOIN users invitee ON pc.collaborator_admin_id = invitee.id AND invitee.role = 'admin'
      LEFT JOIN organizations invitee_org ON invitee.organization_id = invitee_org.id
      WHERE (
        pc.collaborator_admin_id = ? 
        OR pc.invited_by_admin_id = ?
        OR p.organization_id = ?
      )
      AND pc.status IN ('pending', 'accepted', 'declined')
      -- CRITICAL: Only show collaboration requests for APPROVED programs
      -- Collaborators must NOT see requests until superadmin approves the program
      AND p.is_approved = TRUE
      -- CRITICAL: Only show collaborations where program organization is active
      AND prog_org.status = 'ACTIVE'
      ORDER BY p.created_at DESC
    `, [currentAdminId, currentAdminId, currentAdminId, currentAdminId, adminOrgId]);
    
    const processedCollaborations = await Promise.all(allCollaborations.map(async (program) => {
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
          inviter_org.logo as inviter_org_logo,
          invitee.email as invitee_email,
          invitee_org.orgName as invitee_org_name,
          invitee_org.org as invitee_org_acronym,
          invitee_org.logo as invitee_org_logo,
          CASE 
            WHEN pc.collaborator_admin_id = ? THEN 'received'
            WHEN pc.invited_by_admin_id = ? THEN 'sent'
            ELSE 'unknown'
          END as request_type
        FROM program_collaborations pc
        LEFT JOIN users inviter ON pc.invited_by_admin_id = inviter.id AND inviter.role = 'admin'
        LEFT JOIN organizations inviter_org ON inviter.organization_id = inviter_org.id
        LEFT JOIN users invitee ON pc.collaborator_admin_id = invitee.id AND invitee.role = 'admin'
        LEFT JOIN organizations invitee_org ON invitee.organization_id = invitee_org.id
        WHERE (pc.program_id = ? OR pc.submission_id = ?)
        ORDER BY pc.invited_at DESC
      `, [currentAdminId, currentAdminId, program.program_id, program.submission_id]);
      
      const relevantCollab = allCollaborators.find(c => 
        c.collaborator_admin_id == currentAdminId || c.invited_by_admin_id == currentAdminId
      ) || allCollaborators[0];
      
      const mainCollab = {
        collaboration_id: program.collaboration_id,
        status: program.collaboration_status,
        request_type: relevantCollab?.request_type || (isCreator ? 'sent' : 'received')
      };
      
      const isCreator = program.program_org_id == adminOrgId;
      
      const hasPendingCollaborations = allCollaborators.some(c => c.status === 'pending');
      
      const allCollaboratorsDeclined = allCollaborators.length > 0 && allCollaborators.every(c => c.status === 'declined');
      
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
          inviter_org_logo: c.inviter_org_logo,
          invitee_id: c.collaborator_admin_id,
          invitee_email: c.invitee_email,
          invitee_org_name: c.invitee_org_name,
          invitee_org_acronym: c.invitee_org_acronym,
          invitee_org_logo: c.invitee_org_logo,
          request_type: c.request_type
        })),
        collaboration_id: mainCollab.collaboration_id || relevantCollab?.collaboration_id || null,
        status: mainCollab.status || relevantCollab?.status || 'pending',
        request_type: mainCollab.request_type || relevantCollab?.request_type || (isCreator ? 'sent' : 'received'),
        inviter_email: relevantCollab?.inviter_email || program.inviter_email || null,
        inviter_org_name: relevantCollab?.inviter_org_name || program.inviter_org_name || null,
        inviter_org_acronym: relevantCollab?.inviter_org_acronym || program.inviter_org_acronym || null,
        inviter_org_logo: relevantCollab?.inviter_org_logo || program.inviter_org_logo || null,
        invitee_email: relevantCollab?.invitee_email || program.invitee_email || null,
        invitee_org_name: relevantCollab?.invitee_org_name || program.invitee_org_name || null,
        invitee_org_acronym: relevantCollab?.invitee_org_acronym || program.invitee_org_acronym || null,
        invitee_org_logo: relevantCollab?.invitee_org_logo || program.invitee_org_logo || null,
        invited_at: relevantCollab?.invited_at || program.program_created_at,
        responded_at: relevantCollab?.responded_at || null,
        has_pending_collaborations: hasPendingCollaborations,
        all_collaborators_declined: allCollaboratorsDeclined,
        should_show_in_collaborations: shouldShowInCollaborations
      };
    }));
    
    const filteredCollaborations = processedCollaborations.filter(program => 
      program.should_show_in_collaborations
    );
    
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
    
    const [collaborationRows] = await db.execute(`
      SELECT pc.id, pc.submission_id, pc.program_id, pc.status, pc.program_title, pc.invited_by_admin_id,
             p.is_approved as program_is_approved
      FROM program_collaborations pc
      LEFT JOIN programs_projects p ON pc.program_id = p.id
      WHERE pc.id = ? AND pc.collaborator_admin_id = ? AND pc.status = 'pending'
      AND pc.program_id IS NOT NULL
      AND p.is_approved = TRUE
    `, [collaborationId, currentAdminId]);
    
    if (collaborationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration request not found, already processed, or program not yet approved by superadmin'
      });
    }
    
    const collaboration = collaborationRows[0];
    
    if (!collaboration.program_id || !collaboration.program_is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Cannot accept collaboration request. The program must be approved by superadmin first.'
      });
    }
    
    await db.execute(`
      UPDATE program_collaborations 
      SET status = 'accepted', responded_at = NOW()
      WHERE id = ? AND collaborator_admin_id = ?
    `, [collaborationId, currentAdminId]);
    
    // PROGRAM-BASED WORKFLOW: Program already exists and is approved, just update collaborative status
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
        // The program already exists and is approved, just update its status
        await db.execute(`
          UPDATE programs_projects 
          SET is_collaborative = TRUE
          WHERE id = ?
        `, [collaboration.program_id]);
      } else {
        // No collaborations were accepted, update program to be non-collaborative (solo program)
        await db.execute(`
          UPDATE programs_projects 
          SET is_collaborative = FALSE
          WHERE id = ?
        `, [collaboration.program_id]);
      }
    }
    
    try {
      const NotificationController = (await import('./notificationController.js')).default;
      await NotificationController.createNotification(
        collaboration.invited_by_admin_id,
        'collaboration_accepted',
        'Collaboration Request Accepted',
        `Your collaboration request for "${collaboration.program_title}" has been accepted.`,
        'programs',
        collaboration.program_id
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

export const declineCollaborationRequest = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;
    
    if (!collaborationId) {
      return res.status(400).json({
        success: false,
        message: 'Collaboration ID is required'
      });
    }
    
    const [collaborationRows] = await db.execute(`
      SELECT pc.id, pc.submission_id, pc.program_id, pc.status, pc.program_title, pc.invited_by_admin_id,
             p.is_approved as program_is_approved
      FROM program_collaborations pc
      LEFT JOIN programs_projects p ON pc.program_id = p.id
      WHERE pc.id = ? AND pc.collaborator_admin_id = ? AND pc.status = 'pending'
      AND pc.program_id IS NOT NULL
      AND p.is_approved = TRUE
    `, [collaborationId, currentAdminId]);
    
    if (collaborationRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Collaboration request not found, already processed, or program not yet approved by superadmin'
      });
    }
    
    const collaboration = collaborationRows[0];
    
    if (!collaboration.program_id || !collaboration.program_is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Cannot decline collaboration request. The program must be approved by superadmin first.'
      });
    }
    
    await db.execute(`
      UPDATE program_collaborations 
      SET status = 'declined', responded_at = NOW()
      WHERE id = ? AND collaborator_admin_id = ?
    `, [collaborationId, currentAdminId]);
    
    // PROGRAM-BASED WORKFLOW: Program already exists and is approved, just update collaborative status
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
        // The program already exists and is approved, just update its status
        await db.execute(`
          UPDATE programs_projects 
          SET is_collaborative = TRUE
          WHERE id = ?
        `, [collaboration.program_id]);
      } else {
        // No collaborations were accepted, update program to be non-collaborative (solo program)
        await db.execute(`
          UPDATE programs_projects 
          SET is_collaborative = FALSE
          WHERE id = ?
        `, [collaboration.program_id]);
      }
    }
    
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
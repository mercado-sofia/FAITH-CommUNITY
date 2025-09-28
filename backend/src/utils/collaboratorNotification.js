// Utility function to notify collaborators when a program is approved
import db from '../database.js';
import NotificationController from '../admin/controllers/notificationController.js';

/**
 * Notifies all collaborators of a program when it gets approved
 * @param {number} programId - The ID of the approved program
 * @param {string} programTitle - The title of the approved program
 * @returns {Promise<{success: boolean, notifiedCount: number, errors: string[]}>}
 */
export const notifyCollaboratorsOnApproval = async (programId, programTitle) => {
  try {
    console.log(`🔍 Looking for collaborators for program ID: ${programId}, title: "${programTitle}"`);
    
    // Get all collaborators for this program
    const [collaborators] = await db.execute(`
      SELECT pc.collaborator_admin_id, a.email, a.first_name, a.last_name
      FROM program_collaborations pc
      LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
      WHERE pc.program_id = ? AND pc.status = 'accepted'
    `, [programId]);

    console.log(`📋 Found ${collaborators.length} collaborators:`, collaborators);

    if (collaborators.length === 0) {
      console.log('⚠️ No collaborators found for this program');
      return {
        success: true,
        notifiedCount: 0,
        errors: []
      };
    }

    let notifiedCount = 0;
    const errors = [];

    // Notify each collaborator
    for (const collaborator of collaborators) {
      try {
        console.log(`📤 Sending notification to collaborator ${collaborator.collaborator_admin_id} (${collaborator.email})`);
        const result = await NotificationController.createNotification(
          collaborator.collaborator_admin_id,
          'program_approval',
          'Program Approved - Collaboration Active',
          `The program "${programTitle}" you're collaborating on has been approved and is now live. You can now view and manage this program.`,
          'programs',
          programId
        );
        console.log(`✅ Notification result for ${collaborator.collaborator_admin_id}:`, result);
        notifiedCount++;
      } catch (notificationError) {
        console.error(`❌ Failed to send approval notification to collaborator ${collaborator.collaborator_admin_id}:`, notificationError);
        errors.push(`Failed to notify collaborator ${collaborator.email || collaborator.collaborator_admin_id}: ${notificationError.message}`);
      }
    }

    console.log(`📊 Notification summary: ${notifiedCount} sent, ${errors.length} failed`);
    
    return {
      success: true,
      notifiedCount,
      errors
    };
  } catch (error) {
    console.error('Error notifying collaborators on program approval:', error);
    return {
      success: false,
      notifiedCount: 0,
      errors: [error.message]
    };
  }
};

/**
 * Notifies collaborators when they are added to a program (for immediate addition scenarios)
 * This should only be used when the program is already approved
 * @param {number} programId - The ID of the program
 * @param {string} programTitle - The title of the program
 * @param {number} collaboratorId - The ID of the collaborator to notify
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const notifyCollaboratorOnAddition = async (programId, programTitle, collaboratorId) => {
  try {
    // Check if the program is already approved
    const [programRows] = await db.execute(
      'SELECT is_approved FROM programs_projects WHERE id = ?',
      [programId]
    );

    if (programRows.length === 0) {
      return {
        success: false,
        error: 'Program not found'
      };
    }

    const program = programRows[0];

    // Only notify if the program is already approved
    if (program.is_approved) {
      await NotificationController.createNotification(
        collaboratorId,
        'collaboration',
        'Added as Program Collaborator',
        `You've been added as a collaborator on "${programTitle}". You can now view and manage this program. If you don't want to participate, you can opt out from the program details.`,
        'programs',
        programId
      );
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Error notifying collaborator on addition:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
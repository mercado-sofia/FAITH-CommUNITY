// Utility script to create missing notifications for existing program submissions
import db from '../database.js';
import SuperAdminNotificationController from '../superadmin/controllers/superadminNotificationController.js';

export const createMissingNotifications = async () => {
  try {

    // Get superadmin ID
    const [superadminRows] = await db.execute("SELECT id FROM superadmin LIMIT 1");
    if (superadminRows.length === 0) {
      return;
    }
    const superadminId = superadminRows[0].id;

    // Get all pending program submissions
    const [programSubmissions] = await db.execute(`
      SELECT s.*, o.org as orgAcronym, o.id as organizationId
      FROM submissions s
      LEFT JOIN organizations o ON s.organization_id = o.id
      WHERE s.section = 'programs' AND s.status = 'pending'
      ORDER BY s.submitted_at DESC
    `);


    // Check which ones already have notifications
    const submissionIds = programSubmissions.map(s => s.id);
    if (submissionIds.length === 0) {
      return;
    }

    const placeholders = submissionIds.map(() => '?').join(',');
    const [existingNotifications] = await db.execute(`
      SELECT submission_id FROM superadmin_notifications 
      WHERE submission_id IN (${placeholders}) AND section = 'programs'
    `, submissionIds);

    const existingSubmissionIds = new Set(existingNotifications.map(n => n.submission_id));

    // Create notifications for missing submissions
    let createdCount = 0;
    for (const submission of programSubmissions) {
      if (!existingSubmissionIds.has(submission.id)) {
        try {
          // Parse proposed data to get program title
          const proposedData = JSON.parse(submission.proposed_data);
          const programTitle = proposedData.title || 'Untitled Program';
          
          const title = 'New Program Submission';
          const message = `${submission.orgAcronym || 'Unknown'} has submitted a new program "${programTitle}" for approval.`;

          await SuperAdminNotificationController.createNotification(
            superadminId,
            'approval_request',
            title,
            message,
            'programs',
            submission.id,
            submission.organizationId  // Pass organization_id instead of acronym
          );

          createdCount++;
        } catch (error) {
          console.error(`Failed to create notification for submission ${submission.id}:`, error.message);
        }
      }
    }

  } catch (error) {
    console.error('Error creating missing notifications:', error);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createMissingNotifications().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

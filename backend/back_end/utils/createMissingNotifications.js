// Utility script to create missing notifications for existing program submissions
import db from '../database.js';
import SuperAdminNotificationController from '../superadmin/controllers/superadminNotificationController.js';

export const createMissingNotifications = async () => {
  try {
    console.log('🔍 Checking for missing notifications...');

    // Get superadmin ID
    const [superadminRows] = await db.execute("SELECT id FROM superadmin LIMIT 1");
    if (superadminRows.length === 0) {
      console.log('❌ No superadmin found');
      return;
    }
    const superadminId = superadminRows[0].id;
    console.log('✅ Found superadmin ID:', superadminId);

    // Get all pending program submissions
    const [programSubmissions] = await db.execute(`
      SELECT s.*, a.org as orgAcronym
      FROM submissions s
      LEFT JOIN admins a ON s.organization_id = a.organization_id
      WHERE s.section = 'programs' AND s.status = 'pending'
      ORDER BY s.submitted_at DESC
    `);

    console.log(`📋 Found ${programSubmissions.length} pending program submissions`);

    // Check which ones already have notifications
    const submissionIds = programSubmissions.map(s => s.id);
    if (submissionIds.length === 0) {
      console.log('✅ No program submissions to process');
      return;
    }

    const placeholders = submissionIds.map(() => '?').join(',');
    const [existingNotifications] = await db.execute(`
      SELECT submission_id FROM superadmin_notifications 
      WHERE submission_id IN (${placeholders}) AND section = 'programs'
    `, submissionIds);

    const existingSubmissionIds = new Set(existingNotifications.map(n => n.submission_id));
    console.log(`📊 Found ${existingNotifications.length} existing notifications for program submissions`);

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
            submission.orgAcronym || 'Unknown'
          );

          createdCount++;
          console.log(`✅ Created notification for submission ${submission.id}: "${programTitle}"`);
        } catch (error) {
          console.error(`❌ Failed to create notification for submission ${submission.id}:`, error.message);
        }
      }
    }

    console.log(`🎉 Created ${createdCount} missing notifications for program submissions`);
  } catch (error) {
    console.error('❌ Error creating missing notifications:', error);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createMissingNotifications().then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

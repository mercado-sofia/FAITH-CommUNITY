import db from '../../database.js';
import { S3_FOLDERS } from '../../utils/s3Config.js';
import SuperAdminNotificationController from '../../superadmin/controllers/superadminNotificationController.js';

// Admin upload Post Act Report for a program
export const uploadPostActReport = async (req, res) => {
  const { id } = req.params; // program id

  if (!id) {
    return res.status(400).json({ success: false, message: 'Program ID is required' });
  }

  try {
    // Validate file presence first (fail fast)
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Validate program exists and is approved (published)
    const [rows] = await db.execute(
      'SELECT id, title, status, organization_id FROM programs_projects WHERE id = ? AND is_approved = TRUE',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Program not found or not approved' });
    }

    // Prevent duplicate pending submissions for the same program
    const [existingPending] = await db.execute(
      `SELECT id FROM program_post_act_reports WHERE program_id = ? AND status = 'pending' LIMIT 1`,
      [id]
    );
    
    if (existingPending.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A Post Act Report is already pending for this program.'
      });
    }

    // Upload file to S3 with dedicated folder
    // S3 handles all file types (images, PDFs, DOC, DOCX) with proper content-type headers
    const { uploadSingleToS3 } = await import('../../utils/s3Upload.js');

    // Upload to Post Act Reports folder - supports mixed file types (images, PDFs, DOC, DOCX)
    // S3 automatically sets correct Content-Type based on file mimetype
    const uploadResult = await uploadSingleToS3(
      req.file,
      S3_FOLDERS.PROGRAMS.POST_ACT,
      { 
        prefix: 'post_act_'
      }
    );

    // Create pending report record
    const [reportResult] = await db.execute(
      `INSERT INTO program_post_act_reports (program_id, file_public_id, file_url, status, uploaded_by_admin_id)
       VALUES (?, ?, ?, 'pending', ?)`,
      [id, uploadResult.public_id, uploadResult.url, req.admin?.id || null]
    );

    const reportId = reportResult.insertId;

    // Also record in submissions so admins can track/cancel/delete from Submissions page
    try {
      await db.execute(
        `INSERT INTO submissions (organization_id, section, previous_data, proposed_data, submitted_by, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          rows[0].organization_id,
          'Post Act Report',
          JSON.stringify({}),
          JSON.stringify({ program_id: Number(id), report_id: reportId, file_url: uploadResult.url, file_public_id: uploadResult.public_id }),
          req.admin?.id || null
        ]
      );
    } catch (e) {
      // Non-fatal: submissions table may not exist or section not whitelisted
    }

    // Notify superadmin about the new post act report submission
    try {
      const [superadminRows] = await db.execute('SELECT id FROM superadmin LIMIT 1');
      const superadminId = superadminRows.length > 0 ? superadminRows[0].id : null;
      if (superadminId) {
        // Get organization acronym for message context
        const [orgRows] = await db.execute('SELECT org, orgName FROM organizations WHERE id = ? LIMIT 1', [rows[0].organization_id]);
        const orgAcronym = orgRows.length ? orgRows[0].org : 'Unknown Org';

        await SuperAdminNotificationController.createNotification(
          superadminId,
          'approval_request',
          'Post Act Report Submitted',
          `${orgAcronym} submitted a Post Act Report for program "${rows[0].title}".`,
          'post_act_report',
          null,
          rows[0].organization_id
        );
      }
    } catch (notifErr) {
      // Non-fatal: notification failure should not block upload
    }

    return res.json({
      success: true,
      message: 'Post Act Report uploaded and submitted for superadmin approval',
      data: {
        program_id: Number(id),
        file_public_id: uploadResult.public_id,
        file_url: uploadResult.url,
        status: 'pending'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to upload Post Act Report', error: error.message });
  }
};



import db from '../../database.js';
import NotificationController from '../../admin/controllers/notificationController.js';

// List pending Post Act Reports
export const listPendingPostActReports = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT r.id, r.program_id, r.file_public_id, r.file_url, r.status, r.created_at, 
              p.title as program_title, p.organization_id
         FROM program_post_act_reports r
         JOIN programs_projects p ON p.id = r.program_id
        WHERE r.status = 'pending'
        ORDER BY r.created_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch Post Act Reports', error: error.message });
  }
};

// Approve a Post Act Report and mark program Completed
export const approvePostActReport = async (req, res) => {
  const { reportId } = req.params;
  if (!reportId) return res.status(400).json({ success: false, message: 'reportId is required' });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT r.id, r.program_id, r.status FROM program_post_act_reports r WHERE r.id = ? FOR UPDATE`,
      [reportId]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const report = rows[0];
    if (report.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Report is not pending' });
    }

    await connection.execute(
      `UPDATE program_post_act_reports SET status = 'approved', reviewed_by_superadmin_id = ?, reviewed_at = NOW() WHERE id = ?`,
      [req.superadmin?.id || null, reportId]
    );

    await connection.execute(
      `UPDATE programs_projects SET status = 'Completed', manual_status_override = TRUE WHERE id = ?`,
      [report.program_id]
    );

    await connection.commit();
    // Notify all admins of the owning organization
    try {
      const [orgAdmins] = await db.execute(
        `SELECT a.id FROM admins a 
          JOIN programs_projects p ON p.organization_id = a.organization_id 
         WHERE p.id = ?`,
        [report.program_id]
      );
      for (const row of orgAdmins) {
        await NotificationController.createNotification(
          row.id,
          'approval',
          'Post Act Report Approved',
          'Your Post Act Report was approved. The program is now marked as Completed.',
          'programs',
          null
        );
      }
    } catch {}
    return res.json({ success: true, message: 'Report approved and program marked as Completed' });
  } catch (error) {
    try { await connection.rollback(); } catch {}
    return res.status(500).json({ success: false, message: 'Failed to approve report', error: error.message });
  } finally {
    connection.release();
  }
};

// Reject a Post Act Report (optionally with note), program remains not Completed
export const rejectPostActReport = async (req, res) => {
  const { reportId } = req.params;
  const { note } = req.body || {};
  if (!reportId) return res.status(400).json({ success: false, message: 'reportId is required' });

  try {
    const [result] = await db.execute(
      `UPDATE program_post_act_reports 
          SET status = 'rejected', review_note = ?, reviewed_by_superadmin_id = ?, reviewed_at = NOW()
        WHERE id = ? AND status = 'pending'`,
      [note || null, req.superadmin?.id || null, reportId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'Report not found or not pending' });
    }

    // Notify admins of rejection
    try {
      const [rows] = await db.execute(`SELECT program_id FROM program_post_act_reports WHERE id = ?`, [reportId]);
      if (rows.length) {
        const programId = rows[0].program_id;
        const [orgAdmins] = await db.execute(
          `SELECT a.id FROM admins a 
            JOIN programs_projects p ON p.organization_id = a.organization_id 
           WHERE p.id = ?`,
          [programId]
        );
        for (const row of orgAdmins) {
          await NotificationController.createNotification(
            row.id,
            'decline',
            'Post Act Report Rejected',
            'Your Post Act Report was rejected. Please review the note and re-upload.',
            'programs',
            null
          );
        }
      }
    } catch {}
    return res.json({ success: true, message: 'Report rejected' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reject report', error: error.message });
  }
};



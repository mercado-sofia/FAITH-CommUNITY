import db from '../../database.js';

export const getPendingSubmissions = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.*, o.orgName, o.org, a.orgName as submitted_by_name 
      FROM submissions s 
      LEFT JOIN organizations o ON s.organization_id = o.id 
      LEFT JOIN admins a ON s.submitted_by = a.id 
      WHERE s.status = 'pending' 
      ORDER BY s.submitted_at DESC
    `);

    // Parse JSON data for each submission
    const submissions = rows.map(submission => {
      try {
        return {
          ...submission,
          previous_data: JSON.parse(submission.previous_data || '{}'),
          proposed_data: JSON.parse(submission.proposed_data || '{}')
        };
      } catch (parseError) {
        console.error('JSON parse error for submission:', submission.id, parseError);
        return {
          ...submission,
          previous_data: {},
          proposed_data: {}
        };
      }
    });

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('❌ Error fetching pending submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending submissions',
      error: error.message
    });
  }
};

export const approveSubmission = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute('SELECT * FROM submissions WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Submission not found' });

    const submission = rows[0];
    const data = JSON.parse(submission.proposed_data);
    const section = submission.section;
    const orgId = submission.organization_id;

    // Apply changes based on section
    if (section === 'organization') {
      await db.execute(
        `UPDATE organizations SET orgName = ?, org = ?, logo = ?, facebook = ?, email = ?, description = ? WHERE id = ?`,
        [data.orgName, data.org, data.logo, data.facebook, data.email, data.description, orgId]
      );
    }

    if (section === 'advocacy') {
      // Check if advocacy record exists
      const [existingAdvocacy] = await db.execute(
        'SELECT id FROM advocacies WHERE organization_id = ?',
        [orgId]
      );
      
      // For advocacy, data is already a string from the parsed JSON
      const advocacyData = typeof data === 'string' ? data : JSON.stringify(data);
      
      if (existingAdvocacy.length > 0) {
        // Update existing record
        await db.execute(
          'UPDATE advocacies SET advocacy = ? WHERE organization_id = ?',
          [advocacyData, orgId]
        );
      } else {
        // Insert new record
        await db.execute(
          'INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)',
          [orgId, advocacyData]
        );
      }
    }

    if (section === 'competency') {
      // Check if competency record exists
      const [existingCompetency] = await db.execute(
        'SELECT id FROM competencies WHERE organization_id = ?',
        [orgId]
      );
      
      // For competency, data is already a string from the parsed JSON
      const competencyData = typeof data === 'string' ? data : JSON.stringify(data);
      
      if (existingCompetency.length > 0) {
        // Update existing record
        await db.execute(
          'UPDATE competencies SET competency = ? WHERE organization_id = ?',
          [competencyData, orgId]
        );
      } else {
        // Insert new record
        await db.execute(
          'INSERT INTO competencies (organization_id, competency) VALUES (?, ?)',
          [orgId, competencyData]
        );
      }
    }

    if (section === 'org_heads') {
      await db.execute(`DELETE FROM organization_heads WHERE organization_id = ?`, [orgId]);
      for (let head of data) {
        await db.execute(
          `INSERT INTO organization_heads (organization_id, head_name, role, facebook, email, photo)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orgId, head.name, head.position, head.facebook, head.email, head.photo]
        );
      }
    }

    if (section === 'programs') {
      console.log('[DEBUG] Approving program submission:', {
        orgId,
        submissionId: id,
        programData: data
      });
      
      // Insert new program into programs_projects table with automatic publication date
      const currentDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      try {
        await db.execute(
          `INSERT INTO programs_projects (organization_id, title, description, category, status, image)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            orgId,
            data.title,
            data.description,
            data.category,
            data.status,
            data.image
          ]
        );
        console.log('[DEBUG] Program successfully inserted into programs_projects table');
      } catch (insertError) {
        console.error('[ERROR] Failed to insert program into programs_projects:', insertError);
        throw insertError;
      }
    }

    await db.execute(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Submission approved and applied.' });
  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).json({ success: false, message: 'Failed to apply submission', error: err.message });
  }
};

export const rejectSubmission = async (req, res) => {
  const { id } = req.params;
  const { rejection_comment } = req.body;

  try {
    // Check if submission exists and is pending
    const [rows] = await db.execute('SELECT * FROM submissions WHERE id = ? AND status = "pending"', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found or already processed' 
      });
    }

    // Update submission status to rejected
    await db.execute(
      'UPDATE submissions SET status = "rejected", rejection_comment = ?, updated_at = NOW() WHERE id = ?',
      [rejection_comment || 'No reason provided', id]
    );

    res.json({ 
      success: true, 
      message: 'Submission rejected successfully' 
    });
  } catch (err) {
    console.error('Rejection error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reject submission', 
      error: err.message 
    });
  }
};
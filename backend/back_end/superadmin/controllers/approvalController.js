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
        `UPDATE organizations SET orgName = ?, org = ?, logo = ?, facebook = ?, description = ? WHERE id = ?`,
        [data.orgName, data.org, data.logo, data.facebook, data.description, orgId]
      );
    }

    if (section === 'advocacy') {
      // Check if advocacy record exists
      const [existingAdvocacy] = await db.execute(
        'SELECT id FROM advocacies WHERE organization_id = ?',
        [orgId]
      );
      
      // For advocacy, data is already a string from the parsed JSON
      const advocacyData = typeof data === 'string' ? data.trim() : JSON.stringify(data).trim();
      
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
      const competencyData = typeof data === 'string' ? data.trim() : JSON.stringify(data).trim();
      
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
      
      try {
        // Insert new program into programs_projects table
        const [result] = await db.execute(
          `INSERT INTO programs_projects (organization_id, title, description, category, status, image, event_start_date, event_end_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orgId,
            data.title,
            data.description,
            data.category,
            data.status,
            data.image,
            data.event_start_date || null,
            data.event_end_date || null
          ]
        );
        
        const programId = result.insertId;
        console.log('[DEBUG] Program successfully inserted into programs_projects table with ID:', programId);
        
        // If multiple dates are provided, insert them into program_event_dates table
        if (data.multiple_dates && Array.isArray(data.multiple_dates) && data.multiple_dates.length > 0) {
          console.log('[DEBUG] Inserting multiple dates for program:', data.multiple_dates);
          
          for (const date of data.multiple_dates) {
            await db.execute(
              `INSERT INTO program_event_dates (program_id, event_date) VALUES (?, ?)`,
              [programId, date]
            );
          }
          console.log('[DEBUG] Multiple dates successfully inserted into program_event_dates table');
        }
        
      } catch (insertError) {
        console.error('[ERROR] Failed to insert program into programs_projects:', insertError);
        throw insertError;
      }
    }

    if (section === 'news') {
      console.log('[DEBUG] Approving news submission:', {
        orgId,
        submissionId: id,
        newsData: data
      });
      
      // Insert new news into news table
      try {
        await db.execute(
          `INSERT INTO news (organization_id, title, description, date)
           VALUES (?, ?, ?, ?)`,
          [
            orgId,
            data.title,
            data.description,
            data.date || new Date().toISOString().split('T')[0]
          ]
        );
        console.log('[DEBUG] News successfully inserted into news table');
      } catch (insertError) {
        console.error('[ERROR] Failed to insert news into news table:', insertError);
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

// Bulk approve submissions
export const bulkApproveSubmissions = async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No submission IDs provided'
    });
  }

  try {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        const [rows] = await db.execute('SELECT * FROM submissions WHERE id = ?', [id]);
        
        if (rows.length === 0) {
          errors.push(`Submission ${id} not found`);
          errorCount++;
          continue;
        }

        const submission = rows[0];
        
        if (submission.status !== 'pending') {
          errors.push(`Submission ${id} is not pending`);
          errorCount++;
          continue;
        }

        const proposedData = JSON.parse(submission.proposed_data || '{}');

        // Apply the changes to the organizations table
        const updateFields = [];
        const updateValues = [];

        Object.keys(proposedData).forEach(key => {
          if (proposedData[key] !== null && proposedData[key] !== undefined) {
            updateFields.push(`${key} = ?`);
            updateValues.push(proposedData[key]);
          }
        });

        if (updateFields.length > 0) {
          updateValues.push(submission.organization_id);
          const updateQuery = `UPDATE organizations SET ${updateFields.join(', ')} WHERE id = ?`;
          await db.execute(updateQuery, updateValues);
        }

        // Update submission status
        await db.execute(
          'UPDATE submissions SET status = ?, approved_at = NOW() WHERE id = ?',
          ['approved', id]
        );

        successCount++;
      } catch (error) {
        console.error(`Error approving submission ${id}:`, error);
        errors.push(`Failed to approve submission ${id}: ${error.message}`);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Bulk approval completed: ${successCount} approved, ${errorCount} failed`,
      details: {
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('❌ Bulk approve error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk approve submissions',
      error: error.message
    });
  }
};

// Bulk reject submissions
export const bulkRejectSubmissions = async (req, res) => {
  const { ids, rejection_comment } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No submission IDs provided'
    });
  }

  try {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        const [rows] = await db.execute('SELECT * FROM submissions WHERE id = ?', [id]);
        
        if (rows.length === 0) {
          errors.push(`Submission ${id} not found`);
          errorCount++;
          continue;
        }

        const submission = rows[0];
        
        if (submission.status !== 'pending') {
          errors.push(`Submission ${id} is not pending`);
          errorCount++;
          continue;
        }

        // Update submission status to rejected
        await db.execute(
          'UPDATE submissions SET status = ?, rejected_at = NOW(), rejection_comment = ? WHERE id = ?',
          ['rejected', rejection_comment || '', id]
        );

        successCount++;
      } catch (error) {
        console.error(`Error rejecting submission ${id}:`, error);
        errors.push(`Failed to reject submission ${id}: ${error.message}`);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Bulk rejection completed: ${successCount} rejected, ${errorCount} failed`,
      details: {
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('❌ Bulk reject error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk reject submissions',
      error: error.message
    });
  }
};

// Bulk delete submissions
export const bulkDeleteSubmissions = async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No submission IDs provided'
    });
  }

  try {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        const [result] = await db.execute('DELETE FROM submissions WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
          errors.push(`Submission ${id} not found or already deleted`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error deleting submission ${id}:`, error);
        errors.push(`Failed to delete submission ${id}: ${error.message}`);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `Bulk deletion completed: ${successCount} deleted, ${errorCount} failed`,
      details: {
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error('❌ Bulk delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete submissions',
      error: error.message
    });
  }
};
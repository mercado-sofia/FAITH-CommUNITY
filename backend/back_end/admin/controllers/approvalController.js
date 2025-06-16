//db table: pending_organization_updates
import db from '../../database.js';

// ✅ 1. Submit proposed update (by admin)
export const submitOrgUpdate = async (req, res) => {
  const { organization_id, section, previous, proposed, submitted_by } = req.body;
  const conn = await db.getConnection();

  try {
    // Validate required fields
    if (!organization_id || !section || !previous || !proposed) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: { organization_id, section }
      });
    }

    // Validate organization exists
    const [[org]] = await conn.execute(
      'SELECT id FROM organizations WHERE id = ?',
      [organization_id]
    );

    if (!org) {
      conn.release();
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Convert objects to JSON strings if they aren't already
    let previousJson, proposedJson;
    try {
      previousJson = typeof previous === 'string' ? previous : JSON.stringify(previous);
      proposedJson = typeof proposed === 'string' ? proposed : JSON.stringify(proposed);

      // Validate JSON by parsing it
      JSON.parse(previousJson);
      JSON.parse(proposedJson);
    } catch (e) {
      conn.release();
      return res.status(400).json({ 
        error: 'Invalid JSON data in previous or proposed fields',
        details: e.message
      });
    }

    // Begin transaction
    await conn.beginTransaction();

    try {
      // Insert the update request
      const [result] = await conn.execute(
        `INSERT INTO pending_organization_updates 
         (organization_id, section, previous, proposed, status, submitted_by) 
         VALUES (?, ?, ?, ?, 'pending', ?)`,
        [organization_id, section, previousJson, proposedJson, submitted_by || 1]
      );

      // Also insert into submissions table for tracking
      await conn.execute(
        `INSERT INTO submissions 
         (organization_id, section, previous_data, proposed_data, status, submitted_by) 
         VALUES (?, ?, ?, ?, 'pending', ?)`,
        [organization_id, section, previousJson, proposedJson, submitted_by || 1]
      );

      await conn.commit();
      
      res.status(201).json({ 
        message: 'Update submitted for approval',
        id: result.insertId
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error submitting update:', error);
    res.status(500).json({ 
      error: 'Failed to submit update',
      details: error.message
    });
  } finally {
    if (conn) conn.release();
  }
};

// ✅ 2. View all pending updates (superadmin)
export const getPendingUpdates = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
         u.*, 
         o.name AS organization_name, 
         a.org_name AS submitted_by_name,
         a.email AS submitted_by_email
       FROM pending_organization_updates u
       JOIN organizations o ON u.organization_id = o.id
       JOIN admins a ON u.submitted_by = a.id
       WHERE u.status = 'pending'
       ORDER BY u.submitted_at DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error('Error getting pending updates:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ 3. Approve or reject a proposed update
export const actOnUpdate = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  try {
    const [[update]] = await db.execute(
      `SELECT * FROM pending_organization_updates WHERE id = ?`, [id]
    );

    if (!update) {
      return res.status(404).json({ message: 'Update not found' });
    }

    const data = JSON.parse(update.proposed);

    if (action === 'approve') {
      switch (update.section) {
        case 'organization_details':
          // Update main organization details
          await db.execute(
            `UPDATE organizations 
             SET name = ?, acronym = ?, description = ?, facebook = ?, email = ?, logo = ? 
             WHERE id = ?`,
            [
              data.name || '',
              data.acronym || '',
              data.description || '',
              data.facebook || '',
              data.email || '',
              data.logo || '',
              update.organization_id
            ]
          );

          // Update advocacies
          await db.execute(`DELETE FROM advocacies WHERE organization_id = ?`, [update.organization_id]);
          if (Array.isArray(data.advocacies)) {
            for (let advocacy of data.advocacies) {
              if (advocacy) {
                await db.execute(
                  `INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)`,
                  [update.organization_id, advocacy]
                );
              }
            }
          }

          // Update competencies
          await db.execute(`DELETE FROM competencies WHERE organization_id = ?`, [update.organization_id]);
          if (Array.isArray(data.competencies)) {
            for (let competency of data.competencies) {
              if (competency) {
                await db.execute(
                  `INSERT INTO competencies (organization_id, competency) VALUES (?, ?)`,
                  [update.organization_id, competency]
                );
              }
            }
          }

          // Update organization heads
          await db.execute(`DELETE FROM organization_heads WHERE organization_id = ?`, [update.organization_id]);
          if (Array.isArray(data.heads)) {
            for (let head of data.heads) {
              if (head && head.name) {
                await db.execute(
                  `INSERT INTO organization_heads (organization_id, name, role, facebook, email, photo) 
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    update.organization_id,
                    head.name || '',
                    head.role || '',
                    head.facebook || '',
                    head.email || '',
                    head.photo || ''
                  ]
                );
              }
            }
          }
          break;

        case 'description':
        case 'email':
        case 'facebook':
        case 'logo':
          await db.execute(
            `UPDATE organizations SET ${update.section} = ? WHERE id = ?`,
            [data, update.organization_id]
          );
          break;

        case 'advocacy':
          await db.execute(`DELETE FROM advocacies WHERE organization_id = ?`, [update.organization_id]);
          for (let item of data) {
            await db.execute(`INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)`, [update.organization_id, item]);
          }
          break;

        case 'competency':
          await db.execute(`DELETE FROM competencies WHERE organization_id = ?`, [update.organization_id]);
          for (let item of data) {
            await db.execute(`INSERT INTO competencies (organization_id, competency) VALUES (?, ?)`, [update.organization_id, item]);
          }
          break;

        case 'head':
          await db.execute(`DELETE FROM organization_heads WHERE organization_id = ?`, [update.organization_id]);
          for (let head of data) {
            await db.execute(
              `INSERT INTO organization_heads (organization_id, name, role, facebook, email, photo) VALUES (?, ?, ?, ?, ?, ?)`,
              [update.organization_id, head.name, head.role, head.facebook, head.email, head.photo]
            );
          }
          break;

        case 'project':
          await db.execute(`DELETE FROM featured_projects WHERE organization_id = ?`, [update.organization_id]);
          for (let proj of data) {
            await db.execute(
              `INSERT INTO featured_projects (organization_id, title, description, image) VALUES (?, ?, ?, ?)`,
              [update.organization_id, proj.title, proj.description, proj.image]
            );
          }
          break;

        default:
          return res.status(400).json({ message: 'Invalid update section' });
      }

      await db.execute(`UPDATE pending_organization_updates SET status = 'approved' WHERE id = ?`, [id]);
      return res.json({ message: `Approved update for section: ${update.section}` });

    } else if (action === 'reject') {
      await db.execute(
        `UPDATE pending_organization_updates SET status = 'rejected' WHERE id = ?`,
        [id]
      );
      return res.json({ message: 'Update rejected' });
    }

    res.status(400).json({ message: 'Invalid action' });

  } catch (error) {
    console.error('Error processing update action:', error);
    res.status(500).json({ error: error.message });
  }
};
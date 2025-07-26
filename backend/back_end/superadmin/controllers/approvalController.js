import db from '../../database.js';

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
      await db.execute(
        `UPDATE advocacies SET advocacy = ? WHERE organization_id = ?`,
        [data[0].description, orgId]
      );
    }

    if (section === 'competency') {
      await db.execute(
        `UPDATE competencies SET competency = ? WHERE organization_id = ?`,
        [data[0].description, orgId]
      );
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

    await db.execute(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id]);
    res.json({ message: 'Submission approved and applied.' });
  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).json({ message: 'Failed to apply submission', error: err.message });
  }
};
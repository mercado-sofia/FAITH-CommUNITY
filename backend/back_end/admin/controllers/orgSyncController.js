import db from '../../database.js';

export const syncOrganizationsFromAdmins = async (req, res) => {
  try {
    await db.execute(`
      INSERT INTO organizations (org, orgName, description)
      SELECT org, orgName, NULL
      FROM admins
      WHERE status = 'ACTIVE'
    `);

    res.status(200).json({ message: 'Organizations synced from active admins (email not synced - Single Source of Truth).' });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync organizations' });
  }
};

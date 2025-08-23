//db table: organizations

import db from '../../database.js';

export const syncOrganizationsFromAdmins = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get all active admins that don't have an organization_id
    const [adminsWithoutOrg] = await connection.execute(`
      SELECT id, org, orgName 
      FROM admins 
      WHERE status = 'ACTIVE' AND organization_id IS NULL
    `);

    let createdCount = 0;
    let updatedCount = 0;

    for (const admin of adminsWithoutOrg) {
      // Check if organization already exists
      const [existingOrg] = await connection.execute(
        'SELECT id FROM organizations WHERE org = ?',
        [admin.org]
      );

      if (existingOrg.length === 0) {
        // Create new organization
        const [orgResult] = await connection.execute(
          'INSERT INTO organizations (org, orgName, status, org_color) VALUES (?, ?, "ACTIVE", "#444444")',
          [admin.org, admin.orgName]
        );

        // Update admin with organization_id
        await connection.execute(
          'UPDATE admins SET organization_id = ? WHERE id = ?',
          [orgResult.insertId, admin.id]
        );

        createdCount++;
      } else {
        // Organization exists, just link the admin
        await connection.execute(
          'UPDATE admins SET organization_id = ? WHERE id = ?',
          [existingOrg[0].id, admin.id]
        );

        updatedCount++;
      }
    }

    await connection.commit();

    res.status(200).json({ 
      message: `Organizations synced from active admins. Created: ${createdCount}, Updated: ${updatedCount}`,
      created: createdCount,
      updated: updatedCount
    });
  } catch (err) {
    await connection.rollback();
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Failed to sync organizations' });
  } finally {
    connection.release();
  }
};

import db from '../../database.js';

export const getAllOrganizations = async (req, res) => {
  try {
    // Fetch organizations from admins table where admin accounts exist
    const [rows] = await db.execute(`
      SELECT DISTINCT org as acronym, org as id, orgName as name 
      FROM admins 
      WHERE org IS NOT NULL AND org != '' 
      ORDER BY org ASC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('❌ Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organizations',
      error: error.message
    });
  }
};

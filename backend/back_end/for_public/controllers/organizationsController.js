import db from '../../database.js';

export const getAllOrganizations = async (req, res) => {
  try {
    // Fetch organizations from organizations table
    const [rows] = await db.execute(`
      SELECT id, org as acronym, orgName as name, logo 
      FROM organizations 
      WHERE org IS NOT NULL AND org != '' AND orgName IS NOT NULL
      ORDER BY org ASC
    `);

    // Format the data for the frontend
    const formattedData = rows.map(row => ({
      id: row.id, // Use numeric ID for proper integration with news
      acronym: row.acronym, // Organization acronym for display
      name: row.name, // Full organization name for tooltips
      logo: row.logo || `/logo/${row.acronym.toLowerCase()}_logo.jpg` // Fallback to expected logo path
    }));

    res.json({
      success: true,
      data: formattedData
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

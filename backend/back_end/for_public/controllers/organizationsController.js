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
    const formattedData = rows.map(row => {
      let logoUrl;
      if (row.logo) {
        // If logo is stored as a filename, construct the proper URL
        if (row.logo.includes('/')) {
          // Legacy path - extract filename
          const filename = row.logo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${row.logo}`;
        }
      } else {
        // Fallback to expected logo path
        logoUrl = `/logo/${row.acronym.toLowerCase()}_logo.jpg`;
      }
      
      return {
        id: row.id, // Use numeric ID for proper integration with news
        acronym: row.acronym, // Organization acronym for display
        name: row.name, // Full organization name for tooltips
        logo: logoUrl
      };
    });

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

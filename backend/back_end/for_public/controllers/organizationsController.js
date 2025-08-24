import db from '../../database.js';

export const getAllOrganizations = async (req, res) => {
  try {
    // Fetch organizations from admins table since org and orgName are now there
    const [rows] = await db.execute(`
      SELECT DISTINCT 
        o.id, 
        a.org as acronym, 
        a.orgName as name, 
        o.logo 
      FROM organizations o
      INNER JOIN admins a ON a.organization_id = o.id
      WHERE a.org IS NOT NULL AND a.org != '' AND a.orgName IS NOT NULL AND a.status = 'ACTIVE'
      ORDER BY a.org ASC
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

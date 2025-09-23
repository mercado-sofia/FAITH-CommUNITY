//db table: organizations
import db from '../../database.js';
import { getOrganizationLogoUrl } from '../../utils/imageUrlUtils.js';

export const getAllOrganizations = async (req, res) => {
  try {
    // Fetch organizations from organizations table where org and orgName are now stored
    const [rows] = await db.execute(`
      SELECT 
        o.id, 
        o.org as acronym, 
        o.orgName as name, 
        o.logo 
      FROM organizations o
      WHERE o.org IS NOT NULL AND o.org != '' AND o.orgName IS NOT NULL AND o.status = 'ACTIVE'
      ORDER BY o.org ASC
    `);

    // Format the data for the frontend
    const formattedData = rows.map(row => {
      let logoUrl;
      if (row.logo) {
        // If logo is stored as a filename, construct the proper URL
        logoUrl = getOrganizationLogoUrl(row.logo);
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

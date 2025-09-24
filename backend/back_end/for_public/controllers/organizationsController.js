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

// Get hero section data for public interface
export const getHeroSection = async (req, res) => {
  try {
    // Get main hero section data
    const [heroRows] = await db.query('SELECT * FROM hero_section ORDER BY id DESC LIMIT 1');
    
    // Get hero section images
    const [imageRows] = await db.query('SELECT * FROM hero_section_images ORDER BY display_order ASC');
    
    if (heroRows.length === 0) {
      // Return default data if no hero section exists
      return res.json({
        success: true,
        data: {
          tag: 'Welcome to FAITH CommUNITY',
          heading: 'A Unified Platform for Community Extension Programs',
          video_url: null,
          video_link: null,
          video_type: 'upload',
          images: [
            { id: 1, url: null, heading: 'Inside the Initiative', subheading: 'Where Ideas Take Root' },
            { id: 2, url: null, heading: 'Collaboration', subheading: 'Working Together' },
            { id: 3, url: null, heading: 'Innovation', subheading: 'Building the Future' }
          ]
        }
      });
    }

    const heroData = heroRows[0];
    
    // Format images data to match frontend expectations
    const images = imageRows.map(row => ({
      id: row.image_id,
      url: row.image_url,
      heading: row.heading,
      subheading: row.subheading
    }));

    res.json({
      success: true,
      data: {
        tag: heroData.tag,
        heading: heroData.heading,
        video_url: heroData.video_url,
        video_link: heroData.video_link,
        video_type: heroData.video_type,
        images: images
      }
    });
  } catch (error) {
    console.error('❌ Error fetching hero section:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hero section data',
      error: error.message
    });
  }
};
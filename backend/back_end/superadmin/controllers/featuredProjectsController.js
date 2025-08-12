const db = require('../../db/database');

// Get all featured projects with organization details
const getAllFeaturedProjects = async (req, res) => {
  try {
    const query = `
      SELECT 
        fp.id,
        fp.organization_id,
        fp.title,
        fp.description,
        fp.image,
        fp.status,
        fp.date_created,
        fp.date_completed,
        fp.created_at,
        fp.updated_at,
        o.acronym as org_acronym,
        o.orgName as org_name,
        o.logo as org_logo
      FROM featured_projects fp
      LEFT JOIN organizations o ON fp.organization_id = o.id
      ORDER BY fp.created_at DESC
    `;
    
    const [results] = await db.execute(query);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching featured projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured projects',
      error: error.message
    });
  }
};

// Get featured project by ID
const getFeaturedProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        fp.id,
        fp.organization_id,
        fp.title,
        fp.description,
        fp.image,
        fp.status,
        fp.date_created,
        fp.date_completed,
        fp.created_at,
        fp.updated_at,
        o.acronym as org_acronym,
        o.orgName as org_name,
        o.logo as org_logo
      FROM featured_projects fp
      LEFT JOIN organizations o ON fp.organization_id = o.id
      WHERE fp.id = ?
    `;
    
    const [results] = await db.execute(query, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Featured project not found'
      });
    }
    
    res.json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    console.error('Error fetching featured project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured project',
      error: error.message
    });
  }
};

module.exports = {
  getAllFeaturedProjects,
  getFeaturedProjectById
};
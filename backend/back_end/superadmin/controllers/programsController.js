import db from '../../database.js';

// Get all programs grouped by organization for superadmin
export const getAllProgramsByOrganization = async (req, res) => {
  try {
    const query = `
      SELECT 
        pp.id,
        pp.title,
        pp.description,
        pp.category,
        pp.status,
        pp.image,
        pp.date_created,
        pp.date_completed,
        pp.created_at,
        pp.updated_at,
        pp.organization_id,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as organization_logo
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      ORDER BY o.orgName ASC, pp.created_at DESC
    `;
    
    const [results] = await db.execute(query);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching programs by organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs by organization',
      error: error.message
    });
  }
};

// Get programs statistics for superadmin dashboard
export const getProgramsStatistics = async (req, res) => {
  try {
    const statisticsQuery = `
      SELECT 
        COUNT(*) as total_programs,
        SUM(CASE WHEN LOWER(status) = 'upcoming' THEN 1 ELSE 0 END) as upcoming_programs,
        SUM(CASE WHEN LOWER(status) = 'active' THEN 1 ELSE 0 END) as active_programs,
        SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed_programs,
        COUNT(DISTINCT organization_id) as total_organizations
      FROM programs_projects
    `;
    
    const [results] = await db.execute(statisticsQuery);
    
    res.json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    console.error('Error fetching programs statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs statistics',
      error: error.message
    });
  }
};

// Get program by ID with organization details
export const getProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        pp.id,
        pp.title,
        pp.description,
        pp.category,
        pp.status,
        pp.image,
        pp.date_created,
        pp.date_completed,
        pp.created_at,
        pp.updated_at,
        pp.organization_id,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as organization_logo
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      WHERE pp.id = ?
    `;
    
    const [results] = await db.execute(query, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }
    
    res.json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    console.error('Error fetching program by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch program',
      error: error.message
    });
  }
};

// Get programs by organization ID
export const getProgramsByOrganizationId = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const query = `
      SELECT 
        pp.id,
        pp.title,
        pp.description,
        pp.category,
        pp.status,
        pp.image,
        pp.date_created,
        pp.date_completed,
        pp.created_at,
        pp.updated_at,
        pp.organization_id,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as organization_logo
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      WHERE pp.organization_id = ?
      ORDER BY pp.created_at DESC
    `;
    
    const [results] = await db.execute(query, [orgId]);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching programs by organization ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs by organization',
      error: error.message
    });
  }
};

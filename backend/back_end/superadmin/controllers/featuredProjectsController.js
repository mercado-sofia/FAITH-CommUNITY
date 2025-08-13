import db from "../../database.js";

// Get all featured projects with organization and program details
const getAllFeaturedProjects = async (req, res) => {
  try {
    const query = `
      SELECT 
        fp.id,
        fp.program_id,
        fp.organization_id,
        fp.title,
        fp.description,
        fp.image,
        fp.status,
        fp.completed_date,
        fp.created_at,
        o.org as org_acronym,
        o.orgName as org_name,
        o.logo as org_logo,
        o.org_color as org_color,
        pp.title as program_title,
        pp.category as program_category,
        pp.image as program_image
      FROM featured_projects fp
      LEFT JOIN organizations o ON fp.organization_id = o.id
      LEFT JOIN programs_projects pp ON fp.program_id = pp.id
      ORDER BY fp.id DESC
    `;
    
    const [results] = await db.execute(query);
    
    // Transform results to construct proper logo URLs
    const transformedResults = results.map(project => {
      let logoUrl;
      if (project.org_logo) {
        if (project.org_logo.includes('/')) {
          // Legacy path - extract filename
          const filename = project.org_logo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${project.org_logo}`;
        }
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        ...project,
        org_logo: logoUrl
      };
    });
    
    console.log('Featured projects query results:', {
      count: transformedResults.length,
      firstResult: transformedResults[0] || null,
      hasCreatedAt: transformedResults[0] ? 'created_at' in transformedResults[0] : false
    });
    
    res.json({
      success: true,
      data: transformedResults
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
        fp.program_id,
        fp.organization_id,
        fp.title,
        fp.description,
        fp.image,
        fp.status,
        fp.completed_date,
        fp.created_at,
        o.org as org_acronym,
        o.orgName as org_name,
        o.logo as org_logo,
        pp.title as program_title,
        pp.category as program_category,
        pp.image as program_image
      FROM featured_projects fp
      LEFT JOIN organizations o ON fp.organization_id = o.id
      LEFT JOIN programs_projects pp ON fp.program_id = pp.id
      WHERE fp.id = ?
    `;
    
    const [results] = await db.execute(query, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Featured project not found'
      });
    }
    
    // Transform result to construct proper logo URL
    const project = results[0];
    let logoUrl;
    if (project.org_logo) {
      if (project.org_logo.includes('/')) {
        // Legacy path - extract filename
        const filename = project.org_logo.split('/').pop();
        logoUrl = `/uploads/organizations/logos/${filename}`;
      } else {
        // New structure - direct filename
        logoUrl = `/uploads/organizations/logos/${project.org_logo}`;
      }
    } else {
      // Fallback to default logo
      logoUrl = `/logo/faith_community_logo.png`;
    }
    
    const transformedProject = {
      ...project,
      org_logo: logoUrl
    };
    
    res.json({
      success: true,
      data: transformedProject
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

// Add program to featured projects
const addFeaturedProject = async (req, res) => {
  try {
    const { programId } = req.body;
    
    // First, get program details
    const programQuery = `
      SELECT pp.*, o.id as org_id, o.org, o.orgName 
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      WHERE pp.id = ?
    `;
    
    const [programResults] = await db.execute(programQuery, [programId]);
    
    if (programResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found'
      });
    }
    
    const program = programResults[0];
    
    // Debug: Log the program data being copied
    console.log('addFeaturedProject - Program data:', {
      id: program.id,
      title: program.title,
      hasImage: !!program.image,
      imageType: program.image ? (program.image.startsWith('data:') ? 'base64' : 'file') : 'none',
      imageLength: program.image ? program.image.length : 0,
      imagePreview: program.image ? program.image.substring(0, 100) + '...' : null
    });
    
    // Check if already featured
    const checkQuery = 'SELECT id FROM featured_projects WHERE program_id = ?';
    const [existing] = await db.execute(checkQuery, [programId]);
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Program is already featured'
      });
    }
    
    // Add to featured projects
    const insertQuery = `
      INSERT INTO featured_projects (program_id, organization_id, title, description, image, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.execute(insertQuery, [
      programId,
      program.org_id,
      program.title,
      program.description,
      program.image,
      program.status
    ]);
    
    res.json({
      success: true,
      message: 'Program added to featured projects',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error adding featured project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add featured project',
      error: error.message
    });
  }
};

// Remove program from featured projects
const removeFeaturedProject = async (req, res) => {
  try {
    const { programId } = req.params;
    
    const deleteQuery = 'DELETE FROM featured_projects WHERE program_id = ?';
    const [result] = await db.execute(deleteQuery, [programId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Featured project not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Program removed from featured projects'
    });
  } catch (error) {
    console.error('Error removing featured project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove featured project',
      error: error.message
    });
  }
};

// Check if program is featured
const checkFeaturedStatus = async (req, res) => {
  try {
    const { programId } = req.params;
    
    const query = 'SELECT id FROM featured_projects WHERE program_id = ?';
    const [results] = await db.execute(query, [programId]);
    
    res.json({
      success: true,
      isFeatured: results.length > 0
    });
  } catch (error) {
    console.error('Error checking featured status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check featured status',
      error: error.message
    });
  }
};

export {
  getAllFeaturedProjects,
  getFeaturedProjectById,
  addFeaturedProject,
  removeFeaturedProject,
  checkFeaturedStatus
};
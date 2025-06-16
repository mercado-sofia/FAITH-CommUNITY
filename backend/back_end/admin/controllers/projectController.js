//db table: featured_projects
import db from '../../database.js';
import path from 'path';
import fs from 'fs';

export const addProject = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const { organization_id, title, description, status, completed_date } = req.body;
    let image = '';

    // If a file was uploaded, use its filename
    if (req.file) {
      image = req.file.filename;
    }

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Insert into database
    await db.execute(
      `INSERT INTO featured_projects (organization_id, title, description, image, status, completed_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [organization_id || 1, title, description, image, status || 'active', completed_date || null]
    );

    res.json({ message: 'Project added successfully' });
  } catch (error) {
    console.error('Error adding project:', error);
    res.status(500).json({ 
      error: 'Failed to add project',
      details: error.message,
      code: error.code
    });
  }
};

export const getProjects = async (req, res) => {
  const { organization_id } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT * FROM featured_projects WHERE organization_id = ?`,
      [organization_id]
    );
    
    // Transform image paths to full URLs
    const projectsWithUrls = rows.map(project => ({
      ...project,
      image: project.image ? `http://localhost:8080/uploads/${project.image}` : null
    }));
    
    res.json(projectsWithUrls);
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve projects',
      details: error.message
    });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT * FROM featured_projects`);
    
    // Transform image paths to full URLs
    const projectsWithUrls = rows.map(project => ({
      ...project,
      image: project.image ? `http://localhost:8080/uploads/${project.image}` : null
    }));
    
    res.json(projectsWithUrls);
  } catch (error) {
    console.error('Error getting all projects:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve projects',
      details: error.message
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_id, title, description, status, completed_date, existing_image } = req.body;
    let image;

    // If a new file was uploaded, use its filename
    if (req.file) {
      image = req.file.filename;
      // Delete old image if it exists
      if (existing_image) {
        const oldImagePath = path.join(process.cwd(), 'uploads', existing_image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else {
      // If no new file was uploaded, keep the existing image
      image = existing_image || null;
    }
    
    await db.execute(
      `UPDATE featured_projects 
       SET organization_id = ?, title = ?, description = ?, image = ?, status = ?, completed_date = ?
       WHERE id = ?`,
      [organization_id || 1, title, description, image, status, completed_date || null, id]
    );
    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ 
      error: 'Failed to update project',
      details: error.message
    });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the project to find its image
    const [project] = await db.execute('SELECT image FROM featured_projects WHERE id = ?', [id]);
    
    // Delete the image file if it exists
    if (project[0]?.image) {
      const imagePath = path.join(process.cwd(), 'uploads', project[0].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await db.execute('DELETE FROM featured_projects WHERE id = ?', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ 
      error: 'Failed to delete project',
      details: error.message
    });
  }
};
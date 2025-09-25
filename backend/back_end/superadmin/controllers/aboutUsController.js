import db from '../../database.js';

// Get about us content
export const getAboutUs = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'About us content not found' 
      });
    }

    // Parse JSON fields
    const aboutUsData = {
      ...rows[0],
      extension_categories: rows[0].extension_categories ? JSON.parse(rows[0].extension_categories) : []
    };

    res.json({
      success: true,
      data: aboutUsData
    });
  } catch (error) {
    console.error('Error fetching about us content:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch about us content' 
    });
  }
};

// Update about us content
export const updateAboutUs = async (req, res) => {
  try {
    const { heading, description, extension_categories } = req.body;

    // Validate required fields
    if (!heading || heading.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Heading is required' 
      });
    }

    if (!description || description.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Description is required' 
      });
    }

    // Validate extension categories
    if (!extension_categories || !Array.isArray(extension_categories) || extension_categories.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one extension category is required' 
      });
    }

    // Validate each extension category
    for (const category of extension_categories) {
      if (!category.name || category.name.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'Extension category name is required' 
        });
      }
    }

    // Check if about us record exists
    const [existingRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    let result;
    if (existingRows.length === 0) {
      // Create new about us record
      [result] = await db.query(
        'INSERT INTO about_us (heading, description, extension_categories) VALUES (?, ?, ?)',
        [heading.trim(), description.trim(), JSON.stringify(extension_categories)]
      );
    } else {
      // Update existing about us record
      [result] = await db.query(
        'UPDATE about_us SET heading = ?, description = ?, extension_categories = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [heading.trim(), description.trim(), JSON.stringify(extension_categories), existingRows[0].id]
      );
    }

    // Fetch updated about us data
    const [updatedRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    // Parse JSON fields
    const aboutUsData = {
      ...updatedRows[0],
      extension_categories: updatedRows[0].extension_categories ? JSON.parse(updatedRows[0].extension_categories) : []
    };

    res.json({
      success: true,
      message: 'About us content updated successfully',
      data: aboutUsData
    });
  } catch (error) {
    console.error('Error updating about us content:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update about us content' 
    });
  }
};

// Add extension category
export const addExtensionCategory = async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Extension category name is required' 
      });
    }

    // Get current about us data
    const [existingRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'About us content not found' 
      });
    }

    // Parse existing extension categories
    const currentCategories = existingRows[0].extension_categories ? 
      JSON.parse(existingRows[0].extension_categories) : [];

    // Check if category already exists
    const categoryExists = currentCategories.some(cat => 
      cat.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (categoryExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Extension category already exists' 
      });
    }

    // Add new category
    const newCategory = {
      name: name.trim(),
      color: color || 'green'
    };

    currentCategories.push(newCategory);

    // Update database
    await db.query(
      'UPDATE about_us SET extension_categories = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(currentCategories), existingRows[0].id]
    );

    // Fetch updated data
    const [updatedRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    const aboutUsData = {
      ...updatedRows[0],
      extension_categories: updatedRows[0].extension_categories ? JSON.parse(updatedRows[0].extension_categories) : []
    };

    res.json({
      success: true,
      message: 'Extension category added successfully',
      data: aboutUsData
    });
  } catch (error) {
    console.error('Error adding extension category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add extension category' 
    });
  }
};

// Update extension category
export const updateExtensionCategory = async (req, res) => {
  try {
    const { categoryIndex } = req.params;
    const { name, color } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Extension category name is required' 
      });
    }

    const index = parseInt(categoryIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid category index' 
      });
    }

    // Get current about us data
    const [existingRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'About us content not found' 
      });
    }

    // Parse existing extension categories
    const currentCategories = existingRows[0].extension_categories ? 
      JSON.parse(existingRows[0].extension_categories) : [];

    if (index >= currentCategories.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category index out of range' 
      });
    }

    // Update category
    currentCategories[index] = {
      name: name.trim(),
      color: color || currentCategories[index].color
    };

    // Update database
    await db.query(
      'UPDATE about_us SET extension_categories = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(currentCategories), existingRows[0].id]
    );

    // Fetch updated data
    const [updatedRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    const aboutUsData = {
      ...updatedRows[0],
      extension_categories: updatedRows[0].extension_categories ? JSON.parse(updatedRows[0].extension_categories) : []
    };

    res.json({
      success: true,
      message: 'Extension category updated successfully',
      data: aboutUsData
    });
  } catch (error) {
    console.error('Error updating extension category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update extension category' 
    });
  }
};

// Delete extension category
export const deleteExtensionCategory = async (req, res) => {
  try {
    const { categoryIndex } = req.params;

    const index = parseInt(categoryIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid category index' 
      });
    }

    // Get current about us data
    const [existingRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'About us content not found' 
      });
    }

    // Parse existing extension categories
    const currentCategories = existingRows[0].extension_categories ? 
      JSON.parse(existingRows[0].extension_categories) : [];

    if (index >= currentCategories.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category index out of range' 
      });
    }

    if (currentCategories.length <= 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete the last extension category' 
      });
    }

    // Remove category
    currentCategories.splice(index, 1);

    // Update database
    await db.query(
      'UPDATE about_us SET extension_categories = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(currentCategories), existingRows[0].id]
    );

    // Fetch updated data
    const [updatedRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    const aboutUsData = {
      ...updatedRows[0],
      extension_categories: updatedRows[0].extension_categories ? JSON.parse(updatedRows[0].extension_categories) : []
    };

    res.json({
      success: true,
      message: 'Extension category deleted successfully',
      data: aboutUsData
    });
  } catch (error) {
    console.error('Error deleting extension category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete extension category' 
    });
  }
};

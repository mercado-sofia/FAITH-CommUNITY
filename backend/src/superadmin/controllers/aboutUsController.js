import db from '../../database.js';
import { uploadSingleToCloudinary } from '../../utils/cloudinaryUpload.js';
import { deleteFromCloudinary, extractPublicIdFromUrl } from '../../utils/cloudinaryConfig.js';

// Helper: typeCast already parses JSON columns, so check if it's already an object
const safeParseJSON = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value; // Already parsed by typeCast
  if (typeof value === 'string') return JSON.parse(value); // Still a string, parse it
  return value;
};

export const getAboutUs = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    if (rows.length === 0) {
      // Return empty data instead of 404 (fields can be empty)
      return res.json({
        success: true,
        data: {
          description: null,
          extension_categories: [],
          image_url: null
        }
      });
    }

    const aboutUsData = {
      ...rows[0],
      extension_categories: safeParseJSON(rows[0].extension_categories) || []
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

// All fields optional
export const updateAboutUs = async (req, res) => {
  try {
    const { description, extension_categories, image_url } = req.body;

    if (extension_categories && !Array.isArray(extension_categories)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Extension categories must be an array' 
      });
    }

    if (extension_categories && extension_categories.length > 0) {
    for (const category of extension_categories) {
      if (!category.name || category.name.trim() === '') {
        return res.status(400).json({ 
          success: false, 
            message: 'Extension category name cannot be empty if category is provided' 
        });
        }
      }
    }

    const [existingRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    let result;
    const descriptionValue = description && description.trim() ? description.trim() : null;
    const categoriesValue = extension_categories && extension_categories.length > 0 ? JSON.stringify(extension_categories) : JSON.stringify([]);
    
    if (existingRows.length === 0) {
      [result] = await db.query(
        'INSERT INTO about_us (description, extension_categories, image_url) VALUES (?, ?, ?)',
        [descriptionValue, categoriesValue, image_url || null]
      );
    } else {
      [result] = await db.query(
        'UPDATE about_us SET description = ?, extension_categories = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [descriptionValue, categoriesValue, image_url || null, existingRows[0].id]
      );
    }

    const [updatedRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    const aboutUsData = {
      ...updatedRows[0],
      extension_categories: safeParseJSON(updatedRows[0].extension_categories) || []
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

export const addExtensionCategory = async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Extension category name is required' 
      });
    }

    const [existingRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'About us content not found' 
      });
    }

    const currentCategories = safeParseJSON(existingRows[0].extension_categories) || [];

    const categoryExists = currentCategories.some(cat => 
      cat.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (categoryExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Extension category already exists' 
      });
    }

    const newCategory = {
      name: name.trim(),
      color: color || 'green'
    };

    currentCategories.push(newCategory);

    await db.query(
      'UPDATE about_us SET extension_categories = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(currentCategories), existingRows[0].id]
    );

    const [updatedRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    const aboutUsData = {
      ...updatedRows[0],
      extension_categories: safeParseJSON(updatedRows[0].extension_categories) || []
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

    // Parse existing extension categories (typeCast already parses JSON, so use helper)
    const currentCategories = safeParseJSON(existingRows[0].extension_categories) || [];

    if (index >= currentCategories.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category index out of range' 
      });
    }

    currentCategories[index] = {
      name: name.trim(),
      color: color || currentCategories[index].color
    };

    await db.query(
      'UPDATE about_us SET extension_categories = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(currentCategories), existingRows[0].id]
    );

    const [updatedRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    const aboutUsData = {
      ...updatedRows[0],
      extension_categories: safeParseJSON(updatedRows[0].extension_categories) || []
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

    // Parse existing extension categories (typeCast already parses JSON, so use helper)
    const currentCategories = safeParseJSON(existingRows[0].extension_categories) || [];

    if (index >= currentCategories.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category index out of range' 
      });
    }

    currentCategories.splice(index, 1);

    await db.query(
      'UPDATE about_us SET extension_categories = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(currentCategories), existingRows[0].id]
    );

    const [updatedRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    const aboutUsData = {
      ...updatedRows[0],
      extension_categories: safeParseJSON(updatedRows[0].extension_categories) || []
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

export const uploadAboutUsImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file uploaded' 
      });
    }

    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      'faith-community/about-us',
      { prefix: 'about_us_' }
    );

    const [existingRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      // Don't auto-create record - user should create via update endpoint first
      return res.status(404).json({ 
        success: false, 
        message: 'About us content not found. Please create about us content first before uploading an image.' 
      });
    } else {
      await db.query(
        'UPDATE about_us SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [uploadResult.url, existingRows[0].id]
      );
    }

    const [updatedRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    const aboutUsData = {
      ...updatedRows[0],
      extension_categories: safeParseJSON(updatedRows[0].extension_categories) || []
    };

    res.json({
      success: true,
      message: 'About us image uploaded successfully',
      data: aboutUsData,
      imageUrl: uploadResult.url,
      cloudinary_info: {
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        size: uploadResult.size
      }
    });
  } catch (error) {
    console.error('Error uploading about us image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload about us image: ' + error.message 
    });
  }
};

export const deleteAboutUsImage = async (req, res) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'About us content not found' 
      });
    }

    if (!existingRows[0].image_url) {
      return res.status(404).json({ 
        success: false, 
        message: 'No image to delete' 
      });
    }

    const publicId = extractPublicIdFromUrl(existingRows[0].image_url);
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (deleteError) {
      }
    }

    await db.query(
      'UPDATE about_us SET image_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [existingRows[0].id]
    );

    // Fetch updated about us data
    const [updatedRows] = await db.query('SELECT * FROM about_us ORDER BY id DESC LIMIT 1');
    
    // Parse JSON fields
    const aboutUsData = {
      ...updatedRows[0],
      extension_categories: safeParseJSON(updatedRows[0].extension_categories) || []
    };

    res.json({
      success: true,
      message: 'About us image deleted successfully',
      data: aboutUsData
    });
  } catch (error) {
    console.error('Error deleting about us image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete about us image: ' + error.message 
    });
  }
};

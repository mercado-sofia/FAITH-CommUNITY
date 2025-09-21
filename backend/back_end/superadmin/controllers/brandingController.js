import db from '../../database.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get branding settings
export const getBranding = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Branding settings not found' 
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching branding:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch branding settings' 
    });
  }
};

// Update branding settings
export const updateBranding = async (req, res) => {
  try {
    const { logo_url, name_url, favicon_url } = req.body;

    // Check if branding record exists
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    let result;
    if (existingRows.length === 0) {
      // Create new branding record
      [result] = await db.query(
        'INSERT INTO branding (logo_url, name_url, favicon_url) VALUES (?, ?, ?)',
        [logo_url || null, name_url || null, favicon_url || null]
      );
    } else {
      // Update existing branding record
      [result] = await db.query(
        'UPDATE branding SET logo_url = ?, name_url = ?, favicon_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [logo_url || null, name_url || null, favicon_url || null, existingRows[0].id]
      );
    }

    // Fetch updated branding data
    const [updatedRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');

    res.json({
      success: true,
      message: 'Branding settings updated successfully',
      data: updatedRows[0]
    });
  } catch (error) {
    console.error('Error updating branding:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update branding settings' 
    });
  }
};

// Upload logo
export const uploadLogo = async (req, res) => {
  try {
    console.log('Upload logo request received');
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);
    
    if (!req.file) {
      console.log('No file provided in request');
      return res.status(400).json({ 
        success: false, 
        message: 'No logo file provided' 
      });
    }

    console.log('File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const logoUrl = `/uploads/branding/${req.file.filename}`;

    // Update branding with new logo URL
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO branding (logo_url, favicon_url) VALUES (?, ?)',
        [logoUrl, null]
      );
    } else {
      // Delete old logo file if it exists
      if (existingRows[0].logo_url) {
        const oldLogoPath = path.join(__dirname, '../../../uploads/branding', path.basename(existingRows[0].logo_url));
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }
      
      await db.query(
        'UPDATE branding SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [logoUrl, existingRows[0].id]
      );
    }

    console.log('Logo uploaded successfully:', logoUrl);
    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: { logo_url: logoUrl }
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload logo',
      error: error.message 
    });
  }
};

// Upload favicon
export const uploadFavicon = async (req, res) => {
  try {
    console.log('Upload favicon request received');
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);
    
    if (!req.file) {
      console.log('No file provided in request');
      return res.status(400).json({ 
        success: false, 
        message: 'No favicon file provided' 
      });
    }

    console.log('File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const faviconUrl = `/uploads/branding/${req.file.filename}`;

    // Update branding with new favicon URL
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO branding (logo_url, favicon_url) VALUES (?, ?)',
        [null, faviconUrl]
      );
    } else {
      // Delete old favicon file if it exists
      if (existingRows[0].favicon_url) {
        const oldFaviconPath = path.join(__dirname, '../../../uploads/branding', path.basename(existingRows[0].favicon_url));
        if (fs.existsSync(oldFaviconPath)) {
          fs.unlinkSync(oldFaviconPath);
        }
      }
      
      await db.query(
        'UPDATE branding SET favicon_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [faviconUrl, existingRows[0].id]
      );
    }

    console.log('Favicon uploaded successfully:', faviconUrl);
    res.json({
      success: true,
      message: 'Favicon uploaded successfully',
      data: { favicon_url: faviconUrl }
    });
  } catch (error) {
    console.error('Error uploading favicon:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload favicon',
      error: error.message 
    });
  }
};

// Delete logo
export const deleteLogo = async (req, res) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Branding settings not found' 
      });
    }

    // Delete logo file if it exists
    if (existingRows[0].logo_url) {
      const logoPath = path.join(__dirname, '../../../uploads/branding', path.basename(existingRows[0].logo_url));
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
    }

    // Update database
    await db.query(
      'UPDATE branding SET logo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [existingRows[0].id]
    );

    res.json({
      success: true,
      message: 'Logo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete logo' 
    });
  }
};

// Delete favicon
export const deleteFavicon = async (req, res) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Branding settings not found' 
      });
    }

    // Delete favicon file if it exists
    if (existingRows[0].favicon_url) {
      const faviconPath = path.join(__dirname, '../../../uploads/branding', path.basename(existingRows[0].favicon_url));
      if (fs.existsSync(faviconPath)) {
        fs.unlinkSync(faviconPath);
      }
    }

    // Update database
    await db.query(
      'UPDATE branding SET favicon_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [existingRows[0].id]
    );

    res.json({
      success: true,
      message: 'Favicon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting favicon:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete favicon' 
    });
  }
};

// Upload name image
export const uploadName = async (req, res) => {
  try {
    console.log('Upload name request received');
    console.log('Request file:', req.file);
    console.log('Request body:', req.body);
    
    if (!req.file) {
      console.log('No file provided in request');
      return res.status(400).json({ 
        success: false, 
        message: 'No name file provided' 
      });
    }

    console.log('File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const nameUrl = `/uploads/branding/${req.file.filename}`;

    // Update branding with new name URL
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO branding (logo_url, name_url, favicon_url) VALUES (?, ?, ?)',
        [null, nameUrl, null]
      );
    } else {
      // Delete old name file if it exists
      if (existingRows[0].name_url) {
        const oldNamePath = path.join(__dirname, '../../../uploads/branding', path.basename(existingRows[0].name_url));
        if (fs.existsSync(oldNamePath)) {
          fs.unlinkSync(oldNamePath);
        }
      }
      
      await db.query(
        'UPDATE branding SET name_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nameUrl, existingRows[0].id]
      );
    }

    console.log('Name uploaded successfully:', nameUrl);
    res.json({
      success: true,
      message: 'Name uploaded successfully',
      data: { name_url: nameUrl }
    });
  } catch (error) {
    console.error('Error uploading name:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload name',
      error: error.message 
    });
  }
};

// Delete name
export const deleteName = async (req, res) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Branding settings not found' 
      });
    }

    // Delete name file if it exists
    if (existingRows[0].name_url) {
      const namePath = path.join(__dirname, '../../../uploads/branding', path.basename(existingRows[0].name_url));
      if (fs.existsSync(namePath)) {
        fs.unlinkSync(namePath);
      }
    }

    // Update database
    await db.query(
      'UPDATE branding SET name_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [existingRows[0].id]
    );

    res.json({
      success: true,
      message: 'Name deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting name:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete name' 
    });
  }
};

// Get site name
export const getSiteName = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM site_name ORDER BY id DESC LIMIT 1');
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Site name not found' 
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching site name:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch site name' 
    });
  }
};

// Update site name
export const updateSiteName = async (req, res) => {
  try {
    const { site_name } = req.body;

    if (!site_name || site_name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Site name is required' 
      });
    }

    // Check if site name record exists
    const [existingRows] = await db.query('SELECT * FROM site_name ORDER BY id DESC LIMIT 1');
    
    let result;
    if (existingRows.length === 0) {
      // Create new site name record
      [result] = await db.query(
        'INSERT INTO site_name (site_name) VALUES (?)',
        [site_name.trim()]
      );
    } else {
      // Update existing site name record
      [result] = await db.query(
        'UPDATE site_name SET site_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [site_name.trim(), existingRows[0].id]
      );
    }

    // Fetch updated site name data
    const [updatedRows] = await db.query('SELECT * FROM site_name ORDER BY id DESC LIMIT 1');

    res.json({
      success: true,
      message: 'Site name updated successfully',
      data: updatedRows[0]
    });
  } catch (error) {
    console.error('Error updating site name:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update site name' 
    });
  }
};
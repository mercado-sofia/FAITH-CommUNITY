import db from '../../database.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { 
  deleteFromCloudinary, 
  extractPublicIdFromUrl,
  CLOUDINARY_FOLDERS 
} from '../../utils/cloudinaryConfig.js';
import { uploadSingleToCloudinary } from '../../utils/cloudinaryUpload.js';

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
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Upload to Cloudinary
    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      CLOUDINARY_FOLDERS.BRANDING,
      { prefix: 'logo_' }
    );

    const logoUrl = uploadResult.url;

    // Update branding with new logo URL
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO branding (logo_url, favicon_url) VALUES (?, ?)',
        [logoUrl, null]
      );
    } else {
      // Delete old logo from Cloudinary if it exists
      if (existingRows[0].logo_url) {
        const oldPublicId = extractPublicIdFromUrl(existingRows[0].logo_url);
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
            console.log('Old logo deleted from Cloudinary:', oldPublicId);
          } catch (deleteError) {
            console.warn('Failed to delete old logo from Cloudinary:', deleteError.message);
          }
        }
      }
      
      await db.query(
        'UPDATE branding SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [logoUrl, existingRows[0].id]
      );
    }

    console.log('Logo uploaded successfully to Cloudinary:', logoUrl);
    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: { 
        logo_url: logoUrl,
        public_id: uploadResult.public_id,
        cloudinary_info: {
          format: uploadResult.format,
          width: uploadResult.width,
          height: uploadResult.height,
          size: uploadResult.size
        }
      }
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
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Upload to Cloudinary
    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      CLOUDINARY_FOLDERS.BRANDING,
      { prefix: 'favicon_' }
    );

    const faviconUrl = uploadResult.url;

    // Update branding with new favicon URL
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO branding (logo_url, favicon_url) VALUES (?, ?)',
        [null, faviconUrl]
      );
    } else {
      // Delete old favicon from Cloudinary if it exists
      if (existingRows[0].favicon_url) {
        const oldPublicId = extractPublicIdFromUrl(existingRows[0].favicon_url);
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
            console.log('Old favicon deleted from Cloudinary:', oldPublicId);
          } catch (deleteError) {
            console.warn('Failed to delete old favicon from Cloudinary:', deleteError.message);
          }
        }
      }
      
      await db.query(
        'UPDATE branding SET favicon_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [faviconUrl, existingRows[0].id]
      );
    }

    console.log('Favicon uploaded successfully to Cloudinary:', faviconUrl);
    res.json({
      success: true,
      message: 'Favicon uploaded successfully',
      data: { 
        favicon_url: faviconUrl,
        public_id: uploadResult.public_id,
        cloudinary_info: {
          format: uploadResult.format,
          width: uploadResult.width,
          height: uploadResult.height,
          size: uploadResult.size
        }
      }
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

    // Delete logo from Cloudinary if it exists
    if (existingRows[0].logo_url) {
      const publicId = extractPublicIdFromUrl(existingRows[0].logo_url);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
          console.log('Logo deleted from Cloudinary:', publicId);
        } catch (deleteError) {
          console.warn('Failed to delete logo from Cloudinary:', deleteError.message);
        }
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

    // Delete favicon from Cloudinary if it exists
    if (existingRows[0].favicon_url) {
      const publicId = extractPublicIdFromUrl(existingRows[0].favicon_url);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
          console.log('Favicon deleted from Cloudinary:', publicId);
        } catch (deleteError) {
          console.warn('Failed to delete favicon from Cloudinary:', deleteError.message);
        }
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
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Upload to Cloudinary
    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      CLOUDINARY_FOLDERS.BRANDING,
      { prefix: 'name_' }
    );

    const nameUrl = uploadResult.url;

    // Update branding with new name URL
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO branding (logo_url, name_url, favicon_url) VALUES (?, ?, ?)',
        [null, nameUrl, null]
      );
    } else {
      // Delete old name from Cloudinary if it exists
      if (existingRows[0].name_url) {
        const oldPublicId = extractPublicIdFromUrl(existingRows[0].name_url);
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
            console.log('Old name image deleted from Cloudinary:', oldPublicId);
          } catch (deleteError) {
            console.warn('Failed to delete old name image from Cloudinary:', deleteError.message);
          }
        }
      }
      
      await db.query(
        'UPDATE branding SET name_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nameUrl, existingRows[0].id]
      );
    }

    console.log('Name uploaded successfully to Cloudinary:', nameUrl);
    res.json({
      success: true,
      message: 'Name uploaded successfully',
      data: { 
        name_url: nameUrl,
        public_id: uploadResult.public_id,
        cloudinary_info: {
          format: uploadResult.format,
          width: uploadResult.width,
          height: uploadResult.height,
          size: uploadResult.size
        }
      }
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

    // Delete name from Cloudinary if it exists
    if (existingRows[0].name_url) {
      const publicId = extractPublicIdFromUrl(existingRows[0].name_url);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
          console.log('Name image deleted from Cloudinary:', publicId);
        } catch (deleteError) {
          console.warn('Failed to delete name image from Cloudinary:', deleteError.message);
        }
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
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

export const getBranding = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (rows.length === 0) {
      // Return success with null data instead of 404 (allows frontend to handle gracefully)
      return res.json({ 
        success: true, 
        data: null,
        message: 'No branding settings found' 
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

export const updateBranding = async (req, res) => {
  try {
    const { logo_url, name_url, favicon_url } = req.body;

    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    let result;
    if (existingRows.length === 0) {
      [result] = await db.query(
        'INSERT INTO branding (logo_url, name_url, favicon_url) VALUES (?, ?, ?)',
        [logo_url || null, name_url || null, favicon_url || null]
      );
    } else {
      [result] = await db.query(
        'UPDATE branding SET logo_url = ?, name_url = ?, favicon_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [logo_url || null, name_url || null, favicon_url || null, existingRows[0].id]
      );
    }

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

export const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No logo file provided' 
      });
    }

    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      CLOUDINARY_FOLDERS.BRANDING,
      { prefix: 'logo_' }
    );

    const logoUrl = uploadResult.url;

    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO branding (logo_url, name_url, favicon_url) VALUES (?, ?, ?)',
        [logoUrl, null, null]
      );
    } else {
      if (existingRows[0].logo_url) {
        const oldPublicId = extractPublicIdFromUrl(existingRows[0].logo_url);
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
          } catch (deleteError) {
          }
        }
      }
      
      await db.query(
        'UPDATE branding SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [logoUrl, existingRows[0].id]
      );
    }

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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload logo',
      error: error.message 
    });
  }
};

export const uploadFavicon = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No favicon file provided' 
      });
    }

    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      CLOUDINARY_FOLDERS.BRANDING,
      { prefix: 'favicon_' }
    );

    const faviconUrl = uploadResult.url;

    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO branding (logo_url, name_url, favicon_url) VALUES (?, ?, ?)',
        [null, null, faviconUrl]
      );
    } else {
      if (existingRows[0].favicon_url) {
        const oldPublicId = extractPublicIdFromUrl(existingRows[0].favicon_url);
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
          } catch (deleteError) {
          }
        }
      }
      
      await db.query(
        'UPDATE branding SET favicon_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [faviconUrl, existingRows[0].id]
      );
    }

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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload favicon',
      error: error.message 
    });
  }
};

export const deleteLogo = async (req, res) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Branding settings not found' 
      });
    }

    if (existingRows[0].logo_url) {
      const publicId = extractPublicIdFromUrl(existingRows[0].logo_url);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (deleteError) {
        }
      }
    }

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

export const deleteFavicon = async (req, res) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Branding settings not found' 
      });
    }

    if (existingRows[0].favicon_url) {
      const publicId = extractPublicIdFromUrl(existingRows[0].favicon_url);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (deleteError) {
        }
      }
    }

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

export const uploadName = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No name file provided' 
      });
    }

    const uploadResult = await uploadSingleToCloudinary(
      req.file, 
      CLOUDINARY_FOLDERS.BRANDING,
      { prefix: 'name_' }
    );

    const nameUrl = uploadResult.url;

    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      await db.query(
        'INSERT INTO branding (logo_url, name_url, favicon_url) VALUES (?, ?, ?)',
        [null, nameUrl, null]
      );
    } else {
      if (existingRows[0].name_url) {
        const oldPublicId = extractPublicIdFromUrl(existingRows[0].name_url);
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
          } catch (deleteError) {
          }
        }
      }
      
      await db.query(
        'UPDATE branding SET name_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [nameUrl, existingRows[0].id]
      );
    }

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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload name',
      error: error.message 
    });
  }
};

export const deleteName = async (req, res) => {
  try {
    const [existingRows] = await db.query('SELECT * FROM branding ORDER BY id DESC LIMIT 1');
    
    if (existingRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Branding settings not found' 
      });
    }

    if (existingRows[0].name_url) {
      const publicId = extractPublicIdFromUrl(existingRows[0].name_url);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (deleteError) {
        }
      }
    }

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

export const updateSiteName = async (req, res) => {
  try {
    const { site_name } = req.body;

    if (!site_name || site_name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Site name is required' 
      });
    }

    const [existingRows] = await db.query('SELECT * FROM site_name ORDER BY id DESC LIMIT 1');
    
    let result;
    if (existingRows.length === 0) {
      [result] = await db.query(
        'INSERT INTO site_name (site_name) VALUES (?)',
        [site_name.trim()]
      );
    } else {
      [result] = await db.query(
        'UPDATE site_name SET site_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [site_name.trim(), existingRows[0].id]
      );
    }

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
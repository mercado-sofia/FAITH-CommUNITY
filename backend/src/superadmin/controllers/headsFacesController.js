// db table: heads_faces
import db from '../../database.js';
import { uploadSingleToCloudinary } from '../../utils/cloudinaryUpload.js';
import { CLOUDINARY_FOLDERS } from '../../utils/cloudinaryConfig.js';

export const getHeadsFaces = async (req, res) => {
  try {
    // Get only the primary head (first by display_order)
    const [results] = await db.query(
      "SELECT * FROM heads_faces WHERE status = 'ACTIVE' ORDER BY display_order ASC, created_at ASC LIMIT 1"
    );
    res.status(200).json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getHeadsFacesById = async (req, res) => {
  try {
    const { id } = req.params;
    const [results] = await db.query(
      "SELECT * FROM heads_faces WHERE id = ? AND status = 'ACTIVE'",
      [id]
    );
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, error: 'Head of FACES not found' });
    }
    
    res.status(200).json({ success: true, data: results[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create or update the single head of FACES
export const createOrUpdateHeadFaces = async (req, res) => {
  try {
    const { name, description, email, phone, image_url, position } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    
    // Check if a head already exists
    const [existingHeads] = await db.query(
      "SELECT * FROM heads_faces WHERE status = 'ACTIVE' ORDER BY display_order ASC, created_at ASC LIMIT 1"
    );
    
    if (existingHeads.length > 0) {
      // Update existing head
      const existingHead = existingHeads[0];
      await db.query(
        "UPDATE heads_faces SET name = ?, description = ?, email = ?, phone = ?, image_url = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [name, description || null, email || null, phone || null, image_url || null, position || 'Head of FACES', existingHead.id]
      );
      
      // Fetch the updated record
      const [updatedRecord] = await db.query(
        "SELECT * FROM heads_faces WHERE id = ?",
        [existingHead.id]
      );
      
      res.status(200).json({ 
        success: true, 
        message: 'Head of FACES updated successfully', 
        data: updatedRecord[0] 
      });
    } else {
      // Create new head
      const [result] = await db.query(
        "INSERT INTO heads_faces (name, description, email, phone, image_url, position, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, description || null, email || null, phone || null, image_url || null, position || 'Head of FACES', 1]
      );
      
      // Fetch the created record
      const [newRecord] = await db.query(
        "SELECT * FROM heads_faces WHERE id = ?",
        [result.insertId]
      );
      
      res.status(201).json({ 
        success: true, 
        message: 'Head of FACES created successfully', 
        data: newRecord[0] 
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createHeadsFaces = async (req, res) => {
  try {
    const { name, description, email, phone, image_url, position, display_order } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    
    const [result] = await db.query(
      "INSERT INTO heads_faces (name, description, email, phone, image_url, position, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, description || null, email || null, phone || null, image_url || null, position || 'Head of FACES', display_order || 0]
    );
    
    // Fetch the created record
    const [newRecord] = await db.query(
      "SELECT * FROM heads_faces WHERE id = ?",
      [result.insertId]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Head of FACES created successfully', 
      data: newRecord[0] 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateHeadsFaces = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, email, phone, image_url, position, display_order, status } = req.body;
    
    // Check if record exists
    const [existingRecord] = await db.query(
      "SELECT * FROM heads_faces WHERE id = ?",
      [id]
    );
    
    if (existingRecord.length === 0) {
      return res.status(404).json({ success: false, error: 'Head of FACES not found' });
    }
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    
    await db.query(
      "UPDATE heads_faces SET name = ?, description = ?, email = ?, phone = ?, image_url = ?, position = ?, display_order = ?, status = ? WHERE id = ?",
      [name, description || null, email || null, phone || null, image_url || null, position || 'Head of FACES', display_order || 0, status || 'ACTIVE', id]
    );
    
    // Fetch the updated record
    const [updatedRecord] = await db.query(
      "SELECT * FROM heads_faces WHERE id = ?",
      [id]
    );
    
    res.status(200).json({ 
      success: true, 
      message: 'Head of FACES updated successfully', 
      data: updatedRecord[0] 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteHeadsFaces = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if record exists
    const [existingRecord] = await db.query(
      "SELECT * FROM heads_faces WHERE id = ?",
      [id]
    );
    
    if (existingRecord.length === 0) {
      return res.status(404).json({ success: false, error: 'Head of FACES not found' });
    }
    
    // Soft delete by setting status to INACTIVE
    await db.query(
      "UPDATE heads_faces SET status = 'INACTIVE' WHERE id = ?",
      [id]
    );
    
    res.status(200).json({ 
      success: true, 
      message: 'Head of FACES deleted successfully' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Upload image for heads of FACES
export const uploadHeadsFacesImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadSingleToCloudinary(
      req.file,
      CLOUDINARY_FOLDERS.ORGANIZATIONS.HEADS,
      {
        prefix: 'heads_faces_',
        transformation: {
          width: 400,
          height: 400,
          crop: 'fill',
          gravity: 'face',
          quality: 'auto',
          format: 'auto'
        }
      }
    );

    const imageUrl = uploadResult.url;

    // Check if a head already exists
    const [existingHeads] = await db.query(
      "SELECT * FROM heads_faces WHERE status = 'ACTIVE' ORDER BY display_order ASC, created_at ASC LIMIT 1"
    );

    if (existingHeads.length > 0) {
      // Update existing head with new image
      await db.query(
        "UPDATE heads_faces SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [imageUrl, existingHeads[0].id]
      );
    } else {
      // Create new head with uploaded image
      await db.query(
        "INSERT INTO heads_faces (name, image_url, position, display_order) VALUES (?, ?, ?, ?)",
        ['Head of FACES', imageUrl, 'Head of FACES', 1]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Head of FACES image uploaded successfully',
      data: {
        url: imageUrl,
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
    console.error('Error uploading heads of FACES image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload heads of FACES image: ' + error.message
    });
  }
};


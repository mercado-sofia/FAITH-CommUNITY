// db table: mission_vision
import db from '../../database.js';

// Helper to normalize type (database uses lowercase)
const normalizeType = (type) => {
  if (!type) return null;
  const normalized = type.toLowerCase();
  return normalized === 'mission' || normalized === 'vision' ? normalized : null;
};

export const getMissionVision = async (req, res) => {
  try {
    // Get only the latest Mission and Vision (one of each)
    // Since we're using UPSERT, there should only be one of each type
    const [results] = await db.query(
      `SELECT * FROM mission_vision 
       WHERE type = 'mission' OR type = 'vision'
       ORDER BY type, id DESC
       LIMIT 2`
    );
    
    // Ensure we return exactly one Mission and one Vision
    const mission = results.find(r => r.type === 'mission');
    const vision = results.find(r => r.type === 'vision');
    
    const response = [];
    if (mission) response.push({ ...mission, type: 'Mission' }); // Capitalize for frontend
    if (vision) response.push({ ...vision, type: 'Vision' }); // Capitalize for frontend
    
    res.status(200).json(response);
  } catch (err) {
    console.error('Error fetching mission/vision:', err);
    res.status(500).json({ error: err.message });
  }
};

// UPSERT: Update if exists, insert if not (ensures only one Mission and one Vision)
export const upsertMissionVision = async (req, res) => {
  const { type, content } = req.body;
  try {
    // Validate type is provided
    if (!type || (type !== 'Mission' && type !== 'Vision')) {
      return res.status(400).json({ 
        success: false,
        error: 'Type must be either "Mission" or "Vision"' 
      });
    }
    
    // Normalize type to lowercase for database
    const normalizedType = normalizeType(type);
    if (!normalizedType) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid type' 
      });
    }
    
    // Check if entry exists for this type
    const [existing] = await db.query(
      "SELECT * FROM mission_vision WHERE type = ? ORDER BY id DESC LIMIT 1",
      [normalizedType]
    );
    
    let result;
    if (existing.length > 0) {
      // Update existing entry
      await db.query(
        "UPDATE mission_vision SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [content || null, existing[0].id]
      );
      
      // Fetch updated data
      const [updated] = await db.query('SELECT * FROM mission_vision WHERE id = ?', [existing[0].id]);
      result = updated[0];
    } else {
      // Insert new entry
      const [insertResult] = await db.query(
        "INSERT INTO mission_vision (type, content, status) VALUES (?, ?, 'ACTIVE')",
        [normalizedType, content || null]
      );
      
      // Fetch inserted data
      const [inserted] = await db.query('SELECT * FROM mission_vision WHERE id = ?', [insertResult.insertId]);
      result = inserted[0];
    }
    
    // Capitalize type for frontend response
    const responseData = { ...result, type: type };
    
    res.json({ 
      success: true,
      message: existing.length > 0 ? 'Entry updated' : 'Entry created', 
      data: responseData
    });
  } catch (err) {
    console.error('Error upserting mission/vision:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const updateMissionVision = async (req, res) => {
  const { id } = req.params;
  const { type, content } = req.body;
  try {
    // Validate type if provided
    if (type && type !== 'Mission' && type !== 'Vision') {
      return res.status(400).json({ 
        success: false,
        error: 'Type must be either "Mission" or "Vision"' 
      });
    }
    
    // Content is optional - can be null or empty
    const updateFields = [];
    const updateValues = [];
    
    if (type !== undefined) {
      const normalizedType = normalizeType(type);
      if (!normalizedType) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid type' 
        });
      }
      updateFields.push('type = ?');
      updateValues.push(normalizedType);
    }
    
    if (content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(content || null);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'At least one field must be provided for update' 
      });
    }
    
    updateValues.push(id);
    
    await db.query(
      `UPDATE mission_vision SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );
    
    // Fetch updated data
    const [updatedRows] = await db.query('SELECT * FROM mission_vision WHERE id = ?', [id]);
    
    if (updatedRows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Entry not found' 
      });
    }
    
    // Capitalize type for frontend response
    const responseData = { ...updatedRows[0], type: updatedRows[0].type === 'mission' ? 'Mission' : 'Vision' };
    
    res.json({ 
      success: true,
      message: 'Entry updated',
      data: responseData
    });
  } catch (err) {
    console.error('Error updating mission/vision:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const deleteMissionVision = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE mission_vision SET status = 'INACTIVE' WHERE id = ?", [id]);
    res.json({ message: 'Entry deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// db table: mission_vision
import db from '../../database.js';

export const getMissionVision = async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT * FROM mission_vision WHERE status = 'ACTIVE'"
    );
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createMissionVision = async (req, res) => {
  const { type, content } = req.body;
  try {
    // Validate type is provided
    if (!type || (type !== 'Mission' && type !== 'Vision')) {
      return res.status(400).json({ 
        success: false,
        error: 'Type must be either "Mission" or "Vision"' 
      });
    }
    
    // Content is optional - can be null or empty
    const [result] = await db.query(
      "INSERT INTO mission_vision (type, content, status) VALUES (?, ?, 'ACTIVE')",
      [type, content || null]
    );
    res.status(201).json({ 
      success: true,
      message: 'Entry created', 
      data: { id: result.insertId, type, content: content || null }
    });
  } catch (err) {
    console.error('Error creating mission/vision:', err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

export const updateMissionVision = async (req, res) => {
  const { id } = req.params;
  const { type, content, status } = req.body;
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
      updateFields.push('type = ?');
      updateValues.push(type);
    }
    
    if (content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(content || null);
    }
    
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
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
    
    res.json({ 
      success: true,
      message: 'Entry updated',
      data: updatedRows[0] || null
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

// db table: heads_faces
import db from '../../database.js';

export const getHeadsFaces = async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT * FROM heads_faces WHERE status = 'ACTIVE' ORDER BY display_order ASC, created_at ASC"
    );
    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('Error fetching heads of FACES:', err);
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
    console.error('Error fetching head of FACES by ID:', err);
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
    console.error('Error creating head of FACES:', err);
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
    console.error('Error updating head of FACES:', err);
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
    console.error('Error deleting head of FACES:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const reorderHeadsFaces = async (req, res) => {
  try {
    const { heads } = req.body; // Array of {id, display_order}
    
    if (!Array.isArray(heads)) {
      return res.status(400).json({ success: false, error: 'Invalid data format' });
    }
    
    // Update display order for each head
    for (const head of heads) {
      await db.query(
        "UPDATE heads_faces SET display_order = ? WHERE id = ?",
        [head.display_order, head.id]
      );
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Display order updated successfully' 
    });
  } catch (err) {
    console.error('Error reordering heads of FACES:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

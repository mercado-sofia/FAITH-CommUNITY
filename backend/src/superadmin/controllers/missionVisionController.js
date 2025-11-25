import db from '../../database.js';

const normalizeType = (type) => {
  if (!type) return null;
  const normalized = type.toLowerCase();
  return normalized === 'mission' || normalized === 'vision' ? normalized : null;
};

export const getMissionVision = async (req, res) => {
  try {
    // Get the latest Mission and Vision (one of each type) - handles both lowercase and capitalized types
    const [results] = await db.query(
      `SELECT mv1.* 
       FROM mission_vision mv1
       INNER JOIN (
         SELECT LOWER(type) as type, MAX(id) as max_id
         FROM mission_vision
         WHERE LOWER(type) IN ('mission', 'vision')
         GROUP BY LOWER(type)
       ) mv2 ON LOWER(mv1.type) = mv2.type AND mv1.id = mv2.max_id
       ORDER BY LOWER(mv1.type)`
    );
    
    // Ensure we return exactly one Mission and one Vision (handles both lowercase and capitalized types)
    const mission = results.find(r => 
      r.type?.toLowerCase() === 'mission' || r.type === 'Mission' || r.type === 'mission'
    );
    const vision = results.find(r => 
      r.type?.toLowerCase() === 'vision' || r.type === 'Vision' || r.type === 'vision'
    );
    
    const response = [];
    if (mission) {
      response.push({ 
        ...mission, 
        type: 'Mission',
        content: mission.content || null
      });
    }
    if (vision) {
      response.push({ 
        ...vision, 
        type: 'Vision',
        content: vision.content || null
      });
    }
    
    res.status(200).json(response);
  } catch (err) {
    console.error('Error fetching mission/vision:', err);
    // Return empty array to prevent frontend crashes (allows graceful empty state handling)
    res.status(200).json([]);
  }
};

// UPSERT: Update if exists, insert if not (ensures only one Mission and one Vision)
export const upsertMissionVision = async (req, res) => {
  const { type, content } = req.body;
  try {
    if (!type || (type !== 'Mission' && type !== 'Vision')) {
      return res.status(400).json({ 
        success: false,
        error: 'Type must be either "Mission" or "Vision"' 
      });
    }
    
    const normalizedType = normalizeType(type);
    if (!normalizedType) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid type' 
      });
    }
    
    // Get all entries for this type to find the latest and identify duplicates
    const [allEntries] = await db.query(
      "SELECT * FROM mission_vision WHERE type = ? ORDER BY id DESC",
      [normalizedType]
    );
    
    let result;
    const wasExisting = allEntries.length > 0;
    
    if (wasExisting) {
      // Get the latest entry (highest ID)
      const latestEntry = allEntries[0];
      
      // Update the latest entry
      await db.query(
        "UPDATE mission_vision SET content = ? WHERE id = ?",
        [content || null, latestEntry.id]
      );
      
      // Delete all other entries for this type (duplicates)
      if (allEntries.length > 1) {
        const duplicateIds = allEntries.slice(1).map(entry => entry.id);
        if (duplicateIds.length > 0) {
          await db.query(
            `DELETE FROM mission_vision WHERE id IN (${duplicateIds.map(() => '?').join(',')})`,
            duplicateIds
          );
        }
      }
      
      // Fetch updated data
      const [updated] = await db.query('SELECT * FROM mission_vision WHERE id = ?', [latestEntry.id]);
      
      if (!updated || updated.length === 0) {
        throw new Error('Failed to fetch updated mission/vision entry');
      }
      
      result = updated[0];
    } else {
      // Insert new entry
      const [insertResult] = await db.query(
        "INSERT INTO mission_vision (type, content) VALUES (?, ?)",
        [normalizedType, content || null]
      );
      
      if (!insertResult || !insertResult.insertId) {
        throw new Error('Failed to insert mission/vision entry');
      }
      
      // Fetch inserted data
      const [inserted] = await db.query('SELECT * FROM mission_vision WHERE id = ?', [insertResult.insertId]);
      
      if (!inserted || inserted.length === 0) {
        throw new Error('Failed to fetch inserted mission/vision entry');
      }
      
      result = inserted[0];
    }
    
    if (!result) {
      throw new Error('Failed to retrieve mission/vision entry after operation');
    }
    
    // Capitalize type for frontend response
    const responseData = { ...result, type: type };
    
    res.json({ 
      success: true,
      message: wasExisting ? 'Entry updated' : 'Entry created', 
      data: responseData
    });
  } catch (err) {
    console.error('Error upserting mission/vision:', err);
    // Provide more detailed error information
    const errorMessage = err.message || 'An unexpected error occurred';
    const errorCode = err.code || 'UNKNOWN_ERROR';
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      code: errorCode
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
      `UPDATE mission_vision SET ${updateFields.join(', ')} WHERE id = ?`,
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
    await db.query("DELETE FROM mission_vision WHERE id = ?", [id]);
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cleanup function to remove duplicate entries, keeping only the latest for each type
export const cleanupMissionVision = async () => {
  try {
    // Get all entries grouped by type
    const [allEntries] = await db.query(
      "SELECT * FROM mission_vision WHERE type IN ('mission', 'vision') ORDER BY type, id DESC"
    );
    
    const entriesByType = {
      mission: [],
      vision: []
    };
    
    allEntries.forEach(entry => {
      if (entry.type === 'mission' || entry.type === 'vision') {
        entriesByType[entry.type].push(entry);
      }
    });
    
    let deletedCount = 0;
    
    // For each type, keep only the latest entry (highest ID) and delete the rest
    for (const [type, entries] of Object.entries(entriesByType)) {
      if (entries.length > 1) {
        // Keep the first entry (latest/highest ID), delete the rest
        const duplicates = entries.slice(1);
        const duplicateIds = duplicates.map(entry => entry.id);
        
        if (duplicateIds.length > 0) {
          await db.query(
            `DELETE FROM mission_vision WHERE id IN (${duplicateIds.map(() => '?').join(',')})`,
            duplicateIds
          );
          deletedCount += duplicateIds.length;
        }
      }
    }
    
    return { deletedCount };
  } catch (err) {
    console.error('Error cleaning up mission/vision duplicates:', err);
    throw err;
  }
};

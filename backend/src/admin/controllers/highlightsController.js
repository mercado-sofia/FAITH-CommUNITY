//db table: admin_highlights
import promisePool from '../../database.js';

// Helper function to safely parse JSON (typeCast already parses JSON columns, so check if it's already an object)
const safeParseJSON = (value, defaultValue = null) => {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value; // Already parsed by typeCast
  if (typeof value === 'string') {
    try {
      return JSON.parse(value); // Still a string, parse it
    } catch (e) {
      return defaultValue;
    }
  }
  return value;
};

// Get all highlights for an admin's organization
export const getAdminHighlights = async (req, res) => {
  try {
    const { organization_id: orgId } = req.admin;
    
    // Check if program_id column exists
    const [columnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'program_id'
    `);
    
    const hasProgramIdColumn = columnCheck[0]?.count > 0;
    
    // Build query with or without program_id column
    const programIdSelect = hasProgramIdColumn ? ', program_id' : '';
    const query = `
      SELECT 
        id,
        title,
        description,
        media_files,
        status,
        organization_id,
        created_by${programIdSelect},
        created_at,
        updated_at
      FROM admin_highlights
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `;
    
    const [rows] = await promisePool.execute(query, [orgId]);
    
    // Parse JSON media_files and format the data
    const highlights = rows.map(highlight => ({
      ...highlight,
      media: safeParseJSON(highlight.media_files, []),
      program_id: hasProgramIdColumn ? (highlight.program_id || null) : null
    }));
    
    res.json({ highlights });
  } catch (error) {
    console.error('Error fetching highlights:', error);
    res.status(500).json({ error: 'Failed to fetch highlights', details: error.message });
  }
};

// Get a single highlight by ID
export const getHighlightById = async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_id: orgId } = req.admin;
    
    // Check if program_id column exists
    const [columnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'program_id'
    `);
    
    const hasProgramIdColumn = columnCheck[0]?.count > 0;
    
    // Build query with or without program_id column
    const programIdSelect = hasProgramIdColumn ? ', program_id' : '';
    const query = `
      SELECT 
        id,
        title,
        description,
        media_files,
        organization_id,
        created_by${programIdSelect},
        created_at,
        updated_at
      FROM admin_highlights
      WHERE id = ? AND organization_id = ?
    `;
    
    const [rows] = await promisePool.execute(query, [id, orgId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    const highlight = {
      ...rows[0],
      media: safeParseJSON(rows[0].media_files, []),
      program_id: hasProgramIdColumn ? (rows[0].program_id || null) : null
    };
    
    res.json({ highlight });
  } catch (error) {
    console.error('Error fetching highlight:', error);
    res.status(500).json({ error: 'Failed to fetch highlight', details: error.message });
  }
};

// Create a new highlight
export const createHighlight = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { title, description, media = [], program_id } = req.body;
    const { organization_id: orgId, id: adminId } = req.admin;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    // Validate program_id is required
    if (!program_id) {
      return res.status(400).json({ error: 'Associated Program is required' });
    }
    
    // Check if program_id column exists
    const [columnCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'program_id'
    `);
    
    const hasProgramIdColumn = columnCheck[0]?.count > 0;
    
    // Build INSERT query with or without program_id column
    const programIdColumn = hasProgramIdColumn ? ', program_id' : '';
    const programIdValue = hasProgramIdColumn ? ', ?' : '';
    const highlightQuery = `
      INSERT INTO admin_highlights (title, description, media_files, status, organization_id, created_by${programIdColumn}, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, ?${programIdValue}, NOW(), NOW())
    `;
    
    const mediaFilesJson = JSON.stringify(media);
    
    const insertParams = hasProgramIdColumn
      ? [title, description, mediaFilesJson, orgId, adminId, program_id || null]
      : [title, description, mediaFilesJson, orgId, adminId];
    
    const [highlightResult] = await connection.execute(highlightQuery, insertParams);
    
    const highlightId = highlightResult.insertId;
    
    // Create a submission record for the highlight
    const submissionQuery = `
      INSERT INTO submissions (organization_id, section, previous_data, proposed_data, submitted_by, status, submitted_at)
      VALUES (?, 'highlights', '{}', ?, ?, 'pending', NOW())
    `;
    
    const proposedData = JSON.stringify({
      highlight_id: highlightId,
      title,
      description,
      media_files: mediaFilesJson,
      program_id: program_id || null,
      action: 'create'
    });
    
    await connection.execute(submissionQuery, [
      orgId,
      proposedData,
      adminId
    ]);
    
    await connection.commit();
    
    // Fetch the created highlight
    const createdHighlight = await getHighlightByIdInternal(connection, highlightId);
    
    res.status(201).json({ 
      message: 'Highlight created successfully',
      highlight: createdHighlight
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to create highlight' });
  } finally {
    connection.release();
  }
};

// Update a highlight
export const updateHighlight = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { title, description, media = [], program_id } = req.body;
    const { organization_id: orgId } = req.admin;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    // Validate program_id is required
    if (!program_id) {
      return res.status(400).json({ error: 'Associated Program is required' });
    }
    
    // Validate ID parameter
    if (!id || id === '0' || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid highlight ID' });
    }
    
    // Check if highlight exists and belongs to organization, get current data
    const checkQuery = 'SELECT * FROM admin_highlights WHERE id = ? AND organization_id = ?';
    const [checkRows] = await connection.execute(checkQuery, [id, orgId]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    const currentHighlight = checkRows[0];
    
    // Check if program_id column exists
    const [columnCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'program_id'
    `);
    
    const hasProgramIdColumn = columnCheck[0]?.count > 0;
    
    // Build UPDATE query with or without program_id column
    const programIdUpdate = hasProgramIdColumn ? ', program_id = ?' : '';
    const updateQuery = `
      UPDATE admin_highlights 
      SET title = ?, description = ?, media_files = ?${programIdUpdate}, updated_at = NOW()
      WHERE id = ? AND organization_id = ?
    `;
    
    const mediaFilesJson = JSON.stringify(media);
    
    const updateParams = hasProgramIdColumn
      ? [title, description, mediaFilesJson, program_id || null, id, orgId]
      : [title, description, mediaFilesJson, id, orgId];
    
    await connection.execute(updateQuery, updateParams);
    
    // Create a submission record for the highlight update
    const submissionQuery = `
      INSERT INTO submissions (organization_id, section, previous_data, proposed_data, submitted_by, status, submitted_at)
      VALUES (?, 'highlights', ?, ?, ?, 'pending', NOW())
    `;
    
    const previousData = JSON.stringify({
      highlight_id: id,
      title: currentHighlight.title,
      description: currentHighlight.description,
      media_files: currentHighlight.media_files,
      program_id: currentHighlight.program_id || null,
      action: 'update'
    });
    
    const proposedData = JSON.stringify({
      highlight_id: id,
      title,
      description,
      media_files: mediaFilesJson,
      program_id: program_id || null,
      action: 'update'
    });
    
    await connection.execute(submissionQuery, [
      orgId,
      previousData,
      proposedData,
      req.admin.id
    ]);
    
    await connection.commit();
    
    // Fetch the updated highlight
    const updatedHighlight = await getHighlightByIdInternal(connection, id);
    
    res.json({ 
      message: 'Highlight updated successfully',
      highlight: updatedHighlight
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to update highlight' });
  } finally {
    connection.release();
  }
};

// Delete a highlight
export const deleteHighlight = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { organization_id: orgId } = req.admin;
    
    // Validate ID parameter
    if (!id || id === '0' || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid highlight ID' });
    }
    
    // Check if highlight exists and belongs to organization, get current data
    const checkQuery = 'SELECT * FROM admin_highlights WHERE id = ? AND organization_id = ?';
    const [checkRows] = await connection.execute(checkQuery, [id, orgId]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    const currentHighlight = checkRows[0];
    
    // Create a submission record for the highlight deletion
    const submissionQuery = `
      INSERT INTO submissions (organization_id, section, previous_data, proposed_data, submitted_by, status, submitted_at)
      VALUES (?, 'highlights', ?, '{}', ?, 'pending', NOW())
    `;
    
    const previousData = JSON.stringify({
      highlight_id: id,
      title: currentHighlight.title,
      description: currentHighlight.description,
      media_files: currentHighlight.media_files,
      action: 'delete'
    });
    
    await connection.execute(submissionQuery, [
      orgId,
      previousData,
      req.admin.id
    ]);
    
    // Only delete immediately if the highlight is pending (not yet approved/public)
    // If the highlight is approved, wait for superadmin approval before deleting
    if (currentHighlight.status === 'pending') {
      // Pending highlights can be deleted immediately since they're not public yet
      await connection.execute('DELETE FROM admin_highlights WHERE id = ? AND organization_id = ?', [id, orgId]);
    } else if (currentHighlight.status === 'approved') {
      // Approved highlights require superadmin approval before deletion
      // Don't delete immediately - keep it as 'approved' until superadmin approves/rejects the deletion
      // The highlight will be deleted when superadmin approves the deletion submission
      // If rejected, the highlight stays approved and visible on the public portal
    } else {
      // For rejected or other statuses, delete immediately
      await connection.execute('DELETE FROM admin_highlights WHERE id = ? AND organization_id = ?', [id, orgId]);
    }
    
    await connection.commit();
    
    res.json({ message: 'Highlight deleted successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to delete highlight' });
  } finally {
    connection.release();
  }
};

// Helper function to get highlight by ID (internal use)
const getHighlightByIdInternal = async (connection, highlightId) => {
  // Check if program_id column exists
  const [columnCheck] = await connection.execute(`
    SELECT COUNT(*) as count 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'admin_highlights' 
    AND COLUMN_NAME = 'program_id'
  `);
  
  const hasProgramIdColumn = columnCheck[0]?.count > 0;
  
  // Build query with or without program_id column
  const programIdSelect = hasProgramIdColumn ? ', program_id' : '';
  const query = `
    SELECT 
      id,
      title,
      description,
      media_files,
      organization_id,
      created_by${programIdSelect},
      created_at,
      updated_at
    FROM admin_highlights
    WHERE id = ?
  `;
  
  const [rows] = await connection.execute(query, [highlightId]);
  
  if (rows.length === 0) {
    return null;
  }
  
  return {
    ...rows[0],
    media: safeParseJSON(rows[0].media_files, []),
    program_id: hasProgramIdColumn ? (rows[0].program_id || null) : null
  };
};

// Get all highlights for superadmin approval (all organizations)
export const getAllHighlightsForApproval = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.status,
        h.organization_id,
        h.created_by,
        h.created_at,
        h.updated_at,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.org_color as organization_color,
        a.email as admin_email
      FROM admin_highlights h
      LEFT JOIN organizations o ON h.organization_id = o.id
      LEFT JOIN admins a ON h.created_by = a.id
    `;
    
    const queryParams = [];
    
    if (status && status !== 'all') {
      query += ` WHERE h.status = ?`;
      queryParams.push(status);
    }
    
    query += ` ORDER BY h.created_at DESC`;
    
    const [rows] = await promisePool.execute(query, queryParams);
    
    // Parse JSON media_files and format the data
    const highlights = rows.map(highlight => ({
      ...highlight,
      media: safeParseJSON(highlight.media_files, [])
    }));
    
    res.json({ highlights });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch highlights for approval' });
  }
};

// Update highlight status (approve/reject)
export const updateHighlightStatus = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }
    
    // Check if highlight exists
    const [existingHighlight] = await connection.execute(
      'SELECT id, status FROM admin_highlights WHERE id = ?',
      [id]
    );
    
    if (existingHighlight.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    // Update highlight status
    const updateQuery = `
      UPDATE admin_highlights 
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await connection.execute(updateQuery, [status, id]);
    
    // If rejected, store rejection reason (you might want to add a rejection_reason column)
    if (status === 'rejected' && rejection_reason) {
      // For now, we'll just log it. You can add a rejection_reason column later if needed
    }
    
    await connection.commit();
    
    res.json({ 
      message: `Highlight ${status} successfully`,
      highlight: { id, status }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to update highlight status' });
  } finally {
    connection.release();
  }
};

// Get approved highlights for public display
export const getApprovedHighlights = async (req, res) => {
  try {
    const query = `
      SELECT 
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.created_at,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as organization_logo
      FROM admin_highlights h
      LEFT JOIN organizations o ON h.organization_id = o.id
      WHERE h.status = 'approved'
      ORDER BY h.created_at DESC
    `;
    
    const [rows] = await promisePool.execute(query);
    
    // Parse JSON media_files and format the data
    const highlights = rows.map(highlight => ({
      ...highlight,
      media: safeParseJSON(highlight.media_files, [])
    }));
    
    res.json({ highlights });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approved highlights' });
  }
};
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
    
    // Build query with or without program_id column and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    const query = `
      SELECT 
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.status,
        h.organization_id,
        h.created_by${programIdSelect}${programTitleSelect},
        h.created_at,
        h.updated_at
      FROM admin_highlights h
      ${programJoin}
      WHERE h.organization_id = ?
      ORDER BY h.created_at DESC
    `;
    
    const [rows] = await promisePool.execute(query, [orgId]);
    
    // Parse JSON media_files and format the data
    const highlights = rows.map(highlight => ({
      ...highlight,
      media: safeParseJSON(highlight.media_files, []),
      program_id: hasProgramIdColumn ? (highlight.program_id || null) : null,
      program_title: hasProgramIdColumn ? (highlight.program_title || null) : null
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
    
    // Build query with or without program_id column and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    const query = `
      SELECT 
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.organization_id,
        h.created_by${programIdSelect}${programTitleSelect},
        h.created_at,
        h.updated_at
      FROM admin_highlights h
      ${programJoin}
      WHERE h.id = ? AND h.organization_id = ?
    `;
    
    const [rows] = await promisePool.execute(query, [id, orgId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    const highlight = {
      ...rows[0],
      media: safeParseJSON(rows[0].media_files, []),
      program_id: hasProgramIdColumn ? (rows[0].program_id || null) : null,
      program_title: hasProgramIdColumn ? (rows[0].program_title || null) : null
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
  
  // Build query with or without program_id column and program title
  const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
  const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
  const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
  const query = `
    SELECT 
      h.id,
      h.title,
      h.description,
      h.media_files,
      h.organization_id,
      h.created_by${programIdSelect}${programTitleSelect},
      h.created_at,
      h.updated_at
    FROM admin_highlights h
    ${programJoin}
    WHERE h.id = ?
  `;
  
  const [rows] = await connection.execute(query, [highlightId]);
  
  if (rows.length === 0) {
    return null;
  }
  
  return {
    ...rows[0],
    media: safeParseJSON(rows[0].media_files, []),
    program_id: hasProgramIdColumn ? (rows[0].program_id || null) : null,
    program_title: hasProgramIdColumn ? (rows[0].program_title || null) : null
  };
};

// Get all highlights for superadmin approval (all organizations)
export const getAllHighlightsForApproval = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Check if program_id column exists
    const [columnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'program_id'
    `);
    
    const hasProgramIdColumn = columnCheck[0]?.count > 0;
    
    // Build query with or without program_id and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    
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
        a.email as admin_email${programIdSelect}${programTitleSelect}
      FROM admin_highlights h
      LEFT JOIN organizations o ON h.organization_id = o.id
      LEFT JOIN admins a ON h.created_by = a.id
      ${programJoin}
    `;
    
    const queryParams = [];
    
    if (status && status !== 'all') {
      query += ` WHERE h.status = ?`;
      queryParams.push(status);
    }
    
    query += ` ORDER BY h.created_at DESC`;
    
    const [rows] = await promisePool.execute(query, queryParams);
    
    // Debug: Log query and sample data
    if (rows.length > 0) {
      console.log('getAllHighlightsForApproval - Sample row:', {
        id: rows[0].id,
        title: rows[0].title,
        program_id: rows[0].program_id,
        program_title: rows[0].program_title,
        hasProgramIdColumn
      });
    }
    
    // Parse JSON media_files and format the data
    const highlights = rows.map(highlight => ({
      ...highlight,
      media: safeParseJSON(highlight.media_files, []),
      program_id: hasProgramIdColumn ? (highlight.program_id || null) : null,
      program_title: hasProgramIdColumn ? (highlight.program_title || null) : null
    }));
    
    res.json({ highlights });
  } catch (error) {
    console.error('Error in getAllHighlightsForApproval:', error);
    res.status(500).json({ error: 'Failed to fetch highlights for approval', details: error.message });
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
    // Check if program_id column exists
    const [columnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'program_id'
    `);
    
    const hasProgramIdColumn = columnCheck[0]?.count > 0;
    
    // Build query with or without program_id and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    
    const query = `
      SELECT 
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.created_at,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as organization_logo${programIdSelect}${programTitleSelect}
      FROM admin_highlights h
      LEFT JOIN organizations o ON h.organization_id = o.id
      ${programJoin}
      WHERE h.status = 'approved'
      ORDER BY h.created_at DESC
    `;
    
    const [rows] = await promisePool.execute(query);
    
    // Debug: Log query and sample data
    if (rows.length > 0) {
      console.log('getApprovedHighlights - Sample row:', {
        id: rows[0].id,
        title: rows[0].title,
        program_id: rows[0].program_id,
        program_title: rows[0].program_title,
        hasProgramIdColumn
      });
    }
    
    // Parse JSON media_files and format the data
    const highlights = rows.map(highlight => ({
      ...highlight,
      media: safeParseJSON(highlight.media_files, []),
      program_id: hasProgramIdColumn ? (highlight.program_id || null) : null,
      program_title: hasProgramIdColumn ? (highlight.program_title || null) : null
    }));
    
    res.json({ highlights });
  } catch (error) {
    console.error('Error in getApprovedHighlights:', error);
    res.status(500).json({ error: 'Failed to fetch approved highlights', details: error.message });
  }
};

// Get featured highlights (ordered)
export const getFeaturedHighlights = async (req, res) => {
  try {
    // Check if program_id column exists
    const [columnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'program_id'
    `);
    
    const hasProgramIdColumn = columnCheck[0]?.count > 0;
    
    // Build query with or without program_id and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    
    const query = `
      SELECT 
        fh.highlight_id,
        fh.display_order,
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.created_at,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as organization_logo${programIdSelect}${programTitleSelect}
      FROM featured_highlights fh
      INNER JOIN admin_highlights h ON fh.highlight_id = h.id
      LEFT JOIN organizations o ON h.organization_id = o.id
      ${programJoin}
      WHERE h.status = 'approved'
      ORDER BY fh.display_order ASC
      LIMIT 8
    `;
    
    const [rows] = await promisePool.execute(query);
    
    const highlights = rows.map(highlight => ({
      ...highlight,
      media: safeParseJSON(highlight.media_files, []),
      program_id: hasProgramIdColumn ? (highlight.program_id || null) : null,
      program_title: hasProgramIdColumn ? (highlight.program_title || null) : null
    }));
    
    res.json({ highlights });
  } catch (error) {
    console.error('Error fetching featured highlights:', error);
    res.status(500).json({ error: 'Failed to fetch featured highlights' });
  }
};

// Add highlight to featured
export const addFeaturedHighlight = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id: highlightId } = req.params;
    
    // Check if highlight exists and is approved
    const [highlightRows] = await connection.execute(
      'SELECT id, status FROM admin_highlights WHERE id = ?',
      [highlightId]
    );
    
    if (highlightRows.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    if (highlightRows[0].status !== 'approved') {
      return res.status(400).json({ error: 'Only approved highlights can be featured' });
    }
    
    // Check if already featured
    const [existing] = await connection.execute(
      'SELECT id FROM featured_highlights WHERE highlight_id = ?',
      [highlightId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Highlight is already featured' });
    }
    
    // Check current count (max 8)
    const [countRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM featured_highlights'
    );
    const currentCount = countRows[0].count;
    
    if (currentCount >= 8) {
      return res.status(400).json({ error: 'Maximum of 8 featured highlights allowed' });
    }
    
    // Get next display order
    const displayOrder = currentCount + 1;
    
    // Add to featured
    await connection.execute(
      'INSERT INTO featured_highlights (highlight_id, display_order) VALUES (?, ?)',
      [highlightId, displayOrder]
    );
    
    await connection.commit();
    res.json({ message: 'Highlight added to featured', displayOrder });
  } catch (error) {
    await connection.rollback();
    console.error('Error adding featured highlight:', error);
    res.status(500).json({ error: 'Failed to add featured highlight' });
  } finally {
    connection.release();
  }
};

// Remove highlight from featured
export const removeFeaturedHighlight = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id: highlightId } = req.params;
    
    // Get the display order of the highlight being removed
    const [featuredRows] = await connection.execute(
      'SELECT display_order FROM featured_highlights WHERE highlight_id = ?',
      [highlightId]
    );
    
    if (featuredRows.length === 0) {
      return res.status(404).json({ error: 'Highlight is not featured' });
    }
    
    const removedOrder = featuredRows[0].display_order;
    
    // Remove from featured
    await connection.execute(
      'DELETE FROM featured_highlights WHERE highlight_id = ?',
      [highlightId]
    );
    
    // Update display orders of remaining items (decrement orders after removed item)
    await connection.execute(
      'UPDATE featured_highlights SET display_order = display_order - 1 WHERE display_order > ?',
      [removedOrder]
    );
    
    await connection.commit();
    res.json({ message: 'Highlight removed from featured' });
  } catch (error) {
    await connection.rollback();
    console.error('Error removing featured highlight:', error);
    res.status(500).json({ error: 'Failed to remove featured highlight' });
  } finally {
    connection.release();
  }
};

// Check if highlight is featured
export const checkFeaturedStatus = async (req, res) => {
  try {
    const { id: highlightId } = req.params;
    
    const [rows] = await promisePool.execute(
      'SELECT display_order FROM featured_highlights WHERE highlight_id = ?',
      [highlightId]
    );
    
    res.json({ 
      isFeatured: rows.length > 0,
      displayOrder: rows.length > 0 ? rows[0].display_order : null
    });
  } catch (error) {
    console.error('Error checking featured status:', error);
    res.status(500).json({ error: 'Failed to check featured status' });
  }
};
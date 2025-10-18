//db table: admin_highlights
import promisePool from '../../database.js';

// Get all highlights for an admin's organization
export const getAdminHighlights = async (req, res) => {
  try {
    const { organization_id: orgId } = req.admin;
    
    const query = `
      SELECT 
        id,
        title,
        description,
        media_files,
        status,
        organization_id,
        created_by,
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
      media: highlight.media_files ? JSON.parse(highlight.media_files) : []
    }));
    
    res.json({ highlights });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch highlights' });
  }
};

// Get a single highlight by ID
export const getHighlightById = async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_id: orgId } = req.admin;
    
    const query = `
      SELECT 
        id,
        title,
        description,
        media_files,
        organization_id,
        created_by,
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
      media: rows[0].media_files ? JSON.parse(rows[0].media_files) : []
    };
    
    res.json({ highlight });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch highlight' });
  }
};

// Create a new highlight
export const createHighlight = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { title, description, media = [] } = req.body;
    const { organization_id: orgId, id: adminId } = req.admin;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    // Insert highlight with media files as JSON and default status as 'pending'
    const highlightQuery = `
      INSERT INTO admin_highlights (title, description, media_files, status, organization_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, ?, NOW(), NOW())
    `;
    
    const mediaFilesJson = JSON.stringify(media);
    
    const [highlightResult] = await connection.execute(highlightQuery, [
      title,
      description,
      mediaFilesJson,
      orgId,
      adminId
    ]);
    
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
    const { title, description, media = [] } = req.body;
    const { organization_id: orgId } = req.admin;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    // Check if highlight exists and belongs to organization, get current data
    const checkQuery = 'SELECT * FROM admin_highlights WHERE id = ? AND organization_id = ?';
    const [checkRows] = await connection.execute(checkQuery, [id, orgId]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    const currentHighlight = checkRows[0];
    
    // Update highlight with media files as JSON
    const updateQuery = `
      UPDATE admin_highlights 
      SET title = ?, description = ?, media_files = ?, updated_at = NOW()
      WHERE id = ? AND organization_id = ?
    `;
    
    const mediaFilesJson = JSON.stringify(media);
    
    await connection.execute(updateQuery, [title, description, mediaFilesJson, id, orgId]);
    
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
      action: 'update'
    });
    
    const proposedData = JSON.stringify({
      highlight_id: id,
      title,
      description,
      media_files: mediaFilesJson,
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
    
    // Delete highlight (media files are stored as JSON, so no separate deletion needed)
    await connection.execute('DELETE FROM admin_highlights WHERE id = ? AND organization_id = ?', [id, orgId]);
    
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
  const query = `
    SELECT 
      id,
      title,
      description,
      media_files,
      organization_id,
      created_by,
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
    media: rows[0].media_files ? JSON.parse(rows[0].media_files) : []
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
      media: highlight.media_files ? JSON.parse(highlight.media_files) : []
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
      media: highlight.media_files ? JSON.parse(highlight.media_files) : []
    }));
    
    res.json({ highlights });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approved highlights' });
  }
};
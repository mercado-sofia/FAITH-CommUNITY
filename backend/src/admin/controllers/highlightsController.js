//db table: admin_highlights
import promisePool from '../../database.js';
import { getOrganizationLogoUrl } from '../../utils/imageUrlUtils.js';

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
    
    // Check if year column exists
    const [yearColumnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'year'
    `);
    const hasYearColumn = yearColumnCheck[0]?.count > 0;
    
    // Build query with or without program_id column and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    const yearSelect = hasYearColumn ? ', h.year' : '';
    const query = `
      SELECT 
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.status,
        h.organization_id,
        h.created_by${programIdSelect}${programTitleSelect}${yearSelect},
        h.created_at,
        h.updated_at
      FROM admin_highlights h
      ${programJoin}
      WHERE h.organization_id = ?
      ORDER BY h.created_at DESC
    `;
    
    const [rows] = await promisePool.execute(query, [orgId]);
    
    // Parse JSON media_files and format the data
    const highlights = rows.map(highlight => {
      // Ensure program_id is properly handled (don't use || null as it converts 0 to null)
      const programId = hasProgramIdColumn 
        ? (highlight.program_id !== null && highlight.program_id !== undefined ? highlight.program_id : null)
        : null;
      
      return {
        ...highlight,
        media: safeParseJSON(highlight.media_files, []),
        program_id: programId,
        program_title: hasProgramIdColumn ? (highlight.program_title || null) : null,
        year: hasYearColumn ? (highlight.year || null) : null
      };
    });
    
    res.json({ highlights });
  } catch (error) {
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
    
    // Check if year column exists
    const [yearColumnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'year'
    `);
    const hasYearColumn = yearColumnCheck[0]?.count > 0;
    
    // Build query with or without program_id column and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    const yearSelect = hasYearColumn ? ', h.year' : '';
    const query = `
      SELECT 
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.organization_id,
        h.created_by${programIdSelect}${programTitleSelect}${yearSelect},
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
    
    // Ensure program_id is properly handled (don't use || null as it converts 0 to null)
    const programId = hasProgramIdColumn 
      ? (rows[0].program_id !== null && rows[0].program_id !== undefined ? rows[0].program_id : null)
      : null;
    
    const highlight = {
      ...rows[0],
      media: safeParseJSON(rows[0].media_files, []),
      program_id: programId,
      program_title: hasProgramIdColumn ? (rows[0].program_title || null) : null,
      year: hasYearColumn ? (rows[0].year || null) : null
    };
    
    res.json({ highlight });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch highlight', details: error.message });
  }
};

// Create a new highlight
export const createHighlight = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { title, description, media = [], program_id, year } = req.body;
    const { organization_id: orgId, id: adminId } = req.admin;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    // Validate program_id is required
    if (!program_id) {
      return res.status(400).json({ error: 'Associated Program is required' });
    }
    
    // Validate year if provided
    if (year !== null && year !== undefined) {
      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 10) {
        return res.status(400).json({ error: 'Year must be a valid year between 1900 and ' + (new Date().getFullYear() + 10) });
      }
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
    
    // Check if year column exists
    const [yearColumnCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'year'
    `);
    const hasYearColumn = yearColumnCheck[0]?.count > 0;
    
    // Build INSERT query with or without program_id and year columns
    const programIdColumn = hasProgramIdColumn ? ', program_id' : '';
    const programIdValue = hasProgramIdColumn ? ', ?' : '';
    const yearColumn = hasYearColumn ? ', year' : '';
    const yearValue = hasYearColumn ? ', ?' : '';
    const highlightQuery = `
      INSERT INTO admin_highlights (title, description, media_files, status, organization_id, created_by${programIdColumn}${yearColumn}, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, ?${programIdValue}${yearValue}, NOW(), NOW())
    `;
    
    const mediaFilesJson = JSON.stringify(media);
    
    const insertParams = [];
    insertParams.push(title, description, mediaFilesJson, orgId, adminId);
    if (hasProgramIdColumn) {
      insertParams.push(program_id || null);
    }
    if (hasYearColumn) {
      insertParams.push(year !== null && year !== undefined ? parseInt(year, 10) : null);
    }
    
    const [highlightResult] = await connection.execute(highlightQuery, insertParams);
    
    const highlightId = highlightResult.insertId;
    
    // Create a submission record for the highlight
    const submissionQuery = `
      INSERT INTO submissions (organization_id, section, proposed_data, submitted_by, status, submitted_at)
      VALUES (?, 'highlights', ?, ?, 'pending', NOW())
    `;
    
    const proposedData = JSON.stringify({
      highlight_id: highlightId,
      title,
      description,
      media_files: mediaFilesJson,
      program_id: program_id || null,
      year: year !== null && year !== undefined ? parseInt(year, 10) : null,
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
    const { title, description, media = [], program_id, year } = req.body;
    const { organization_id: orgId } = req.admin;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    // Validate program_id is required and is a valid positive integer
    if (!program_id || program_id === null || program_id === undefined) {
      return res.status(400).json({ error: 'Associated Program is required' });
    }
    
    // Ensure program_id is a valid positive integer
    const programIdNum = parseInt(program_id, 10);
    if (isNaN(programIdNum) || programIdNum <= 0) {
      return res.status(400).json({ error: 'Invalid program ID. Must be a positive integer.' });
    }
    
    // Validate year if provided
    if (year !== null && year !== undefined) {
      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 10) {
        return res.status(400).json({ error: 'Year must be a valid year between 1900 and ' + (new Date().getFullYear() + 10) });
      }
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
    
    // Check if year column exists
    const [yearColumnCheck] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'year'
    `);
    const hasYearColumn = yearColumnCheck[0]?.count > 0;
    
    // Build UPDATE query with or without program_id and year columns
    const programIdUpdate = hasProgramIdColumn ? ', program_id = ?' : '';
    const yearUpdate = hasYearColumn ? ', year = ?' : '';
    const updateQuery = `
      UPDATE admin_highlights 
      SET title = ?, description = ?, media_files = ?${programIdUpdate}${yearUpdate}, updated_at = NOW()
      WHERE id = ? AND organization_id = ?
    `;
    
    const mediaFilesJson = JSON.stringify(media);
    
    // Ensure program_id is a number for the database
    const programIdForDb = hasProgramIdColumn ? programIdNum : null;
    const yearForDb = hasYearColumn ? (year !== null && year !== undefined ? parseInt(year, 10) : null) : null;
    
    const updateParams = [];
    updateParams.push(title, description, mediaFilesJson);
    if (hasProgramIdColumn) {
      updateParams.push(programIdForDb);
    }
    if (hasYearColumn) {
      updateParams.push(yearForDb);
    }
    updateParams.push(id, orgId);
    
    await connection.execute(updateQuery, updateParams);
    
    // Only create a submission record if the highlight is not already approved
    // If the highlight is already approved, admins can update it directly without requiring approval
    const currentStatus = currentHighlight.status;
    if (currentStatus !== 'approved') {
      // Create a submission record for the highlight update (only for pending/rejected highlights)
      const submissionQuery = `
        INSERT INTO submissions (organization_id, section, proposed_data, submitted_by, status, submitted_at)
        VALUES (?, 'highlights', ?, ?, 'pending', NOW())
      `;
      
      const proposedData = JSON.stringify({
        highlight_id: id,
        title,
        description,
        media_files: mediaFilesJson,
        program_id: program_id || null,
        year: year !== null && year !== undefined ? parseInt(year, 10) : null,
        action: 'update'
      });
      
      await connection.execute(submissionQuery, [
        orgId,
        proposedData,
        req.admin.id
      ]);
    }
    
    await connection.commit();
    
    // Fetch the updated highlight
    const updatedHighlight = await getHighlightByIdInternal(connection, id);
    
    res.json({ 
      message: 'Highlight updated successfully',
      highlight: updatedHighlight
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ 
      error: 'Failed to update highlight',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    
    // Validate ID parameter
    if (!id || id === '0' || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid highlight ID' });
    }
    
    // Check if user is superadmin - if so, delete immediately
    if (req.superadmin) {
      // Superadmin can delete immediately without approval workflow
      const checkQuery = 'SELECT * FROM admin_highlights WHERE id = ?';
      const [checkRows] = await connection.execute(checkQuery, [id]);
      
      if (checkRows.length === 0) {
        return res.status(404).json({ error: 'Highlight not found' });
      }
      
      // Delete from featured_highlights first (if exists) due to foreign key constraint
      await connection.execute(
        'DELETE FROM featured_highlights WHERE highlight_id = ?',
        [id]
      );
      
      // Permanently delete the highlight
      await connection.execute(
        'DELETE FROM admin_highlights WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      return res.json({ message: 'Highlight deleted successfully' });
    }
    
    // For admins, use the existing approval workflow
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
      INSERT INTO submissions (organization_id, section, proposed_data, submitted_by, status, submitted_at)
      VALUES (?, 'highlights', ?, ?, 'pending', NOW())
    `;
    
    const proposedData = JSON.stringify({
      highlight_id: id,
      title: currentHighlight.title,
      description: currentHighlight.description,
      media_files: currentHighlight.media_files,
      action: 'delete'
    });
    
    await connection.execute(submissionQuery, [
      orgId,
      proposedData,
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
  
  // Check if year column exists
  const [yearColumnCheck] = await connection.execute(`
    SELECT COUNT(*) as count 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'admin_highlights' 
    AND COLUMN_NAME = 'year'
  `);
  const hasYearColumn = yearColumnCheck[0]?.count > 0;
  
  // Build query with or without program_id column and program title
  const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
  const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
  const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
  const yearSelect = hasYearColumn ? ', h.year' : '';
  const query = `
    SELECT 
      h.id,
      h.title,
      h.description,
      h.media_files,
      h.organization_id,
      h.created_by${programIdSelect}${programTitleSelect}${yearSelect},
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
    program_title: hasProgramIdColumn ? (rows[0].program_title || null) : null,
    year: hasYearColumn ? (rows[0].year || null) : null
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
    
    // Check if year column exists
    const [yearColumnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'year'
    `);
    const hasYearColumn = yearColumnCheck[0]?.count > 0;
    
    // Build query with or without program_id and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    const yearSelect = hasYearColumn ? ', h.year' : '';
    
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
        o.logo as organization_logo,
        a.email as admin_email${programIdSelect}${programTitleSelect}${yearSelect}
      FROM admin_highlights h
      LEFT JOIN organizations o ON h.organization_id = o.id
      LEFT JOIN users a ON h.created_by = a.id AND a.role = 'admin'
      ${programJoin}
    `;
    
    const queryParams = [];
    
    if (status && status !== 'all') {
      query += ` WHERE h.status = ?`;
      queryParams.push(status);
    }
    
    query += ` ORDER BY h.created_at DESC`;
    
    const [rows] = await promisePool.execute(query, queryParams);
    
    // Parse JSON media_files and format the data
    const highlights = rows.map(highlight => {
      // Process organization logo URL
      let logoUrl = null;
      if (highlight.organization_logo) {
        logoUrl = getOrganizationLogoUrl(highlight.organization_logo);
      }
      
      return {
        ...highlight,
        media: safeParseJSON(highlight.media_files, []),
        program_id: hasProgramIdColumn ? (highlight.program_id || null) : null,
        program_title: hasProgramIdColumn ? (highlight.program_title || null) : null,
        year: hasYearColumn ? (highlight.year || null) : null,
        organization_logo: logoUrl
      };
    });
    
    res.json({ highlights });
  } catch (error) {
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
    
    // Check if year column exists
    const [yearColumnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'year'
    `);
    const hasYearColumn = yearColumnCheck[0]?.count > 0;
    
    // Build query with or without program_id and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    const yearSelect = hasYearColumn ? ', h.year' : '';
    
    const query = `
      SELECT 
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.created_at,
        h.organization_id,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as organization_logo,
        o.org_color as organization_color${programIdSelect}${programTitleSelect}${yearSelect}
      FROM admin_highlights h
      LEFT JOIN organizations o ON h.organization_id = o.id
      LEFT JOIN users a ON h.created_by = a.id AND a.role = 'admin'
      ${programJoin}
      WHERE h.status = 'approved'
        AND h.status != 'archived'
        AND o.id IS NOT NULL
        AND o.status = 'ACTIVE'
        AND a.id IS NOT NULL
        AND a.is_active = TRUE
      ORDER BY h.created_at DESC
    `;
    
    const [rows] = await promisePool.execute(query);
    
    // Parse JSON media_files and format the data
    const highlights = rows.map(highlight => {
      // Process organization logo URL
      let logoUrl = null;
      if (highlight.organization_logo) {
        logoUrl = getOrganizationLogoUrl(highlight.organization_logo);
      }
      
      return {
        ...highlight,
        media: safeParseJSON(highlight.media_files, []),
        program_id: hasProgramIdColumn ? (highlight.program_id || null) : null,
        program_title: hasProgramIdColumn ? (highlight.program_title || null) : null,
        year: hasYearColumn ? (highlight.year || null) : null,
        organization_logo: logoUrl
      };
    });
    
    res.json({ highlights });
  } catch (error) {
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
    
    // Check if year column exists
    const [yearColumnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'year'
    `);
    const hasYearColumn = yearColumnCheck[0]?.count > 0;
    
    // Build query with or without program_id and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    const yearSelect = hasYearColumn ? ', h.year' : '';
    
    const query = `
      SELECT 
        fh.highlight_id,
        fh.display_order,
        fh.impact_level,
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.created_at,
        h.organization_id,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as organization_logo,
        o.org_color as organization_color${programIdSelect}${programTitleSelect}${yearSelect}
      FROM featured_highlights fh
      INNER JOIN admin_highlights h ON fh.highlight_id = h.id
      LEFT JOIN organizations o ON h.organization_id = o.id
      LEFT JOIN users a ON h.created_by = a.id AND a.role = 'admin'
      ${programJoin}
      WHERE h.status = 'approved'
        AND h.status != 'archived'
        AND o.id IS NOT NULL
        AND o.status = 'ACTIVE'
        AND a.id IS NOT NULL
        AND a.is_active = TRUE
      ORDER BY fh.display_order ASC
    `;
    
    const [rows] = await promisePool.execute(query);
    
    const highlights = rows.map(highlight => ({
      ...highlight,
      media: safeParseJSON(highlight.media_files, []),
      program_id: hasProgramIdColumn ? (highlight.program_id || null) : null,
      program_title: hasProgramIdColumn ? (highlight.program_title || null) : null,
      year: hasYearColumn ? (highlight.year || null) : null
    }));
    
    res.json({ highlights });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch featured highlights',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add highlight to featured
export const addFeaturedHighlight = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id: highlightId } = req.params;
    const { impact_level = 'average', organization_id } = req.body;
    
    // Validate impact_level
    if (impact_level && !['low', 'average', 'high'].includes(impact_level)) {
      return res.status(400).json({ error: 'Invalid impact_level. Must be low, average, or high' });
    }
    
    // Check if highlight exists and is approved
    const [highlightRows] = await connection.execute(
      'SELECT id, status, organization_id FROM admin_highlights WHERE id = ?',
      [highlightId]
    );
    
    if (highlightRows.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    if (highlightRows[0].status !== 'approved') {
      return res.status(400).json({ error: 'Only approved highlights can be featured' });
    }
    
    // Use organization_id from highlight if not provided in body
    const orgId = organization_id || highlightRows[0].organization_id;
    
    // Check if already featured
    const [existing] = await connection.execute(
      'SELECT id FROM featured_highlights WHERE highlight_id = ?',
      [highlightId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Highlight is already featured' });
    }
    
    // Get next global display order (not per organization, since we support unlimited highlights)
    const [orderRows] = await connection.execute(
      `SELECT COALESCE(MAX(fh.display_order), 0) as max_order
       FROM featured_highlights fh`
    );
    const displayOrder = (orderRows[0].max_order || 0) + 1;
    
    // Add to featured with impact_level
    await connection.execute(
      'INSERT INTO featured_highlights (highlight_id, display_order, impact_level) VALUES (?, ?, ?)',
      [highlightId, displayOrder, impact_level || 'average']
    );
    
    await connection.commit();
    res.json({ message: 'Highlight added to featured', displayOrder, impact_level: impact_level || 'average' });
  } catch (error) {
    await connection.rollback();
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
    res.status(500).json({ error: 'Failed to remove featured highlight' });
  } finally {
    connection.release();
  }
};

// Check if highlight is featured
export const checkFeaturedStatus = async (req, res) => {
  try {
    const { id: highlightId } = req.params;
    
    // First check if highlight is archived - archived highlights cannot be featured
    const [statusRows] = await promisePool.execute(
      'SELECT status FROM admin_highlights WHERE id = ?',
      [highlightId]
    );
    
    // If highlight is archived, return false for featured status
    if (statusRows.length > 0 && statusRows[0].status === 'archived') {
      return res.json({ 
        isFeatured: false,
        displayOrder: null
      });
    }
    
    const [rows] = await promisePool.execute(
      'SELECT display_order FROM featured_highlights WHERE highlight_id = ?',
      [highlightId]
    );
    
    res.json({ 
      isFeatured: rows.length > 0,
      displayOrder: rows.length > 0 ? rows[0].display_order : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check featured status' });
  }
};

// Archive a highlight (admin or superadmin)
export const archiveHighlight = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || id === '0' || isNaN(parseInt(id))) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid highlight ID' });
    }
    
    // Check if highlight exists and verify permissions
    let checkQuery;
    let checkParams;
    
    if (req.superadmin) {
      // Superadmin can archive any highlight
      checkQuery = 'SELECT * FROM admin_highlights WHERE id = ?';
      checkParams = [id];
    } else {
      // Admin can only archive highlights from their organization
      const organizationId = req.admin?.organization_id;
      if (!organizationId) {
        await connection.rollback();
        return res.status(400).json({ error: 'Admin organization ID is missing' });
      }
      checkQuery = 'SELECT * FROM admin_highlights WHERE id = ? AND organization_id = ?';
      checkParams = [id, organizationId];
    }
    
    const [checkRows] = await connection.execute(checkQuery, checkParams);
    
    if (checkRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Highlight not found or you don\'t have permission to archive it' });
    }
    
    const currentHighlight = checkRows[0];
    
    // Don't allow archiving if already archived
    if (currentHighlight.status === 'archived') {
      await connection.rollback();
      return res.status(400).json({ error: 'Highlight is already archived' });
    }
    
    // Update status to archived
    await connection.execute(
      'UPDATE admin_highlights SET status = ?, updated_at = NOW() WHERE id = ?',
      ['archived', id]
    );
    
    // If the highlight was featured, remove it from featured_highlights
    await connection.execute(
      'DELETE FROM featured_highlights WHERE highlight_id = ?',
      [id]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Highlight archived successfully',
      highlight: {
        id: parseInt(id),
        status: 'archived'
      }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to archive highlight', details: error.message });
  } finally {
    connection.release();
  }
};

// Unarchive a highlight (restore from archived status)
export const unarchiveHighlight = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || id === '0' || isNaN(parseInt(id))) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid highlight ID' });
    }
    
    // Check if highlight exists and verify permissions
    let checkQuery;
    let checkParams;
    
    if (req.superadmin) {
      // Superadmin can unarchive any highlight
      checkQuery = 'SELECT * FROM admin_highlights WHERE id = ?';
      checkParams = [id];
    } else {
      // Admin can only unarchive highlights from their organization
      const organizationId = req.admin?.organization_id;
      if (!organizationId) {
        await connection.rollback();
        return res.status(400).json({ error: 'Admin organization ID is missing' });
      }
      checkQuery = 'SELECT * FROM admin_highlights WHERE id = ? AND organization_id = ?';
      checkParams = [id, organizationId];
    }
    
    const [checkRows] = await connection.execute(checkQuery, checkParams);
    
    if (checkRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Highlight not found or you don\'t have permission to unarchive it' });
    }
    
    const currentHighlight = checkRows[0];
    
    // Only allow unarchiving if currently archived
    if (currentHighlight.status !== 'archived') {
      await connection.rollback();
      return res.status(400).json({ error: 'Highlight is not archived' });
    }
    
    // Restore status to approved (since it was previously approved before archiving)
    // Ensure featured status is not restored - if highlight was featured before archiving,
    // it should remain unfeatured after restoration
    await connection.execute(
      'UPDATE admin_highlights SET status = ?, updated_at = NOW() WHERE id = ?',
      ['approved', id]
    );
    
    // Explicitly ensure highlight is not in featured_highlights table after unarchiving
    // (This is a safety check - archive already removes it, but ensure it stays removed)
    await connection.execute(
      'DELETE FROM featured_highlights WHERE highlight_id = ?',
      [id]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Highlight unarchived successfully',
      highlight: {
        id: parseInt(id),
        status: 'approved'
      }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to unarchive highlight', details: error.message });
  } finally {
    connection.release();
  }
};

// Get all archived highlights (admin or superadmin)
export const getArchivedHighlights = async (req, res) => {
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
    
    // Check if year column exists
    const [yearColumnCheck] = await promisePool.execute(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'admin_highlights' 
      AND COLUMN_NAME = 'year'
    `);
    const hasYearColumn = yearColumnCheck[0]?.count > 0;
    
    // Build query with or without program_id column and program title
    const programIdSelect = hasProgramIdColumn ? ', h.program_id' : '';
    const programJoin = hasProgramIdColumn ? 'LEFT JOIN programs_projects p ON h.program_id = p.id' : '';
    const programTitleSelect = hasProgramIdColumn ? ', p.title as program_title' : '';
    const yearSelect = hasYearColumn ? ', h.year' : '';
    
    // Build WHERE clause based on user role
    let whereClause = 'WHERE h.status = \'archived\'';
    let queryParams = [];
    
    if (!req.superadmin && req.admin) {
      // Admin can only see archived highlights from their organization
      const organizationId = req.admin?.organization_id;
      if (!organizationId) {
        return res.status(400).json({ error: 'Admin organization ID is missing' });
      }
      whereClause += ' AND h.organization_id = ?';
      queryParams.push(organizationId);
    }
    // Superadmin can see all archived highlights (no additional filter)
    
    const query = `
      SELECT 
        h.id,
        h.title,
        h.description,
        h.media_files,
        h.status,
        h.organization_id,
        h.created_by${programIdSelect}${programTitleSelect}${yearSelect},
        h.created_at,
        h.updated_at,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as organization_logo
      FROM admin_highlights h
      LEFT JOIN organizations o ON h.organization_id = o.id
      LEFT JOIN users a ON h.created_by = a.id AND a.role = 'admin'
      ${programJoin}
      ${whereClause}
      ORDER BY h.updated_at DESC, h.created_at DESC
    `;
    
    const [rows] = await promisePool.execute(query, queryParams);
    
    // Parse JSON media_files and format the data
    const highlights = rows.map(highlight => {
      // Process organization logo URL
      let logoUrl = null;
      if (highlight.organization_logo) {
        logoUrl = getOrganizationLogoUrl(highlight.organization_logo);
      }
      
      return {
        ...highlight,
        media: safeParseJSON(highlight.media_files, []),
        program_id: hasProgramIdColumn ? (highlight.program_id || null) : null,
        program_title: hasProgramIdColumn ? (highlight.program_title || null) : null,
        year: hasYearColumn ? (highlight.year || null) : null,
        organization_logo: logoUrl
      };
    });
    
    res.json({ highlights });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch archived highlights', details: error.message });
  }
};

// Delete highlight for superadmin (immediate permanent deletion)
export const deleteHighlightForSuperadmin = async (req, res) => {
  // Check if user is superadmin
  if (!req.superadmin) {
    return res.status(403).json({ error: 'Only superadmin can delete highlights directly' });
  }
  
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || id === '0' || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid highlight ID' });
    }
    
    // Check if highlight exists
    const checkQuery = 'SELECT * FROM admin_highlights WHERE id = ?';
    const [checkRows] = await connection.execute(checkQuery, [id]);
    
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    // Delete from featured_highlights first (if exists) due to foreign key constraint
    await connection.execute(
      'DELETE FROM featured_highlights WHERE highlight_id = ?',
      [id]
    );
    
    // Permanently delete the highlight
    await connection.execute(
      'DELETE FROM admin_highlights WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    
    res.json({ message: 'Highlight deleted successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to delete highlight', details: error.message });
  } finally {
    connection.release();
  }
};
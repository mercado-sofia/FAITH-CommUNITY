//db table: volunteers
import db from '../../database.js';

// Submit volunteer application
export const applyVolunteer = async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = ['program_id', 'user_id', 'reason'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const {
      program_id,
      user_id,
      reason
    } = req.body;

    // Check if user exists
    const [userRows] = await db.execute(
      'SELECT id FROM users WHERE id = ? AND is_active = 1',
      [user_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found or inactive' });
    }

    // Check if user already applied for this program
    const [existingApplication] = await db.execute(
      'SELECT id FROM volunteers WHERE user_id = ? AND program_id = ?',
      [user_id, program_id]
    );

    if (existingApplication.length > 0) {
      return res.status(409).json({ error: 'You have already applied for this program' });
    }

    const [result] = await db.execute(
      `INSERT INTO volunteers (
        user_id, program_id, reason, status, created_at
      ) VALUES (?, ?, ?, 'Pending', NOW())`,
      [user_id, program_id, reason]
    );

    res.status(201).json({ 
      message: 'Application submitted successfully', 
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error in applyVolunteer:', error);
    res.status(500).json({ error: error.message });
  }
};

// Admin view: get all volunteers
export const getAllVolunteers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
        v.id,
        v.program_id,
        v.reason,
        v.status,
        v.created_at,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email,
        u.contact_number,
        u.gender,
        u.address,
        u.occupation,
        u.citizenship,
        u.birth_date,
        u.profile_photo_url,
        p.title as program_name,
        p.title as program_title,
        a.orgName as organization_name
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       LEFT JOIN programs_projects p ON v.program_id = p.id
       LEFT JOIN admins a ON a.organization_id = p.organization_id
       WHERE u.is_active = 1
       ORDER BY v.created_at DESC`
    );

    // Calculate age from birth_date
    const volunteersWithAge = rows.map(row => {
      const age = row.birth_date ? 
        Math.floor((new Date() - new Date(row.birth_date)) / (365.25 * 24 * 60 * 60 * 1000)) : 
        null;
      
      return {
        ...row,
        age,
        // Format the date to a string to avoid JSON serialization issues
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null
      };
    });

    res.json({ data: volunteersWithAge });
  } catch (error) {
    console.error('Error in getAllVolunteers:', error);
    res.status(500).json({ error: 'Failed to retrieve volunteers' });
  }
};

// Admin view: update status
export const updateVolunteerStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.execute(
      `UPDATE volunteers SET status = ? WHERE id = ?`,
      [status, id]
    );
    res.json({ message: `Volunteer status updated to ${status}` });
  } catch (error) {
    console.error('Error in updateVolunteerStatus:', error);
    res.status(500).json({ error: error.message });
  }
};

// Admin view: get one volunteer
export const getVolunteerById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT 
        v.id,
        v.program_id,
        v.reason,
        v.status,
        v.created_at,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email,
        u.contact_number,
        u.gender,
        u.address,
        u.occupation,
        u.citizenship,
        u.birth_date,
        u.profile_photo_url,
        p.title as program_name,
        p.title as program_title,
        a.orgName as organization_name
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       LEFT JOIN programs_projects p ON v.program_id = p.id
       LEFT JOIN admins a ON a.organization_id = p.organization_id
       WHERE v.id = ? AND u.is_active = 1`, 
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    const volunteer = rows[0];
    
    // Calculate age from birth_date
    const age = volunteer.birth_date ? 
      Math.floor((new Date() - new Date(volunteer.birth_date)) / (365.25 * 24 * 60 * 60 * 1000)) : 
      null;
    
    volunteer.age = age;

    res.json(volunteer);
  } catch (error) {
    console.error('Error in getVolunteerById:', error);
    res.status(500).json({ error: error.message });
  }
};
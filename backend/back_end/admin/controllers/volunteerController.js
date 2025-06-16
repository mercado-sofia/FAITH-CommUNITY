//db table: volunteers
import db from '../../database.js';

// Submit volunteer application
export const applyVolunteer = async (req, res) => {
  try {
    console.log('Received form data:', req.body); // Debug log

    // Validate required fields
    const requiredFields = ['program_id', 'full_name', 'age', 'gender', 'email', 'phone_number', 'address', 'occupation', 'citizenship', 'reason'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const {
      program_id,
      full_name,
      age,
      gender,
      email,
      phone_number,
      address,
      occupation,
      citizenship,
      reason
    } = req.body;

    // Get the file path if a file was uploaded
    const valid_id = req.file ? req.file.filename : null;

    const [result] = await db.execute(
      `INSERT INTO volunteers (
        program_id, full_name, age, gender, email, phone_number,
        address, occupation, citizenship, reason, status, valid_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, NOW())`,
      [
        program_id, full_name, age, gender, email, phone_number,
        address, occupation, citizenship, reason, valid_id
      ]
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
    // First try to get all volunteers without the join
    const [rows] = await db.execute(
      `SELECT 
        id,
        program_id,
        full_name,
        age,
        gender,
        email,
        phone_number,
        address,
        occupation,
        citizenship,
        reason,
        status,
        valid_id,
        created_at
       FROM volunteers 
       ORDER BY created_at DESC`
    );

    // Map program_id to program name
    const programNames = {
      1: "CLIQUE",
      2: "LinkUp",
      3: "RiseUp",
      4: "FaithSteps",
      5: "ScholarSync"
    };

    // Add program name to each row
    const volunteersWithProgram = rows.map(row => ({
      ...row,
      program: programNames[row.program_id] || `Program ${row.program_id}`,
      // Format the date to a string to avoid JSON serialization issues
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null
    }));

    res.json(volunteersWithProgram);
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
      `SELECT * FROM volunteers WHERE id = ?`, 
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    // Map program_id to program name
    const programNames = {
      1: "CLIQUE",
      2: "LinkUp",
      3: "RiseUp",
      4: "FaithSteps",
      5: "ScholarSync"
    };

    const volunteer = {
      ...rows[0],
      program: programNames[rows[0].program_id] || `Program ${rows[0].program_id}`
    };

    res.json(volunteer);
  } catch (error) {
    console.error('Error in getVolunteerById:', error);
    res.status(500).json({ error: error.message });
  }
};
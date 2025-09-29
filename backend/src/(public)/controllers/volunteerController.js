// Consolidated Volunteer Controller - handles both public and admin operations
// db table: volunteers
import db from "../../database.js";
import { createUserNotification } from './userController.js';
import { calculateAge } from '../../utils/dateUtils.js';

// Status validation constants
const VALID_STATUSES = ['Pending', 'Approved', 'Declined', 'Cancelled', 'Completed'];
const STATUS_TRANSITIONS = {
  'Pending': ['Approved', 'Declined', 'Cancelled'],
  'Approved': ['Cancelled', 'Completed'],
  'Declined': [], // Cannot transition from declined
  'Cancelled': [], // Cannot transition from cancelled
  'Completed': [] // Cannot transition from completed
};

// Validate status transition
const isValidStatusTransition = (currentStatus, newStatus) => {
  return STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) || false;
};

// Submit volunteer application (public endpoint)
export const submitVolunteer = async (req, res) => {
  try {
    const {
      program_id,
      reason,
    } = req.body;

    // Get user_id from the authenticated user (from JWT token)
    const user_id = req.user?.id;
    
    if (!user_id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate required fields
    if (!program_id || !reason) {
      return res.status(400).json({
        error: "Program selection and reason are required.",
      });
    }

    // Check if user exists and is active
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

    // Verify the program exists and is approved
    const [programRows] = await db.execute(
      'SELECT id, status FROM programs_projects WHERE id = ? AND status = "Upcoming" AND is_approved = TRUE',
      [program_id]
    );

    if (programRows.length === 0) {
      return res.status(404).json({ error: 'Program not found or not available for applications' });
    }

    const sql = `
      INSERT INTO volunteers 
      (user_id, program_id, reason, status, created_at)
      VALUES (?, ?, ?, 'Pending', NOW())
    `;

    const values = [user_id, program_id, reason];

    const [result] = await db.execute(sql, values);
    const volunteerId = result.insertId;

    // Get program and organization info for notifications
    const [programInfo] = await db.execute(`
      SELECT p.title as program_title, p.organization_id, o.orgName, o.org
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = ?
    `, [program_id]);

    if (programInfo.length > 0) {
      const program = programInfo[0];
      
      // Find all admins of this organization
      const [adminRows] = await db.execute(
        "SELECT id FROM admins WHERE organization_id = ?",
        [program.organization_id]
      );

      // Create notifications for all admins of this organization
      if (adminRows.length > 0) {
        const notificationPromises = adminRows.map(admin => {
          const notificationTitle = "New Volunteer Application";
          const notificationMessage = `A new volunteer application has been submitted for "${program.program_title}" program.`;
          
          return createUserNotification(
            admin.id,
            'volunteer_application',
            notificationTitle,
            notificationMessage,
            'volunteers',
            volunteerId
          );
        });

        await Promise.all(notificationPromises);
      }
    }

    res.status(200).json({
      success: true,
      message: "Application submitted successfully",
      id: volunteerId,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      error: "Database error",
      details: err.message,
    });
  }
};

// Admin endpoint: Submit volunteer application (for admin use)
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

// Get all volunteers (admin view)
export const getAllVolunteers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT 
        v.id,
        v.program_id,
        v.reason,
        v.status,
        v.created_at,
        v.updated_at,
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
        o.orgName as organization_name
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       LEFT JOIN programs_projects p ON v.program_id = p.id
       LEFT JOIN organizations o ON o.id = p.organization_id
       WHERE u.is_active = 1
       ORDER BY v.created_at DESC`
    );

    // Calculate age from birth_date using centralized utility
    const volunteersWithAge = rows.map(row => {
      const age = calculateAge(row.birth_date);
      
      return {
        ...row,
        age,
        // Format the date to a string to avoid JSON serialization issues
        created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
      };
    });

    res.json({ data: volunteersWithAge });
  } catch (error) {
    console.error('Error in getAllVolunteers:', error);
    res.status(500).json({ error: 'Failed to retrieve volunteers' });
  }
};

// Get volunteers by organization
export const getVolunteersByOrganization = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const [results] = await db.execute(`
      SELECT 
        v.id,
        v.program_id,
        v.reason,
        v.status,
        v.created_at,
        v.updated_at,
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
        o.orgName as organization_name,
        o.id as organization_id
      FROM volunteers v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON o.id = p.organization_id
      WHERE o.id = ? AND u.is_active = 1
      ORDER BY v.created_at DESC
    `, [orgId]);

    // Calculate age from birth_date using centralized utility
    const volunteersWithAge = results.map(volunteer => {
      const age = calculateAge(volunteer.birth_date);
      
      return {
        ...volunteer,
        age,
        created_at: volunteer.created_at ? new Date(volunteer.created_at).toISOString() : null,
        updated_at: volunteer.updated_at ? new Date(volunteer.updated_at).toISOString() : null
      };
    });
    
    res.status(200).json({
      success: true,
      count: volunteersWithAge.length,
      data: volunteersWithAge,
    });
  } catch (err) {
    console.error("Error fetching volunteers by organization:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get volunteers by admin's organization
export const getVolunteersByAdminOrg = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    // First get the admin's organization
    const [adminRows] = await db.execute(`
      SELECT o.org, o.id as org_id FROM admins a
      LEFT JOIN organizations o ON a.organization_id = o.id
      WHERE a.id = ?
    `, [adminId]);
    
    if (adminRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }
    
    const adminOrg = adminRows[0].org;
    const orgId = adminRows[0].org_id;
    
    // Now get volunteers for programs from that organization
    const [results] = await db.execute(`
      SELECT 
        v.id,
        v.program_id,
        v.reason,
        v.status,
        v.created_at,
        v.updated_at,
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
        o.orgName as organization_name,
        o.id as organization_id
      FROM volunteers v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON o.id = p.organization_id
      WHERE o.org = ? AND u.is_active = 1
      ORDER BY v.created_at DESC
    `, [adminOrg]);

    // Calculate age from birth_date using centralized utility
    const volunteersWithAge = results.map(volunteer => {
      const age = calculateAge(volunteer.birth_date);
      
      return {
        ...volunteer,
        age,
        created_at: volunteer.created_at ? new Date(volunteer.created_at).toISOString() : null,
        updated_at: volunteer.updated_at ? new Date(volunteer.updated_at).toISOString() : null
      };
    });
    
    res.status(200).json({
      success: true,
      count: volunteersWithAge.length,
      data: volunteersWithAge,
    });
  } catch (err) {
    console.error("Error fetching volunteers by admin organization:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get volunteer by ID
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
        v.updated_at,
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
        o.orgName as organization_name
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       LEFT JOIN programs_projects p ON v.program_id = p.id
       LEFT JOIN organizations o ON o.id = p.organization_id
       WHERE v.id = ? AND u.is_active = 1`, 
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Volunteer not found' });
    }

    const volunteer = rows[0];
    
    // Calculate age from birth_date using centralized utility
    const age = calculateAge(volunteer.birth_date);
    volunteer.age = age;
    volunteer.created_at = volunteer.created_at ? new Date(volunteer.created_at).toISOString() : null;
    volunteer.updated_at = volunteer.updated_at ? new Date(volunteer.updated_at).toISOString() : null;

    res.json(volunteer);
  } catch (error) {
    console.error('Error in getVolunteerById:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update volunteer status (unified function with proper validation)
export const updateVolunteerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status values
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` 
      });
    }
    
    // First, get the volunteer details to find the user and current status
    const [volunteerRows] = await db.execute(`
      SELECT v.*, p.title as program_name, u.id as user_id, u.email
      FROM volunteers v
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.id = ?
    `, [id]);
    
    if (volunteerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found"
      });
    }
    
    const volunteer = volunteerRows[0];
    
    // Validate status transition
    if (!isValidStatusTransition(volunteer.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${volunteer.status} to ${status}`
      });
    }
    
    // Update the volunteer status
    const [result] = await db.execute(`
      UPDATE volunteers 
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `, [status, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found"
      });
    }
    
    // Create notification for the user if they exist and status changed
    if (volunteer.user_id && volunteer.status !== status) {
      const programName = volunteer.program_name || 'Program';
      let notificationTitle, notificationMessage;
      
      if (status === 'Approved') {
        notificationTitle = 'Application Approved';
        notificationMessage = `Your volunteer application for "${programName}" has been approved! You will be contacted soon with further details.`;
      } else if (status === 'Declined') {
        notificationTitle = 'Application Status Update';
        notificationMessage = `Your volunteer application for "${programName}" has been reviewed. Please check your email for more details.`;
      } else if (status === 'Cancelled') {
        notificationTitle = 'Application Cancelled';
        notificationMessage = `Your volunteer application for "${programName}" has been cancelled.`;
      }
      
      if (notificationTitle && notificationMessage) {
        await createUserNotification(
          volunteer.user_id,
          'volunteer_status',
          notificationTitle,
          notificationMessage
        );
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Volunteer status updated to ${status}`,
      data: {
        id: parseInt(id),
        status: status,
        updated_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("Error updating volunteer status:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Soft delete volunteer (actual soft delete implementation)
export const softDeleteVolunteer = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if volunteer exists
    const [volunteerRows] = await db.execute(
      'SELECT id, status FROM volunteers WHERE id = ?',
      [id]
    );
    
    if (volunteerRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found"
      });
    }
    
    // Perform soft delete by setting status to 'Cancelled' and adding deleted flag
    const [result] = await db.execute(`
      UPDATE volunteers 
      SET status = 'Cancelled', updated_at = NOW()
      WHERE id = ?
    `, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Volunteer cancelled successfully"
    });
  } catch (err) {
    console.error("Error soft deleting volunteer:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Test endpoints
export const testGet = (req, res) => res.send("Hello from volunteer controller!");
export const testPost = (req, res) => {
  res.json({ success: true, message: "Test POST successful" });
};
export const testAuth = (req, res) => {
  res.json({ 
    success: true, 
    message: "Auth test successful",
    user: req.user,
    hasToken: !!req.headers.authorization
  });
};

// Get approved programs with status "Upcoming" for volunteer application dropdown
export const getApprovedUpcomingPrograms = async (req, res) => {
  try {
    // Get user_id from the authenticated user (from JWT token)
    const user_id = req.user?.id;
    
    let query, params;
    
    // Show all upcoming approved programs regardless of user application history
    query = `
      SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.status = 'Upcoming' AND p.is_approved = 1
      ORDER BY p.title ASC
    `;
    params = [];

    const [rows] = await db.execute(query, params);

    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error("Error fetching approved upcoming programs:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

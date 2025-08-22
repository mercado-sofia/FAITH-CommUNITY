// db table: volunteers
import db from "../../database.js";
import { createUserNotification } from './userController.js';

export const submitVolunteer = async (req, res) => {
  try {
    console.log('Submit volunteer request received');
    console.log('Request body:', req.body);
    console.log('Request user:', req.user);
    
    const {
      program_id,
      reason,
    } = req.body;

    // Get user_id from the authenticated user (from JWT token)
    const user_id = req.user?.id;
    
    console.log('Extracted user_id:', user_id);
    
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
      'SELECT id, status FROM programs_projects WHERE id = ? AND status = "Upcoming"',
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

    res.status(200).json({
      success: true,
      message: "Application submitted successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      error: "Database error",
      details: err.message,
    });
  }
};

export const getAllVolunteers = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT 
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
        o.orgName as organization_name
      FROM volunteers v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE u.is_active = 1
      ORDER BY v.created_at DESC
    `);

    // Calculate age from birth_date
    const volunteersWithAge = results.map(volunteer => {
      const age = volunteer.birth_date ? 
        Math.floor((new Date() - new Date(volunteer.birth_date)) / (365.25 * 24 * 60 * 60 * 1000)) : 
        null;
      
      return {
        ...volunteer,
        age
      };
    });

    res.status(200).json({
      success: true,
      count: volunteersWithAge.length,
      data: volunteersWithAge,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getVolunteersByOrganization = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const [results] = await db.query(`
      SELECT 
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
        o.orgName as organization_name,
        o.id as organization_id
      FROM volunteers v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE o.id = ? AND u.is_active = 1
      ORDER BY v.created_at DESC
    `, [orgId]);

    // Calculate age from birth_date
    const volunteersWithAge = results.map(volunteer => {
      const age = volunteer.birth_date ? 
        Math.floor((new Date() - new Date(volunteer.birth_date)) / (365.25 * 24 * 60 * 60 * 1000)) : 
        null;
      
      return {
        ...volunteer,
        age
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

export const getVolunteersByAdminOrg = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    // First get the admin's organization
    const [adminRows] = await db.query(`
      SELECT org FROM admins WHERE id = ?
    `, [adminId]);
    
    if (adminRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }
    
    const adminOrg = adminRows[0].org;
    
    // Now get volunteers for programs from that organization
    const [results] = await db.query(`
      SELECT 
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
        o.orgName as organization_name,
        o.id as organization_id
      FROM volunteers v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE o.org = ? AND u.is_active = 1
      ORDER BY v.created_at DESC
    `, [adminOrg]);

    // Calculate age from birth_date
    const volunteersWithAge = results.map(volunteer => {
      const age = volunteer.birth_date ? 
        Math.floor((new Date() - new Date(volunteer.birth_date)) / (365.25 * 24 * 60 * 60 * 1000)) : 
        null;
      
      return {
        ...volunteer,
        age
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

export const getVolunteerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [results] = await db.query(`
      SELECT 
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
        o.orgName as organization_name,
        o.id as organization_id
      FROM volunteers v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE v.id = ? AND u.is_active = 1
    `, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found"
      });
    }

    const volunteer = results[0];
    
    // Calculate age from birth_date
    const age = volunteer.birth_date ? 
      Math.floor((new Date() - new Date(volunteer.birth_date)) / (365.25 * 24 * 60 * 60 * 1000)) : 
      null;
    
    volunteer.age = age;
    
    res.status(200).json({
      success: true,
      data: volunteer,
    });
  } catch (err) {
    console.error("Error fetching volunteer by ID:", err);
    res.status(500).json({ error: err.message });
  }
};

export const updateVolunteerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // First, get the volunteer details to find the user
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
    
    // Create notification for the user if they exist
    if (volunteer.user_id) {
      const programName = volunteer.program_name || 'Program';
      let notificationTitle, notificationMessage;
      
      if (status === 'Approved') {
        notificationTitle = 'Application Approved';
        notificationMessage = `Your volunteer application for "${programName}" has been approved! You will be contacted soon with further details.`;
      } else if (status === 'Declined') {
        notificationTitle = 'Application Status Update';
        notificationMessage = `Your volunteer application for "${programName}" has been reviewed. Please check your email for more details.`;
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
      message: "Volunteer status updated successfully"
    });
  } catch (err) {
    console.error("Error updating volunteer status:", err);
    res.status(500).json({ error: err.message });
  }
};

export const softDeleteVolunteer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.execute(`
      DELETE FROM volunteers 
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
      message: "Volunteer deleted successfully"
    });
  } catch (err) {
    console.error("Error soft deleting volunteer:", err);
    res.status(500).json({ error: err.message });
  }
};

export const testGet = (req, res) => res.send("Hello from apply.js!");

export const testPost = (req, res) => {
  console.log('Test POST endpoint hit');
  res.json({ success: true, message: "Test POST successful" });
};

export const testAuth = (req, res) => {
  console.log('Test auth endpoint hit');
  console.log('Request user:', req.user);
  console.log('Request headers:', req.headers);
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
    const [rows] = await db.execute(`
      SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.status = 'Upcoming'
      ORDER BY p.created_at DESC
    `);

    // Get multiple dates and additional images for each program
    const programsWithDates = await Promise.all(rows.map(async (program) => {
      let multipleDates = [];
      
      // If program has event_start_date and event_end_date, check if they're the same (single day)
      if (program.event_start_date && program.event_end_date) {
        if (program.event_start_date === program.event_end_date) {
          // Single day program
          multipleDates = [program.event_start_date];
        }
      } else {
        // Check for multiple dates in program_event_dates table
        const [dateRows] = await db.execute(
          'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
          [program.id]
        );
        multipleDates = dateRows.map(row => row.event_date);
      }

      // Get additional images for this program
      const [imageRows] = await db.execute(
        'SELECT image_data FROM program_additional_images WHERE program_id = ? ORDER BY image_order ASC',
        [program.id]
      );
      const additionalImages = imageRows.map(row => row.image_data);

      return {
        ...program,
        multiple_dates: multipleDates,
        additional_images: additionalImages
      };
    }));

    const programs = programsWithDates.map(program => {
      let logoUrl;
      if (program.orgLogo) {
        // If logo is stored as a filename, construct the proper URL
        if (program.orgLogo.includes('/')) {
          // Legacy path - extract filename
          const filename = program.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${program.orgLogo}`;
        }
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        id: program.id,
        title: program.title,
        name: program.title, // Alternative field name for compatibility
        description: program.description,
        category: program.category,
        status: program.status,
        date: program.date || program.created_at,
        image: program.image,
        additional_images: program.additional_images,
        event_start_date: program.event_start_date,
        event_end_date: program.event_end_date,
        multiple_dates: program.multiple_dates,
        organization: program.orgAcronym, // Primary org field
        org: program.orgAcronym, // Alternative org field for compatibility
        orgName: program.orgName,
        icon: logoUrl,
        created_at: program.created_at
      };
    });

    res.json(programs);
  } catch (error) {
    console.error("❌ Error fetching approved upcoming programs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch approved upcoming programs",
      error: error.message,
    });
  }
};
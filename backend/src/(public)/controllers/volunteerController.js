// Consolidated Volunteer Controller - handles both public and admin operations
// db table: volunteers
import db from "../../database.js";
import { createUserNotification } from './userController.js';
import { calculateAge } from '../../utils/dateUtils.js';
import { getVolunteerStatusEmail } from '../../utils/volunteerEmailTemplates.js';
import { getSiteName } from '../../utils/siteName.js';
import sendMail from '../../utils/mailer.js';

// Status validation constants
const VALID_STATUSES = ['Pending', 'Approved', 'Declined', 'Cancelled', 'Completed'];
const STATUS_TRANSITIONS = {
  'Pending': ['Approved', 'Declined', 'Cancelled'],
  'Approved': ['Declined', 'Cancelled', 'Completed'],
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

    // Verify the program exists, is approved, and organization is active
    // Get program with all necessary fields to calculate status properly
    const [programRows] = await db.execute(
      `SELECT p.id, p.status, p.event_start_date, p.event_end_date, p.manual_status_override, p.is_approved, p.accepts_volunteers
       FROM programs_projects p
       LEFT JOIN organizations o ON p.organization_id = o.id
       WHERE p.id = ? AND p.is_approved = TRUE AND o.status = 'ACTIVE'`,
      [program_id]
    );

    if (programRows.length === 0) {
      return res.status(404).json({ error: 'Program not found or not available' });
    }

    const program = programRows[0];
    
    // Calculate actual program status respecting manual_status_override
    // This matches the frontend getProgramStatusByDates logic
    // Programs stay in their current status until admin manually changes it
    let actualStatus = program.status || 'Upcoming';
    
    if (program.manual_status_override === 1 || program.manual_status_override === true) {
      // If admin has manually set the status, use it regardless of dates
      actualStatus = program.status;
    } else {
      // If no manual override, use the database status (programs stay 'Upcoming' until admin changes it)
      actualStatus = program.status || 'Upcoming';
    }
    
    // Block applications for Completed programs (regardless of accepts_volunteers setting)
    if (actualStatus === 'Completed') {
      return res.status(404).json({ 
        error: 'Program is not accepting volunteer applications. This program has been completed.' 
      });
    }
    
    // For Active programs, check if they accept volunteers
    if (actualStatus === 'Active') {
      const acceptsVolunteers = program.accepts_volunteers === 1 || program.accepts_volunteers === true;
      if (!acceptsVolunteers) {
        return res.status(404).json({ 
          error: 'Program is not accepting volunteer applications at this time.' 
        });
      }
    }
    
    // For Upcoming programs, check if they accept volunteers
    if (actualStatus === 'Upcoming') {
      const acceptsVolunteers = program.accepts_volunteers === 1 || program.accepts_volunteers === true;
      if (!acceptsVolunteers) {
        return res.status(404).json({ 
          error: 'Program is not accepting volunteer applications at this time.' 
        });
      }
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
      
      // Create notification for the user who submitted the application
      try {
        const userNotificationTitle = "Application Submitted Successfully";
        const userNotificationMessage = `Your volunteer application for "${program.program_title}" has been submitted successfully. We will review your application and notify you of the status soon.`;
        
        await createUserNotification(
          user_id,
          'volunteer_application',
          userNotificationTitle,
          userNotificationMessage,
          'volunteers',
          volunteerId
        );
      } catch (userNotificationError) {
        console.error('Failed to create user notification:', userNotificationError);
        // Don't throw - notification failure shouldn't block the application submission
      }
      
      // Find all admins of this organization
      const [adminRows] = await db.execute(
        "SELECT id FROM users WHERE organization_id = ? AND role = 'admin'",
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
        up.first_name,
        up.last_name,
        CONCAT(up.first_name, ' ', up.last_name) as full_name,
        u.email,
        up.contact_number,
        up.gender,
        up.address,
        up.occupation,
        up.citizenship,
        up.birth_date,
        up.profile_photo_url,
        p.title as program_name,
        p.title as program_title,
        o.orgName as organization_name
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN programs_projects p ON v.program_id = p.id
       LEFT JOIN organizations o ON o.id = p.organization_id
       WHERE u.is_active = 1 AND u.role = 'user'
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
        up.first_name,
        up.last_name,
        CONCAT(up.first_name, ' ', up.last_name) as full_name,
        u.email,
        up.contact_number,
        up.gender,
        up.address,
        up.occupation,
        up.citizenship,
        up.birth_date,
        up.profile_photo_url,
        p.title as program_name,
        p.title as program_title,
        o.orgName as organization_name,
        o.id as organization_id
      FROM volunteers v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON o.id = p.organization_id
      WHERE o.id = ? AND u.is_active = 1 AND u.role = 'user'
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
    res.status(500).json({ error: err.message });
  }
};

// Get volunteers by admin's organization
export const getVolunteersByAdminOrg = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    // First get the admin's organization
    const [adminRows] = await db.execute(`
      SELECT o.org, o.id as org_id FROM users u
      LEFT JOIN organizations o ON u.organization_id = o.id
      WHERE u.id = ? AND u.role = 'admin'
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
        up.first_name,
        up.last_name,
        CONCAT(up.first_name, ' ', up.last_name) as full_name,
        u.email,
        up.contact_number,
        up.gender,
        up.address,
        up.occupation,
        up.citizenship,
        up.birth_date,
        up.profile_photo_url,
        p.title as program_name,
        p.title as program_title,
        o.orgName as organization_name,
        o.id as organization_id
      FROM volunteers v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON o.id = p.organization_id
      WHERE o.org = ? AND u.is_active = 1 AND u.role = 'user'
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
        up.first_name,
        up.last_name,
        CONCAT(up.first_name, ' ', up.last_name) as full_name,
        u.email,
        up.contact_number,
        up.gender,
        up.address,
        up.occupation,
        up.citizenship,
        up.birth_date,
        up.profile_photo_url,
        p.title as program_name,
        p.title as program_title,
        o.orgName as organization_name
       FROM volunteers v
       JOIN users u ON v.user_id = u.id
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN programs_projects p ON v.program_id = p.id
       LEFT JOIN organizations o ON o.id = p.organization_id
       WHERE v.id = ? AND u.is_active = 1 AND u.role = 'user'`, 
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
      SELECT v.*, p.title as program_name, u.id as user_id, u.email,
             CONCAT(up.first_name, ' ', up.last_name) as user_name
      FROM volunteers v
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN users u ON v.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
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
    
    // Create notification, send email, and emit real-time event for the user if they exist and status changed
    if (volunteer.user_id && volunteer.status !== status) {
      const programName = volunteer.program_name || 'Program';
      const userName = volunteer.user_name || 'Valued Volunteer';
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
        // Get site name for email
        const siteName = await getSiteName();

        // Prepare email content
        const emailContent = getVolunteerStatusEmail({
          userName,
          programName,
          status,
          siteName
        });

        // Create in-app notification and get the notification ID
        const notificationId = await createUserNotification(
          volunteer.user_id,
          'volunteer_status',
          notificationTitle,
          notificationMessage
        );

        // Send email notification (don't block the response if email fails)
        sendMail({
          to: volunteer.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        }).catch(error => {
          console.error('Failed to send volunteer status email:', error);
          // Don't throw - email failure shouldn't block the status update
        });

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
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get volunteers by program ID
export const getVolunteersByProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const currentAdminId = req.admin?.id || req.superadmin?.id;

    if (!programId) {
      return res.status(400).json({
        success: false,
        message: 'Program ID is required'
      });
    }

    // Verify the program exists and current admin has access
    const [programRows] = await db.execute(`
      SELECT p.id, p.title, p.organization_id, o.orgName, o.org
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.id = ? AND (
        p.organization_id = (SELECT organization_id FROM users WHERE id = ? AND role = 'admin')
        OR p.id IN (SELECT program_id FROM program_collaborations WHERE collaborator_admin_id = ? AND status = 'accepted')
      )
    `, [programId, currentAdminId, currentAdminId]);

    if (programRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Program not found or you do not have access'
      });
    }

    const program = programRows[0];

    // Get volunteers for this program
    const [volunteers] = await db.execute(`
      SELECT 
        v.id,
        v.program_id,
        v.reason,
        v.status,
        v.created_at,
        v.updated_at,
        u.id as user_id,
        up.first_name,
        up.last_name,
        CONCAT(up.first_name, ' ', up.last_name) as full_name,
        u.email,
        up.contact_number,
        up.gender,
        up.address,
        up.occupation,
        up.citizenship,
        up.birth_date,
        up.profile_photo_url,
        p.title as program_name,
        p.title as program_title,
        o.orgName as organization_name
      FROM volunteers v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON o.id = p.organization_id
      WHERE v.program_id = ? AND u.is_active = 1 AND u.role = 'user'
      ORDER BY v.created_at DESC
    `, [programId]);

    // Calculate age from birth_date using centralized utility
    const volunteersWithAge = volunteers.map(volunteer => {
      const age = calculateAge(volunteer.birth_date);
      
      return {
        ...volunteer,
        age,
        created_at: volunteer.created_at ? new Date(volunteer.created_at).toISOString() : null,
        updated_at: volunteer.updated_at ? new Date(volunteer.updated_at).toISOString() : null
      };
    });

    res.json({
      success: true,
      program: {
        id: program.id,
        title: program.title,
        organization_name: program.orgName,
        organization_acronym: program.org
      },
      count: volunteersWithAge.length,
      data: volunteersWithAge
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch volunteers for program',
      error: error.message
    });
  }
};

// Get approved programs with status "Upcoming" for volunteer application dropdown
// This endpoint is public and does not require authentication
export const getApprovedUpcomingPrograms = async (req, res) => {
  try {
    // Note: user_id is optional - this endpoint is accessible to both authenticated and non-authenticated users
    const user_id = req.user?.id;
    
    // Get all approved programs (Upcoming and Active) that are not Completed
    // Exclude Completed programs regardless of accepts_volunteers setting
    // Only return programs that accept volunteers (admin can close volunteer applications)
    // Programs stay 'Upcoming' until admin manually changes status
    const query = `
      SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.is_approved = 1 
      AND o.status = 'ACTIVE'
      AND p.status != 'Completed'
      AND (p.accepts_volunteers = 1 OR p.accepts_volunteers = TRUE)
      ORDER BY p.title ASC
    `;

    const [rows] = await db.execute(query);

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
        additional_images: additionalImages,
        manual_status_override: program.manual_status_override === 1 || program.manual_status_override === true,
        accepts_volunteers: program.accepts_volunteers !== undefined ? program.accepts_volunteers : true
      };
    }));

    res.json({
      success: true,
      data: programsWithDates
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

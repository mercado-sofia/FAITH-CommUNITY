// db table: volunteers
import db from "../../database.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload folder exists
const uploadsDir = path.join(process.cwd(), "uploads", "ids");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".png", ".jpg", ".jpeg", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowedTypes.includes(ext));
  },
}).single("validId");

export const submitVolunteer = async (req, res) => {
  try {
    const {
      program_id,
      fullName,
      age,
      gender,
      email,
      phoneNumber,
      address,
      occupation,
      citizenship,
      reason,
    } = req.body;

    console.log("[DEBUG] Volunteer application submission:", {
      program_id,
      fullName,
      email,
      phoneNumber
    });

    // Validate required fields
    if (!program_id) {
      return res.status(400).json({
        error: "Program selection is required.",
      });
    }

    // Validate gender (dropdown should only allow Male or Female)
    const validGenders = ["Male", "Female"];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({
        error: "Invalid gender. Only 'Male' or 'Female' are accepted.",
      });
    }

    const validIdPath = req.file ? `/uploads/volunteers/valid-ids/${req.file.filename}` : null;

    const sql = `
      INSERT INTO volunteers 
      (program_id, full_name, age, gender, email, phone_number, address, occupation, citizenship, reason, valid_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())
    `;

    const values = [
      program_id,
      fullName,
      age,
      gender,
      email,
      phoneNumber,
      address,
      occupation,
      citizenship,
      reason,
      validIdPath,
    ];

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
      SELECT v.*, p.title as program_name, p.title as program_title, o.orgName as organization_name
      FROM volunteers v
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE v.db_status = 'active'
      ORDER BY v.created_at DESC
    `);
    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getVolunteersByOrganization = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    console.log(`[DEBUG] Fetching volunteers for organization ID: ${orgId}`);
    
    const [results] = await db.query(`
      SELECT v.*, p.title as program_name, p.title as program_title, o.orgName as organization_name, o.id as organization_id
      FROM volunteers v
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE o.id = ? AND v.db_status = 'active'
      ORDER BY v.created_at DESC
    `, [orgId]);
    
    console.log(`[DEBUG] Found ${results.length} volunteers for organization ${orgId}`);
    
    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err) {
    console.error("Error fetching volunteers by organization:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getVolunteersByAdminOrg = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    console.log(`[DEBUG] Fetching volunteers for admin ID: ${adminId}`);
    
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
    console.log(`[DEBUG] Admin ${adminId} belongs to organization: ${adminOrg}`);
    
    // Now get volunteers for programs from that organization
    const [results] = await db.query(`
      SELECT v.*, p.title as program_name, p.title as program_title, o.orgName as organization_name, o.id as organization_id
      FROM volunteers v
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE o.org = ? AND v.db_status = 'Active'
      ORDER BY v.created_at DESC
    `, [adminOrg]);
    
    console.log(`[DEBUG] Found ${results.length} volunteers for organization ${adminOrg}`);
    
    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
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
      SELECT v.*, p.title as program_name, p.title as program_title, o.orgName as organization_name, o.id as organization_id
      FROM volunteers v
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE v.id = ?
    `, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: results[0],
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
    
    console.log(`[DEBUG] Updating volunteer ${id} status to: ${status}`);
    
    const [result] = await db.execute(`
      UPDATE volunteers 
      SET status = ?, updated_at = NOW()
      WHERE id = ? AND db_status = 'Active'
    `, [status, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found or inactive"
      });
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
    
    console.log(`[DEBUG] Soft deleting volunteer ${id} (setting db_status to inactive)`);
    
    const [result] = await db.execute(`
      UPDATE volunteers 
      SET db_status = 'Inactive', updated_at = NOW()
      WHERE id = ? AND db_status = 'Active'
    `, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Volunteer not found or already inactive"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Volunteer removed from view successfully"
    });
  } catch (err) {
    console.error("Error soft deleting volunteer:", err);
    res.status(500).json({ error: err.message });
  }
};

export const testGet = (req, res) => res.send("Hello from apply.js!");

export const testPost = (req, res) => {
  console.log("Test POST in controller hit");
  res.json({ success: true, message: "Test POST successful" });
};

// Get approved programs with status "Upcoming" for volunteer application dropdown
export const getApprovedUpcomingPrograms = async (req, res) => {
  try {
    console.log("[DEBUG] Fetching approved upcoming programs for volunteer application");
    
    const [rows] = await db.execute(`
      SELECT p.*, o.orgName, o.org as orgAcronym, o.logo as orgLogo
      FROM programs_projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE p.status = 'Upcoming'
      ORDER BY p.created_at DESC
    `);

    console.log(`[DEBUG] Found ${rows.length} approved upcoming programs`);

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
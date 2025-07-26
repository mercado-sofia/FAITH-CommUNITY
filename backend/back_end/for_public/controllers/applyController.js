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
  destination: (req, file, cb) => cb(null, "uploads/ids/"),
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
      fullName,
      age,
      gender,
      email,
      phoneNumber,
      address,
      occupation,
      citizenship,
      reason,
      program,
    } = req.body;

    // Validate gender (dropdown should only allow Male or Female)
    const validGenders = ["Male", "Female"];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({
        error: "Invalid gender. Only 'Male' or 'Female' are accepted.",
      });
    }

    // Map program string to corresponding program_id
    const programMap = {
      CLIQUE: 1,
      LinkUp: 2,
      RiseUp: 3,
      FaithSteps: 4,
      ScholarSync: 5,
    };
    const program_id = programMap[program] || 1;

    const validIdPath = req.file ? `/uploads/ids/${req.file.filename}` : null;

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
    const [results] = await db.query("SELECT * FROM volunteers ORDER BY created_at DESC");
    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const testGet = (req, res) => res.send("Hello from apply.js!");

export const testPost = (req, res) => {
  console.log("Test POST in controller hit");
  res.json({ success: true, message: "Test POST successful" });
};
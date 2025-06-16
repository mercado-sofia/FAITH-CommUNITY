import db from '../../database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename while preserving original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

export const upload = multer({ storage });

// Create a new submission
export const createSubmission = async (req, res) => {
  const { organization_id, section, previous_data, proposed_data, submitted_by } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO submissions 
       (organization_id, section, previous_data, proposed_data, status, submitted_by) 
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [organization_id, section, JSON.stringify(previous_data), JSON.stringify(proposed_data), submitted_by]
    );

    res.status(201).json({ id: result.insertId, message: 'Submission created.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all submissions by admin
export const getSubmissionsByAdmin = async (req, res) => {
  const { submitted_by } = req.query;

  try {
    const [rows] = await db.execute(
      `SELECT * FROM submissions WHERE submitted_by = ? AND status = 'pending' ORDER BY submitted_at DESC`,
      [submitted_by]
    );
    
    // Parse proposed_data for each submission
    const submissions = rows.map(row => ({
      ...row,
      proposed_data: JSON.parse(row.proposed_data),
      previous_data: row.previous_data ? JSON.parse(row.previous_data) : null
    }));
    
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get individual submission
export const getSubmissionById = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM submissions WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Submission not found' });
    
    const submission = {
      ...rows[0],
      proposed_data: JSON.parse(rows[0].proposed_data),
      previous_data: rows[0].previous_data ? JSON.parse(rows[0].previous_data) : null
    };
    
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update submission data
export const updateSubmission = async (req, res) => {
  try {
    let data = JSON.parse(req.body.data);
    
    // Handle uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fieldName = file.fieldname;
        const filename = file.filename; // Use the generated filename
        
        if (fieldName.startsWith('head-')) {
          // Handle organization head photos
          const [, index] = fieldName.split('-');
          if (data.heads && data.heads[index]) {
            // Delete old file if it exists
            const oldPhoto = data.heads[index].photo;
            if (oldPhoto) {
              const oldPath = path.join(process.cwd(), 'public', 'uploads', oldPhoto);
              if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
              }
            }
            data.heads[index].photo = filename;
          }
        } else {
          // Handle other files (like logo)
          // Delete old file if it exists
          const oldFile = data[fieldName];
          if (oldFile) {
            const oldPath = path.join(process.cwd(), 'public', 'uploads', oldFile);
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          }
          data[fieldName] = filename;
        }
      }
    }

    // Update the database
    await db.execute(
      `UPDATE submissions SET proposed_data = ? WHERE id = ?`,
      [JSON.stringify(data), req.params.id]
    );
    
    // Get the updated submission
    const [rows] = await db.execute('SELECT * FROM submissions WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Submission not found' });
    
    // Parse the data before sending it back
    const submission = {
      ...rows[0],
      proposed_data: JSON.parse(rows[0].proposed_data),
      previous_data: rows[0].previous_data ? JSON.parse(rows[0].previous_data) : null
    };
    
    res.json(submission);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update status (approve/reject)
export const updateSubmissionStatus = async (req, res) => {
  const { status, rejection_comment } = req.body;

  try {
    await db.execute(
      `UPDATE submissions SET status = ?, rejection_comment = ? WHERE id = ?`,
      [status, rejection_comment || null, req.params.id]
    );
    res.json({ message: 'Submission status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel a submission
export const cancelSubmission = async (req, res) => {
  try {
    // Get the submission first to clean up files
    const [rows] = await db.execute('SELECT * FROM submissions WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
      const submission = rows[0];
      const proposedData = JSON.parse(submission.proposed_data);
      
      // Clean up files
      const cleanupFile = (filename) => {
        if (filename) {
          const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      };

      // Clean up logo
      if (proposedData.logo) {
        cleanupFile(proposedData.logo);
      }

      // Clean up head photos
      if (proposedData.heads) {
        proposedData.heads.forEach(head => {
          if (head.photo) {
            cleanupFile(head.photo);
          }
        });
      }
    }

    // Delete the submission
    await db.execute(
      `DELETE FROM submissions WHERE id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Submission deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
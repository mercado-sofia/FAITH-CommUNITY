// db table: programs_projects
import db from '../../database.js';
import path from 'path';
import fs from 'fs';

async function notifySubscribers({ type, subject, messageHtml }) {
  const api = process.env.API_BASE_URL || 'http://localhost:8080';
  try {
    const resp = await fetch(`${api}/api/subscribers/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, subject, messageHtml }),
    });
    // Optional: read response (don’t throw on JSON parse)
    try { return await resp.json(); } catch { return null; }
  } catch (e) {
    console.warn('notifySubscribers failed:', e?.message || e);
    return null;
  }
}

export const addProgramProject = async (req, res) => {
  const { title, description } = req.body;
  let image = '';

  if (req.file) {
    image = req.file.filename;
  }

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO programs_projects (title, description, image, status)
       VALUES (?, ?, ?, 'pending')`,
      [title, description ?? null, image ?? null]
    );

    const newId = result.insertId;

    // Build a link to the public program page (adjust to your real route)
    const appBase = process.env.APP_BASE_URL || 'http://localhost:3000';
    const programUrl = `${appBase}/programs/${newId}`;

    // 🔔 Non-blocking notification (don’t await if you want it fully fire-and-forget)
    notifySubscribers({
      type: 'program',
      subject: `New Program: ${title}`,
      messageHtml: `
        <h2>${title}</h2>
        <p>${description ? String(description) : ''}</p>
        <p><a href="${programUrl}">View details</a></p>
      `,
    }).catch((e) => console.warn('Notify failed:', e?.message || e));

    return res
      .status(201)
      .json({ message: 'Project submitted for approval', id: newId });
  } catch (error) {
    console.error('addProgramProject error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getProgramProjects = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM programs_projects');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all programs with organization details for superadmin
export const getAllProgramsForSuperadmin = async (req, res) => {
  try {
    const query = `
      SELECT 
        pp.id,
        pp.title,
        pp.description,
        pp.category,
        pp.status,
        pp.image,
        pp.event_start_date,
        pp.event_end_date,
        pp.created_at,
        pp.updated_at,
        pp.organization_id,
        o.orgName as organization_name,
        o.org as organization_acronym,
        o.logo as organization_logo
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      ORDER BY o.orgName ASC, pp.created_at DESC
    `;
    
    const [rows] = await db.execute(query);
    
    // Get multiple dates for each program
    const programsWithDates = await Promise.all(
      rows.map(async (program) => {
        let multipleDates = [];

        // If both start & end exist:
        if (program.event_start_date && program.event_end_date) {
          // If equal → single-day
          if (program.event_start_date === program.event_end_date) {
            multipleDates = [program.event_start_date];
          }
          // If not equal (range), you may leave multipleDates empty or expand the range if needed.
          // Keeping your original behavior (no expansion).
        } else {
          // Else check scattered dates table
          const [dateRows] = await db.execute(
            'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
            [program.id]
          );
          multipleDates = dateRows.map((row) => row.event_date);
        }

        // Construct proper logo URL
        let logoUrl;
        if (program.organization_logo) {
          if (String(program.organization_logo).includes('/')) {
            // Legacy path - extract filename
            const filename = String(program.organization_logo).split('/').pop();
            logoUrl = `/uploads/organizations/logos/${filename}`;
          } else {
            // New structure - direct filename
            logoUrl = `/uploads/organizations/logos/${program.organization_logo}`;
          }
        } else {
          // Fallback to default logo
          logoUrl = `/logo/faith_community_logo.png`;
        }

        return {
          ...program,
          organization_logo: logoUrl,
          multiple_dates: multipleDates,
        };
      })
    );
    
    res.json({
      success: true,
      data: programsWithDates,
    });
  } catch (error) {
    console.error('Error fetching all programs for superadmin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
      error: error.message,
    });
  }
};

// Get programs statistics for superadmin
export const getProgramsStatistics = async (req, res) => {
  try {
    const statisticsQuery = `
      SELECT 
        COUNT(*) as total_programs,
        SUM(CASE WHEN LOWER(status) = 'upcoming' THEN 1 ELSE 0 END) as upcoming_programs,
        SUM(CASE WHEN LOWER(status) = 'active' THEN 1 ELSE 0 END) as active_programs,
        SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed_programs,
        COUNT(DISTINCT organization_id) as total_organizations
       FROM programs_projects
       WHERE organization_id IS NOT NULL
    `;
    
    const [results] = await db.execute(statisticsQuery);
    
    res.json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    console.error('Error fetching programs statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs statistics',
      error: error.message,
    });
  }
};
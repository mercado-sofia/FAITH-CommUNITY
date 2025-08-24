// db table: programs_projects
import db from '../../database.js';
import path from 'path';
import fs from 'fs';
import { sendToSubscribers } from './subscribersController.js';

// ---------------- Helper: escape HTML ----------------
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ---------------- Add new program ----------------
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
    const appBase = process.env.APP_BASE_URL || 'http://localhost:3000';
    const programUrl = `${appBase}/programs/${newId}`;

    // 🔔 Email subscribers (non-blocking but awaited here for logs)
    try {
      await sendToSubscribers({
        subject: `New Program: ${title}`,
        html: `
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description || "")}</p>
          ${image ? `<p><img src="${escapeHtml("/uploads/" + image)}" alt="${escapeHtml(title)}" style="max-width:100%;height:auto"/></p>` : ""}
          <p><a href="${programUrl}">View details</a></p>
        `,
      });
    } catch (mailErr) {
      console.warn("sendToSubscribers failed:", mailErr?.message || mailErr);
    }

    return res
      .status(201)
      .json({ message: 'Project submitted for approval', id: newId });
  } catch (error) {
    console.error('addProgramProject error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------- Update existing program ----------------
export const updateProgramProject = async (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;
  let image = req.file ? req.file.filename : null;

  try {
    await db.execute(
      `UPDATE programs_projects
       SET title = ?, description = ?, image = COALESCE(?, image), status = ?
       WHERE id = ?`,
      [title, description ?? null, image, status ?? 'pending', id]
    );

    const appBase = process.env.APP_BASE_URL || 'http://localhost:3000';
    const programUrl = `${appBase}/programs/${id}`;

    // 🔔 Email subscribers about the update
    try {
      await sendToSubscribers({
        subject: `Program Updated: ${title}`,
        html: `
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(description || "")}</p>
          ${image ? `<p><img src="${escapeHtml("/uploads/" + image)}" alt="${escapeHtml(title)}" style="max-width:100%;height:auto"/></p>` : ""}
          <p><a href="${programUrl}">View details</a></p>
        `,
      });
    } catch (mailErr) {
      console.warn("sendToSubscribers failed:", mailErr?.message || mailErr);
    }

    return res.json({ message: "Program updated successfully." });
  } catch (error) {
    console.error('updateProgramProject error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------- Get all program projects ----------------
export const getProgramProjects = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM programs_projects');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ---------------- Get all programs with organization details for superadmin ----------------
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
        a.orgName as organization_name,
        a.org as organization_acronym,
        o.logo as organization_logo,
        o.org_color as organization_color
      FROM programs_projects pp
      LEFT JOIN organizations o ON pp.organization_id = o.id
      LEFT JOIN admins a ON pp.organization_id = a.organization_id
      ORDER BY a.orgName ASC, pp.created_at DESC
    `;
    
    const [rows] = await db.execute(query);
    
    const programsWithDates = await Promise.all(
      rows.map(async (program) => {
        let multipleDates = [];

        if (program.event_start_date && program.event_end_date) {
          if (program.event_start_date === program.event_end_date) {
            multipleDates = [program.event_start_date];
          }
        } else {
          const [dateRows] = await db.execute(
            'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
            [program.id]
          );
          multipleDates = dateRows.map((row) => row.event_date);
        }

        let logoUrl;
        if (program.organization_logo) {
          if (String(program.organization_logo).includes('/')) {
            const filename = String(program.organization_logo).split('/').pop();
            logoUrl = `/uploads/organizations/logos/${filename}`;
          } else {
            logoUrl = `/uploads/organizations/logos/${program.organization_logo}`;
          }
        } else {
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

// ---------------- Programs statistics ----------------
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
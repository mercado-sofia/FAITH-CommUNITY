//db table: program_projects
import db from '../../database.js';
import path from 'path';
import fs from 'fs';

export const addProgramProject = async (req, res) => {
  const { title, description } = req.body;
  let image = '';

  if (req.file) {
    image = req.file.filename;
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO program_projects (title, description, image, status)
       VALUES (?, ?, ?, 'pending')`,
      [title, description, image]
    );
    res.status(201).json({ message: 'Project submitted for approval', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProgramProjects = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM program_projects');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

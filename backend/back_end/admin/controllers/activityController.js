//db table: activities
import db from '../../database.js';

export const createActivity = async (req, res) => {
  const { admin_id, action, date, status } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO activities (admin_id, action, date, status) VALUES (?, ?, ?, ?)',
      [admin_id, action, date, status]
    );
    res.status(201).json({ id: result.insertId, message: 'Activity logged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllActivities = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM activities');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getActivityById = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM activities WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Activity not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateActivity = async (req, res) => {
  const { admin_id, action, date, status } = req.body;
  try {
    await db.execute(
      'UPDATE activities SET admin_id = ?, action = ?, date = ?, status = ? WHERE id = ?',
      [admin_id, action, date, status, req.params.id]
    );
    res.json({ message: 'Activity updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteActivity = async (req, res) => {
  try {
    await db.execute('DELETE FROM activities WHERE id = ?', [req.params.id]);
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
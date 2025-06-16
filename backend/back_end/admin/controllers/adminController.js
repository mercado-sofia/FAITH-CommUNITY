//db table: admins
import db from '../../database.js';

export const createAdmin = async (req, res) => {
  const { org_name, email, password, role } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO admins (org_name, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())',
      [org_name, email, password, role]
    );
    res.status(201).json({ id: result.insertId, message: 'Admin created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM admins');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM admins WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Admin not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateAdmin = async (req, res) => {
  const { org_name, email, password, role } = req.body;
  try {
    await db.execute(
      'UPDATE admins SET org_name = ?, email = ?, password = ?, role = ? WHERE id = ?',
      [org_name, email, password, role, req.params.id]
    );
    res.json({ message: 'Admin updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    await db.execute('DELETE FROM admins WHERE id = ?', [req.params.id]);
    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
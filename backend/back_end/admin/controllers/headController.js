//db table: organization_heads
import db from '../../database.js';

export const addHead = async (req, res) => {
  const { organization_id, name, role, facebook, email, photo } = req.body;
  try {
    await db.execute(`INSERT INTO organization_heads (organization_id, name, role, facebook, email, photo)
      VALUES (?, ?, ?, ?, ?, ?)`, [organization_id, name, role, facebook, email, photo]);
    res.json({ message: 'Organization head added' });
  } catch (error) {
    res.status(500).json({ error });
  }
};

export const getHeads = async (req, res) => {
  const { organization_id } = req.params;
  const [rows] = await db.execute('SELECT * FROM organization_heads WHERE organization_id = ?', [organization_id]);
  res.json(rows);
};

export const deleteHead = async (req, res) => {
  const { id } = req.params;
  await db.execute('DELETE FROM organization_heads WHERE id = ?', [id]);
  res.json({ message: 'Head deleted' });
};

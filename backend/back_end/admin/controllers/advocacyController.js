//db table: advocacies
import db from '../../database.js';

export const addAdvocacy = async (req, res) => {
  const { organization_id, advocacy } = req.body;
  try {
    await db.execute('INSERT INTO advocacies (organization_id, advocacy) VALUES (?, ?)', [organization_id, advocacy]);
    res.json({ message: 'Advocacy added successfully' });
  } catch (error) {
    res.status(500).json({ error });
  }
};

export const getAdvocacies = async (req, res) => {
  const { organization_id } = req.params;
  const [rows] = await db.execute('SELECT * FROM advocacies WHERE organization_id = ?', [organization_id]);
  res.json(rows);
};

export const deleteAdvocacy = async (req, res) => {
  const { id } = req.params;
  await db.execute('DELETE FROM advocacies WHERE id = ?', [id]);
  res.json({ message: 'Advocacy deleted' });
};

export const getAllAdvocacies = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM advocacies');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve advocacies' });
  }
};


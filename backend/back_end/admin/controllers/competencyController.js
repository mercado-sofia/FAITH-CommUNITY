//db table: competencies
import db from '../../database.js';

export const addCompetency = async (req, res) => {
  const { organization_id, competency } = req.body;
  try {
    await db.execute('INSERT INTO competencies (organization_id, competency) VALUES (?, ?)', [organization_id, competency]);
    res.json({ message: 'Competency added' });
  } catch (error) {
    res.status(500).json({ error });
  }
};

export const getCompetencies = async (req, res) => {
  const { organization_id } = req.params;
  const [rows] = await db.execute('SELECT * FROM competencies WHERE organization_id = ?', [organization_id]);
  res.json(rows);
};

export const getAllCompetencies = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM competencies');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve competencies' });
  }
};

export const deleteCompetency = async (req, res) => {
  const { id } = req.params;
  await db.execute('DELETE FROM competencies WHERE id = ?', [id]);
  res.json({ message: 'Competency deleted' });
};

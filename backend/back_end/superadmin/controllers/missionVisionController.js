// db table: mission_vision
import db from '../../database.js';

export const getMissionVision = async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT * FROM mission_vision WHERE status = 'ACTIVE'"
    );
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createMissionVision = async (req, res) => {
  const { type, content } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO mission_vision (type, content) VALUES (?, ?)",
      [type, content]
    );
    res.status(201).json({ message: 'Entry created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateMissionVision = async (req, res) => {
  const { id } = req.params;
  const { type, content, status } = req.body;
  try {
    await db.query(
      "UPDATE mission_vision SET type = ?, content = ?, status = ? WHERE id = ?",
      [type, content, status, id]
    );
    res.json({ message: 'Entry updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteMissionVision = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE mission_vision SET status = 'INACTIVE' WHERE id = ?", [id]);
    res.json({ message: 'Entry deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

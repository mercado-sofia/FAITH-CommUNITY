//db table: events
import db from '../../database.js';

export const createEvent = async (req, res) => {
  const { title, description, event_date, status } = req.body;
  try {
    const [result] = await db.execute(
      'INSERT INTO events (title, description, event_date, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [title, description, event_date, status]
    );
    res.status(201).json({ id: result.insertId, message: 'Event created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllEvents = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM events');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateEvent = async (req, res) => {
  const { title, description, event_date, status } = req.body;
  try {
    await db.execute(
      'UPDATE events SET title = ?, description = ?, event_date = ?, status = ? WHERE id = ?',
      [title, description, event_date, status, req.params.id]
    );
    res.json({ message: 'Event updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    await db.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

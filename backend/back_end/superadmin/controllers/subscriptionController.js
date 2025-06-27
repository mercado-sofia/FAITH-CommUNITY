import db from '../../database.js';

// CREATE (subscribe)
export const createSubscription = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO subscriptions (email, status) VALUES (?, 'ACTIVE')`,
      [email]
    );

    res.status(201).json({
      message: 'Subscription successful.',
      id: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM subscriptions ORDER BY subscribed_at DESC');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

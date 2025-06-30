import db from '../../database.js';

// CREATE
export const createFooterInfo = async (req, res) => {
  const {
    orgName,
    description,
    phone_number,
    email,
    address,
    facebook_link,
    instagram_link,
    twitter_link,
    status
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO footer_info (
        orgName, description, phone_number, email, address,
        facebook_link, instagram_link, twitter_link, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orgName,
        description,
        phone_number,
        email,
        address,
        facebook_link,
        instagram_link,
        twitter_link,
        status || 'ACTIVE'
      ]
    );
    res.status(201).json({ message: 'Footer info created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updateFooterInfo = async (req, res) => {
  const { id } = req.params;
  const {
    orgName,
    description,
    phone_number,
    email,
    address,
    facebook_link,
    instagram_link,
    twitter_link,
    status
  } = req.body;

  try {
    await db.execute(
      `UPDATE footer_info SET
        orgName = ?, description = ?, phone_number = ?, email = ?, address = ?,
        facebook_link = ?, instagram_link = ?, twitter_link = ?, status = ?
       WHERE id = ?`,
      [
        orgName,
        description,
        phone_number,
        email,
        address,
        facebook_link,
        instagram_link,
        twitter_link,
        status || 'ACTIVE',
        id
      ]
    );
    res.json({ message: 'Footer info updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET (active)
export const getFooterInfo = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM footer_info WHERE status = 'ACTIVE' LIMIT 1");
    res.status(200).json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL (for admin or superadmin)
export const getAllFooterEntries = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM footer_info ORDER BY id DESC");
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

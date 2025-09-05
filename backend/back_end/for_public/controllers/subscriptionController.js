//db table: subscribers
import db from '../../database.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

/* ========================= Mail Transporter ========================= */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE) === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

/* ============================== Utils ============================== */
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const VERIFY_TTL_HOURS = Number(process.env.VERIFY_TTL_HOURS || 24);

const makeToken = (len = 32) => crypto.randomBytes(len).toString('hex');

async function sendConfirmationEmail({ email, verifyToken, unsubscribeToken }) {
  const confirmUrl = `${FRONTEND}/newsletter/confirm/${verifyToken}`;
  const unsubscribeUrl = `${FRONTEND}/newsletter/unsubscribe/${unsubscribeToken}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1A685B;color:#fff;padding:18px 20px;border-radius:8px 8px 0 0;text-align:center;">
        <h2 style="margin:0;">FAITH CommUNITY</h2>
        <p style="margin:6px 0 0;opacity:.9;">Newsletter Confirmation</p>
      </div>
      <div style="background:#f8f9fa;padding:26px;border-radius:0 0 8px 8px;">
        <p>Thanks for subscribing! Please confirm your email address:</p>
        <p style="text-align:center;margin:22px 0;">
          <a href="${confirmUrl}" style="background:#1A685B;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;">
            Confirm Subscription
          </a>
        </p>
        <p>If the button doesn't work, copy this link:<br>
          <a href="${confirmUrl}">${confirmUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
        <p style="font-size:12px;color:#666">
          Didn’t request this? You can <a href="${unsubscribeUrl}">unsubscribe here</a>.
        </p>
        <p style="font-size:12px;color:#666">
          This link expires in ${VERIFY_TTL_HOURS} hours.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"FAITH CommUNITY" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Confirm Your Newsletter Subscription - FAITH CommUNITY',
    html,
  });
}

/* ============================ Controllers =========================== */
/**
 * Subscribe endpoint
 * - If req.user exists (logged-in user): auto-verify (no email).
 * - Else (guest): create/refresh token and send confirmation email.
 */
export const createSubscription = async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  try {
    // Check current record
    const [rows] = await db.execute(
      'SELECT id, email, is_verified, verified_at, unsubscribe_token FROM subscribers WHERE email = ?',
      [email]
    );

    /* ---------- Logged-in users: auto-verify ---------- */
    if (req.user) {
      await db.execute(
        `INSERT INTO subscribers (email, is_verified, verified_at, created_at, unsubscribe_token)
         VALUES (?, 1, NOW(), NOW(), COALESCE(?, ?))
         ON DUPLICATE KEY UPDATE is_verified = 1, verified_at = NOW(),
                                   unsubscribe_token = COALESCE(unsubscribe_token, VALUES(unsubscribe_token))`,
        [email, rows[0]?.unsubscribe_token || null, makeToken(32)]
      );
      return res.status(201).json({ message: 'Subscribed! You will receive updates from us.' });
    }

    /* ---------- Guests: double opt-in ---------- */
    const verifyToken = makeToken(32);
    const unsubscribeToken = rows[0]?.unsubscribe_token || makeToken(32);
    const expiresAtSql = `DATE_ADD(NOW(), INTERVAL ${VERIFY_TTL_HOURS} HOUR)`;

    if (rows.length === 0) {
      await db.execute(
        `INSERT INTO subscribers
          (email, verify_token, verify_expires, unsubscribe_token, is_verified, created_at, verified_at)
         VALUES (?, ?, ${expiresAtSql}, ?, 0, NOW(), NULL)`,
        [email, verifyToken, unsubscribeToken]
      );
    } else {
      // Already exists but not verified: refresh token + expiry
      if (rows[0].is_verified && rows[0].verified_at) {
        return res.status(400).json({ error: 'This email is already subscribed.' });
      }
      await db.execute(
        `UPDATE subscribers
            SET verify_token = ?, verify_expires = ${expiresAtSql},
                is_verified = 0, verified_at = NULL,
                unsubscribe_token = COALESCE(unsubscribe_token, ?)
          WHERE id = ?`,
        [verifyToken, unsubscribeToken, rows[0].id]
      );
    }

    await sendConfirmationEmail({ email, verifyToken, unsubscribeToken });
    return res.status(201).json({
      message: 'Please check your email and click the confirmation link.',
    });
  } catch (err) {
    console.error('createSubscription error:', err);
    return res.status(500).json({ error: 'Failed to create subscription.' });
  }
};

export const confirmSubscription = async (req, res) => {
  const token = req.params.token || req.query.token;
  if (!token) return res.status(400).json({ error: 'Verification token is required.' });

  try {
    const [rows] = await db.execute(
      `SELECT id, email, is_verified, verified_at, verify_expires
         FROM subscribers
        WHERE verify_token = ?`,
      [token]
    );

    // If the token no longer exists, treat as success (idempotent UX).
    if (!rows.length) {
      return res.json({
        message: 'Subscription already confirmed. Welcome back!',
      });
    }

    const s = rows[0];

    if (s.is_verified && s.verified_at) {
      return res.json({
        message: 'Subscription already confirmed. Welcome back!',
        email: s.email,
      });
    }

    if (s.verify_expires && new Date(s.verify_expires) < new Date()) {
      return res.status(400).json({ error: 'Confirmation link has expired.' });
    }

    await db.execute(
      `UPDATE subscribers
          SET is_verified = 1,
              verified_at = NOW(),
              verify_token = NULL,
              verify_expires = NULL
        WHERE id = ?`,
      [s.id]
    );

    return res.json({ message: 'Subscription confirmed. Welcome!', email: s.email });
  } catch (err) {
    console.error('confirmSubscription error:', err);
    return res.status(500).json({ error: 'Failed to confirm subscription.' });
  }
};

/** Unsubscribe by token (public link in email) */
export const unsubscribe = async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ error: 'Unsubscribe token is required.' });

  try {
    const [rows] = await db.execute(
      'SELECT id, email FROM subscribers WHERE unsubscribe_token = ?',
      [token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid unsubscribe link.' });

    await db.execute('DELETE FROM subscribers WHERE id = ?', [rows[0].id]);
    return res.json({ message: 'You have been unsubscribed.', email: rows[0].email });
  } catch (err) {
    console.error('unsubscribe error:', err);
    return res.status(500).json({ error: 'Failed to unsubscribe.' });
  }
};

/** Admin: list all */
export const getAllSubscriptions = async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM subscribers ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Optional debug + fixer */
export const debugSubscribers = async (_req, res) => {
  try {
    const [columns] = await db.execute('DESCRIBE subscribers');
    const [countRows] = await db.execute('SELECT COUNT(*) AS total FROM subscribers');
    const [sample] = await db.execute('SELECT * FROM subscribers ORDER BY id DESC LIMIT 5');
    res.json({
      structure: columns,
      total: countRows[0]?.total ?? 0,
      sample,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const fixSubscriptions = async (_req, res) => {
  try {
    const [bad1] = await db.execute(
      'SELECT id FROM subscribers WHERE is_verified = 1 AND verified_at IS NULL'
    );
    if (bad1.length) {
      await db.execute(
        'UPDATE subscribers SET is_verified = 0 WHERE is_verified = 1 AND verified_at IS NULL'
      );
    }
    res.json({ message: `Fixed ${bad1.length} records missing verified_at.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
//db table: subscribers
import db from '../../database.js';
import crypto from 'crypto';
import { sendMail } from '../../utils/mailer.js';
import { getSiteName } from '../../utils/siteName.js';

/* ============================== Utils ============================== */
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const VERIFY_TTL_HOURS = Number(process.env.VERIFY_TTL_HOURS || 24);

const makeToken = (len = 32) => crypto.randomBytes(len).toString('hex');

async function sendConfirmationEmail({ email, verifyToken, unsubscribeToken }) {
  const confirmUrl = `${FRONTEND}/newsletter/confirm/${verifyToken}`;
  const unsubscribeUrl = `${FRONTEND}/newsletter/unsubscribe/${unsubscribeToken}`;
  const siteName = await getSiteName();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
        <p style="color: #E8F5F3; margin: 10px 0 0 0;">Newsletter Confirmation</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1A685B; margin-top: 0;">Thanks for Subscribing!</h2>
        
        <p>Please confirm your email address to complete your subscription to ${siteName} newsletter:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="display: inline-block; background: #1A685B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Confirm Subscription</a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 13px; background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">${confirmUrl}</p>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;"><strong>Important:</strong> This confirmation link expires in ${VERIFY_TTL_HOURS} hours.</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 24px 0;">
        
        <p style="color: #666; font-size: 13px; margin-top: 20px;">
          Didn't request this? You can <a href="${unsubscribeUrl}" style="color: #1A685B; text-decoration: underline;">unsubscribe here</a>.
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Best regards,<br><strong>${siteName} Team</strong>
        </p>
      </div>
    </div>
  `;

  await sendMail({
    to: email,
    subject: `Confirm Your Newsletter Subscription - ${siteName}`,
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
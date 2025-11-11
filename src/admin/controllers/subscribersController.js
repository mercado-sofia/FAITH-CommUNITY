//db table: subscribers

import crypto from "crypto";
import db from "../../database.js";
import { sendMail } from "../../utils/mailer.js";

const API_BASE = process.env.API_BASE_URL;
const APP_BASE = process.env.APP_BASE_URL;

export async function subscribe(req, res) {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required" });

  const verifyToken = crypto.randomBytes(24).toString("hex");
  const unsubscribeToken = crypto.randomBytes(24).toString("hex");

  try {
    await db.execute(
      `INSERT INTO subscribers (email, verify_token, unsubscribe_token, is_verified)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE 
         verify_token = VALUES(verify_token),
         unsubscribe_token = VALUES(unsubscribe_token),
         is_verified = 0`,
      [email, verifyToken, unsubscribeToken]
    );

    const verifyUrl = `${API_BASE}/api/subscribers/verify?token=${verifyToken}`;

    try {
      await sendMail({
        to: email,
        subject: "Confirm your subscription — FAITH CommUNITY",
        html: `
          <p>Hi! Please confirm your email to receive updates from FAITH CommUNITY.</p>
          <p><a href="${verifyUrl}">Confirm my subscription</a></p>
          <p>If you didn’t request this, you can ignore this email.</p>
        `,
      });
    } catch (mailErr) {
    }

    return res.json({
      message: "Please check your email to confirm subscription.",
    });
  } catch (dbErr) {
    return res.status(500).json({ error: "Failed to subscribe" });
  }
}

export async function verify(req, res) {
  const token = (req.query?.token || "").trim();
  if (!token) return res.status(400).send("Missing token.");

  try {
    const [result] = await db.execute(
      `UPDATE subscribers
       SET is_verified = 1, verify_token = NULL
       WHERE verify_token = ?`,
      [token]
    );

    if (result.affectedRows === 0) {
      return res.status(400).send("Invalid or already used token.");
    }

    if (APP_BASE) {
      return res.redirect(302, `${APP_BASE}/subscription/verified`);
    }
    return res.send("Subscription verified. Thank you!");
  } catch (err) {
    return res.status(500).send("Failed to verify subscription.");
  }
}

export async function unsubscribe(req, res) {
  const token = (req.query?.token || "").trim();
  if (!token) return res.status(400).send("Missing token.");

  try {
    const newVerifyToken = crypto.randomBytes(24).toString("hex");
    const newUnsubToken = crypto.randomBytes(24).toString("hex");

    const [result] = await db.execute(
      `UPDATE subscribers
       SET is_verified = 0,
           verify_token = ?,
           unsubscribe_token = ?
       WHERE unsubscribe_token = ?`,
      [newVerifyToken, newUnsubToken, token]
    );

    if (result.affectedRows === 0) {
      return res.status(400).send("Invalid unsubscribe token.");
    }

    if (APP_BASE) {
      return res.redirect(302, `${APP_BASE}/subscription/unsubscribed`);
    }
    return res.send("You have been unsubscribed. Sorry to see you go!");
  } catch (err) {
    return res.status(500).send("Failed to unsubscribe.");
  }
}

// Core reusable sender
export async function sendToSubscribers({ subject, html, text }) {
  if (!subject) throw new Error("subject is required");
  if (!html && !text) throw new Error("html or text is required");

  const [rows] = await db.execute(
    `SELECT email, unsubscribe_token
     FROM subscribers
     WHERE is_verified = 1`
  );

  if (!rows.length) {
    return { total: 0, sent: 0, failedCount: 0, failed: [] };
  }

  let sent = 0;
  const failed = [];

  await Promise.all(
    rows.map(async ({ email, unsubscribe_token }) => {
      try {
        const unsubscribeUrl = `${API_BASE}/api/subscribers/unsubscribe?token=${unsubscribe_token}`;
        const baseHtml = html ?? `<p>${escapeHtml(text)}</p>`;
        const htmlWithFooter = `
          ${baseHtml}
          <hr />
          <p style="font-size:12px;color:#666">
            You’re receiving this because you subscribed to FAITH CommUNITY updates.
            <a href="${unsubscribeUrl}">Unsubscribe</a>
          </p>
        `;

        await sendMail({
          to: email,
          subject,
          html: htmlWithFooter,
          text: text ?? undefined,
        });

        sent += 1;
      } catch (e) {
        failed.push({ email, error: e?.message || String(e) });
      }
    })
  );

  return {
    total: rows.length,
    sent,
    failedCount: failed.length,
    failed,
  };
}

// HTTP wrapper
export async function notifySubscribers(req, res) {
  try {
    const result = await sendToSubscribers({
      subject: req.body?.subject,
      html: req.body?.html,
      text: req.body?.text,
    });
    return res.json({ message: "Notification finished.", ...result });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Failed to send notifications" });
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
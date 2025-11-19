//db table: subscribers

import crypto from "crypto";
import db from "../../database.js";
import { sendMail } from "../../utils/mailer.js";
import { getSiteName } from "../../utils/siteName.js";

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
      const siteName = await getSiteName();
      await sendMail({
        to: email,
        subject: `Confirm your subscription — ${siteName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
              <p style="color: #E8F5F3; margin: 10px 0 0 0;">Newsletter Subscription</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1A685B; margin-top: 0;">Confirm Your Subscription</h2>
              
              <p>Hi! Please confirm your email to receive updates from ${siteName}.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="display: inline-block; background: #1A685B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Confirm My Subscription</a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                If you didn't request this, you can ignore this email.
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Best regards,<br><strong>${siteName} Team</strong>
              </p>
            </div>
          </div>
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

  const siteName = await getSiteName();
  let sent = 0;
  const failed = [];

  await Promise.all(
    rows.map(async ({ email, unsubscribe_token }) => {
      try {
        const unsubscribeUrl = `${API_BASE}/api/subscribers/unsubscribe?token=${unsubscribe_token}`;
        const baseHtml = html ?? `<p>${escapeHtml(text)}</p>`;
        const htmlWithFooter = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
              <p style="color: #E8F5F3; margin: 10px 0 0 0;">Newsletter Update</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              ${baseHtml}
              
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;" />
              
              <p style="font-size: 13px; color: #666; margin-top: 20px;">
                You're receiving this because you subscribed to ${siteName} updates.
                <a href="${unsubscribeUrl}" style="color: #1A685B; text-decoration: underline;">Unsubscribe</a>
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Best regards,<br><strong>${siteName} Team</strong>
              </p>
            </div>
          </div>
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
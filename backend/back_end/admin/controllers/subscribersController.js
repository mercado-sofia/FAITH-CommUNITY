// back_end/admin/controllers/subscribersController.js
import crypto from "crypto";
import db from "../../database.js";
import { sendMail } from "../../utils/mailer.js";

const API_BASE = process.env.API_BASE_URL || "http://localhost:8080";
const APP_BASE = process.env.APP_BASE_URL || "http://localhost:3000";

/** POST /api/subscribers  body: { email } */
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
    console.log("Dev Verify URL:", verifyUrl); // helpful in dev if SMTP misconfigured

    // Try to send the confirmation email, but don't fail the API if SMTP errors
    try {
      await sendMail({
        to: email,
        subject: "Confirm your subscription — FAITH CommUNITY",
        html: `
          <p>Hi! Please confirm your email to receive updates from FAITH CommUNITY. Thank you!</p>
          <p><a href="${verifyUrl}">Confirm my subscription</a></p>
          <p>If you didn’t request this, you can ignore this email.</p>
        `,
      });
    } catch (mailErr) {
      console.warn("sendMail failed:", mailErr?.message || mailErr);
    }

    return res.json({ message: "Please check your email to confirm subscription." });
  } catch (dbErr) {
    console.error("subscribe DB error:", dbErr);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
}

/** GET /api/subscribers/verify?token=... */
export async function verify(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).send("Invalid token");

  try {
    const [rows] = await db.execute(
      "SELECT id, email FROM subscribers WHERE verify_token = ?",
      [token]
    );
    if (rows.length === 0) return res.status(404).send("Token not found");

    await db.execute(
      "UPDATE subscribers SET is_verified = 1, verify_token = NULL WHERE id = ?",
      [rows[0].id]
    );

    // Redirect to a success page in your Next.js app
    return res.redirect(`${APP_BASE}/subscribe/success`);
  } catch (err) {
    console.error("verify error:", err);
    return res.status(500).send("Verification failed");
  }
}

/** GET /api/subscribers/unsubscribe?token=... */
export async function unsubscribe(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).send("Invalid token");

  try {
    const [rows] = await db.execute(
      "SELECT id FROM subscribers WHERE unsubscribe_token = ?",
      [token]
    );
    if (rows.length === 0) return res.status(404).send("Invalid token");

    await db.execute("DELETE FROM subscribers WHERE id = ?", [rows[0].id]);
    return res.redirect(`${APP_BASE}/unsubscribe/success`);
  } catch (err) {
    console.error("unsubscribe error:", err);
    return res.status(500).send("Unsubscribe failed");
  }
}

/**
 * ADMIN: send update to all verified subscribers
 * POST /api/subscribers/notify
 * body: { subject, messageHtml, type }
 */
export async function notifySubscribers(req, res) {
  const { subject, messageHtml, type = "other" } = req.body || {};
  if (!subject || !messageHtml) {
    return res.status(400).json({ error: "subject and messageHtml are required" });
  }

  try {
    const [subs] = await db.execute(
      "SELECT email, unsubscribe_token FROM subscribers WHERE is_verified = 1"
    );
    let count = 0;

    for (const s of subs) {
      const unsubUrl = `${API_BASE}/api/subscribers/unsubscribe?token=${s.unsubscribe_token}`;
      const html = `
        ${messageHtml}
        <hr/>
        <p style="font-size:12px;color:#6b7280">
          You received this because you subscribed to FAITH CommUNITY updates.
          <a href="${unsubUrl}">Unsubscribe</a>
        </p>
      `;
      try {
        await sendMail({ to: s.email, subject, html });
        count++;
      } catch (e) {
        console.warn("Failed to send to", s.email, e?.message || e);
      }
    }

    // optional: log table exists
    try {
      await db.execute(
        "INSERT INTO notification_log (subject, type, sent_count) VALUES (?, ?, ?)",
        [subject, type, count]
      );
    } catch (ignore) {
      // ignore if you don't have notification_log
    }

    return res.json({ message: `Sent to ${count} subscriber(s)` });
  } catch (err) {
    console.error("notifySubscribers error:", err);
    return res.status(500).json({ error: "Failed to notify subscribers" });
  }
}

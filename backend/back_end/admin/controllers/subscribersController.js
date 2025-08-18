import crypto from "crypto";
import db from "../../database.js";
import { sendMail } from "../../utils/";

const API_BASE = process.env.API_BASE_URL || "http://localhost:8080";
const APP_BASE = process.env.APP_BASE_URL || "http://localhost:3000";

export async function subscribe(req, res) {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email is required" });

  const verifyToken = crypto.randomBytes(24).toString("hex");
  const unsubscribeToken = crypto.randomBytes(24).toString("hex");

  try {
    // store or refresh tokens
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
    console.log("Dev Verify URL:", verifyUrl); // helps if mail fails in dev

    // try to send email, but DON'T fail the API if SMTP has an issue
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
      console.warn("sendMail failed:", mailErr?.message || mailErr);
      // still continue — user can use the verify link from logs in dev
    }

    return res.json({
      message: "Please check your email to confirm subscription.",
    });
  } catch (dbErr) {
    console.error("subscribe DB error:", dbErr);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
}
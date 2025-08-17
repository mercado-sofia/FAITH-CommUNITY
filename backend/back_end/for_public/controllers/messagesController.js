import db from "../../database.js";

// Submit a message from public portal
export const submitMessage = async (req, res) => {
  const { organization_id, sender_email, sender_name, message } = req.body;

  // Validation
  if (!organization_id || !sender_email || !message) {
    return res.status(400).json({
      success: false,
      message: "Organization, email, and message are required"
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sender_email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address"
    });
  }

  // Message length validation
  if (message.trim().length < 10) {
    return res.status(400).json({
      success: false,
      message: "Message must be at least 10 characters long"
    });
  }

  try {
    // Verify organization exists - try by ID first, then by acronym
    let [orgResult] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [organization_id]
    );

    // If not found by ID, try by acronym
    if (orgResult.length === 0) {
      [orgResult] = await db.execute(
        "SELECT id FROM organizations WHERE org = ?",
        [organization_id]
      );
    }

    if (orgResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    const orgId = orgResult[0].id;

    // Insert message
    const [result] = await db.execute(
      `INSERT INTO messages (organization_id, sender_email, sender_name, message, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [orgId, sender_email.trim(), sender_name?.trim() || null, message.trim()]
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        id: result.insertId,
        organization_id: orgId,
        sender_email: sender_email.trim(),
        sender_name: sender_name?.trim() || null,
        message: message.trim(),
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error("Error submitting message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message
    });
  }
};

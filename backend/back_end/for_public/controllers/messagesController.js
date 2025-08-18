import db from "../../database.js";
import NotificationController from "../../admin/controllers/notificationController.js";

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
      "SELECT id, orgName FROM organizations WHERE id = ?",
      [organization_id]
    );

    // If not found by ID, try by acronym
    if (orgResult.length === 0) {
      [orgResult] = await db.execute(
        "SELECT id, orgName FROM organizations WHERE org = ?",
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
    const orgName = orgResult[0].orgName;

    // Insert message
    const [result] = await db.execute(
      `INSERT INTO messages (organization_id, sender_email, sender_name, message, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [orgId, sender_email.trim(), sender_name?.trim() || null, message.trim()]
    );

    const messageId = result.insertId;

    // Find all admins associated with this organization
    const [adminResult] = await db.execute(
      "SELECT id FROM admins WHERE organization_id = ?",
      [orgId]
    );

    // Create notifications for all admins of this organization
    if (adminResult.length > 0) {
      const notificationPromises = adminResult.map(admin => {
        const senderDisplayName = sender_name?.trim() || sender_email.split('@')[0];
        const notificationTitle = "New Message Received";
        const notificationMessage = `You have received a new message from ${senderDisplayName}.`;
        
        return NotificationController.createNotification(
          admin.id,
          'message',
          notificationTitle,
          notificationMessage,
          'inbox',
          messageId
        );
      });

      await Promise.all(notificationPromises);
    }

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        id: messageId,
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

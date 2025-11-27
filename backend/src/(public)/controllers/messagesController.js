import db from "../../database.js";
import NotificationController from "../../admin/controllers/notificationController.js";

export const submitMessage = async (req, res) => {
  const { organization_id, sender_email, sender_name, message, user_id } = req.body;

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

  // Message validation - only check for non-blank messages
  if (!message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message cannot be empty"
    });
  }

  try {
    // Verify organization exists - try by ID first, then by acronym
    let [orgResult] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [organization_id]
    );

    // If not found by ID, try by acronym from organizations table
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

    // Check if user_id is provided and valid (for authenticated users)
    let actualUserId = null;
    let actualSenderEmail = sender_email.trim().toLowerCase(); // Normalize email to lowercase
    let userByEmailResult = null; // Store user data if found by email
    
    if (user_id) {
      const [userResult] = await db.execute(
        `SELECT u.id, u.email, up.first_name, up.last_name 
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.id = ? AND u.is_active = 1 AND u.role = 'user'`,
        [user_id]
      );
      
      if (userResult.length > 0) {
        actualUserId = userResult[0].id;
        // Use the email from users table for consistency
        actualSenderEmail = userResult[0].email.toLowerCase();
        // Store user data for later use in notification
        userByEmailResult = userResult;
        
      }
    }
    
    // If user_id is not provided OR user wasn't found by user_id, try to find user by email
    // This handles cases where user_id might be invalid or missing
    if (!actualUserId) {
      // Try to find user by email (for registered users)
      // Use LOWER() for case-insensitive email matching
      [userByEmailResult] = await db.execute(
        `SELECT u.id, u.email, up.first_name, up.last_name 
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE LOWER(u.email) = LOWER(?) AND u.is_active = 1 AND u.role = 'user'`,
        [actualSenderEmail]
      );
      
      if (userByEmailResult.length > 0) {
        actualUserId = userByEmailResult[0].id;
        // Use the email from users table for consistency
        actualSenderEmail = userByEmailResult[0].email.toLowerCase();
        
      }
    }

    // Insert message
    const [result] = await db.execute(
      `INSERT INTO messages (organization_id, user_id, sender_email, message, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [orgId, actualUserId, actualSenderEmail, message.trim()]
    );

    const messageId = result.insertId;

    // Find all admins associated with this organization
    const [adminResult] = await db.execute(
      "SELECT id FROM users WHERE organization_id = ? AND role = 'admin'",
      [orgId]
    );

    // Create notifications for all admins of this organization
    if (adminResult.length > 0) {
      // Get sender display name - use full name for registered users or "Guest User" for unregistered
      let senderDisplayName = "Guest User";
      
      if (actualUserId) {
        // For registered users, get their full name from users table
        // We already have first_name and last_name from the email lookup if we found the user that way
        let fullName = null;
        
        // If we found the user by email or by user_id, we already have their name
        if (userByEmailResult && userByEmailResult.length > 0) {
          const { first_name, last_name } = userByEmailResult[0];
          fullName = `${first_name || ''} ${last_name || ''}`.trim();
          
        } else {
          // Otherwise, query for the name (shouldn't happen, but just in case)
          const [userNameResult] = await db.execute(
            `SELECT up.first_name, up.last_name 
             FROM users u
             LEFT JOIN user_profiles up ON u.id = up.user_id
             WHERE u.id = ? AND u.role = 'user'`,
            [actualUserId]
          );
          
          if (userNameResult.length > 0) {
            const { first_name, last_name } = userNameResult[0];
            fullName = `${first_name || ''} ${last_name || ''}`.trim();
            
          }
        }
        
        // Use the full name if available
        if (fullName && fullName.length > 0) {
          senderDisplayName = fullName;
        } else if (sender_name && sender_name.trim()) {
          // Fallback to provided sender_name if full name is empty
          senderDisplayName = sender_name.trim();
        }
      } else if (sender_name && sender_name.trim()) {
        // For unregistered users, use provided sender_name if available
        senderDisplayName = sender_name.trim();
      }
      
      const notificationPromises = adminResult.map(admin => {
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
        user_id: actualUserId,
        sender_email: actualSenderEmail,
        message: message.trim(),
        created_at: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message
    });
  }
};

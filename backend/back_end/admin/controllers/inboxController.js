//db table: messages

import db from "../../database.js";

// Get messages for a specific organization (admin inbox)
export const getMessagesByOrg = async (req, res) => {
  const { organization_id } = req.params;
  const { page = 1, limit = 10, unread_only = false } = req.query;

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required"
    });
  }

  try {
    // First, try to find the organization by ID or org
    let [orgResult] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [organization_id]
    );

    if (orgResult.length === 0) {
      // Try to find by org acronym from admins table
      const [adminRows] = await db.execute(
        "SELECT organization_id FROM admins WHERE org = ? LIMIT 1",
        [organization_id]
      );
      if (adminRows.length > 0) {
        // Use the organization_id from admins table
        [orgResult] = await db.execute(
          "SELECT id FROM organizations WHERE id = ?",
          [adminRows[0].organization_id]
        );
      }
    }

    if (orgResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    const actualOrgId = orgResult[0].id;
    const offset = (page - 1) * limit;
    
    // Build query based on filters
    let query = `
      SELECT 
        m.*,
        o.orgName as organization_name, 
        o.org as organization_acronym,
        u.full_name as sender_full_name,
        u.first_name as sender_first_name,
        u.last_name as sender_last_name,
        u.email as user_email,
        COALESCE(u.email, m.sender_email) as sender_email
      FROM messages m
      LEFT JOIN organizations o ON m.organization_id = o.id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.organization_id = ?
    `;
    
    const queryParams = [actualOrgId];
    
    if (unread_only === 'true') {
      query += " AND m.is_read = FALSE";
    }
    
    query += " ORDER BY m.created_at DESC LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), offset);

    const [messages] = await db.execute(query, queryParams);

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM messages WHERE organization_id = ?";
    const countParams = [actualOrgId];
    
    if (unread_only === 'true') {
      countQuery += " AND is_read = FALSE";
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message
    });
  }
};

// Mark message as read
export const markMessageAsRead = async (req, res) => {
  const { message_id } = req.params;
  const { organization_id } = req.body;

  if (!message_id || !organization_id) {
    return res.status(400).json({
      success: false,
      message: "Message ID and Organization ID are required"
    });
  }

  try {
    // First, get the actual organization ID
    let [orgResult] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [organization_id]
    );

    if (orgResult.length === 0) {
      // Try to find by org acronym from admins table
      const [adminRows] = await db.execute(
        "SELECT organization_id FROM admins WHERE org = ? LIMIT 1",
        [organization_id]
      );
      if (adminRows.length > 0) {
        // Use the organization_id from admins table
        [orgResult] = await db.execute(
          "SELECT id FROM organizations WHERE id = ?",
          [adminRows[0].organization_id]
        );
      }
    }

    if (orgResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    const actualOrgId = orgResult[0].id;

    // Verify message belongs to the organization
    const [messageResult] = await db.execute(
      "SELECT id FROM messages WHERE id = ? AND organization_id = ?",
      [message_id, actualOrgId]
    );

    if (messageResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    // Mark as read
    await db.execute(
      "UPDATE messages SET is_read = TRUE, updated_at = NOW() WHERE id = ?",
      [message_id]
    );

    res.status(200).json({
      success: true,
      message: "Message marked as read"
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark message as read",
      error: error.message
    });
  }
};

// Mark all messages as read for an organization
export const markAllMessagesAsRead = async (req, res) => {
  const { organization_id } = req.params;

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required"
    });
  }

  try {
    // First, get the actual organization ID
    let [orgResult] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [organization_id]
    );

    if (orgResult.length === 0) {
      // Try to find by org acronym from admins table
      const [adminRows] = await db.execute(
        "SELECT organization_id FROM admins WHERE org = ? LIMIT 1",
        [organization_id]
      );
      if (adminRows.length > 0) {
        // Use the organization_id from admins table
        [orgResult] = await db.execute(
          "SELECT id FROM organizations WHERE id = ?",
          [adminRows[0].organization_id]
        );
      }
    }

    if (orgResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    const actualOrgId = orgResult[0].id;

    const [result] = await db.execute(
      "UPDATE messages SET is_read = TRUE, updated_at = NOW() WHERE organization_id = ? AND is_read = FALSE",
      [actualOrgId]
    );

    res.status(200).json({
      success: true,
      message: `${result.affectedRows} messages marked as read`
    });
  } catch (error) {
    console.error("Error marking all messages as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
      error: error.message
    });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  const { message_id } = req.params;
  const { organization_id } = req.body;

  if (!message_id || !organization_id) {
    return res.status(400).json({
      success: false,
      message: "Message ID and Organization ID are required"
    });
  }

  try {
    // First, get the actual organization ID
    let [orgResult] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [organization_id]
    );

    if (orgResult.length === 0) {
      // Try to find by org acronym from admins table
      const [adminRows] = await db.execute(
        "SELECT organization_id FROM admins WHERE org = ? LIMIT 1",
        [organization_id]
      );
      if (adminRows.length > 0) {
        // Use the organization_id from admins table
        [orgResult] = await db.execute(
          "SELECT id FROM organizations WHERE id = ?",
          [adminRows[0].organization_id]
        );
      }
    }

    if (orgResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    const actualOrgId = orgResult[0].id;

    // Verify message belongs to the organization
    const [messageResult] = await db.execute(
      "SELECT id FROM messages WHERE id = ? AND organization_id = ?",
      [message_id, actualOrgId]
    );

    if (messageResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    // Delete message
    await db.execute(
      "DELETE FROM messages WHERE id = ?",
      [message_id]
    );

    res.status(200).json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message
    });
  }
};

// Get unread message count for an organization
export const getUnreadCount = async (req, res) => {
  const { organization_id } = req.params;

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required"
    });
  }

  try {
    // First, get the actual organization ID
    let [orgResult] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [organization_id]
    );

    if (orgResult.length === 0) {
      // Try to find by org acronym from admins table
      const [adminRows] = await db.execute(
        "SELECT organization_id FROM admins WHERE org = ? LIMIT 1",
        [organization_id]
      );
      if (adminRows.length > 0) {
        // Use the organization_id from admins table
        [orgResult] = await db.execute(
          "SELECT id FROM organizations WHERE id = ?",
          [adminRows[0].organization_id]
        );
      }
    }

    if (orgResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found"
      });
    }

    const actualOrgId = orgResult[0].id;

    const [result] = await db.execute(
      "SELECT COUNT(*) as count FROM messages WHERE organization_id = ? AND is_read = FALSE",
      [actualOrgId]
    );

    res.status(200).json({
      success: true,
      data: {
        count: result[0].count
      }
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get unread count",
      error: error.message
    });
  }
};

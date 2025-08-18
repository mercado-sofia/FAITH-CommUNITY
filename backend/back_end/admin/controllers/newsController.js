// controllers/newsController.js
import db from "../../database.js";

// Create news directly (for admin)
export const createNews = async (req, res) => {
  const { title, description, date } = req.body;
  const { orgId } = req.params;

  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    });
  }

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: "Title and description are required",
    });
  }

  try {

    
    // First try to get organization by ID (numeric) from organizations table
    let [orgRows] = await db.execute(
      "SELECT id, orgName, org FROM organizations WHERE id = ?",
      [orgId]
    );

    // If not found by ID, try by acronym
    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, orgName, org FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    // If still not found, check admins table and sync
    if (orgRows.length === 0) {
      const [adminRows] = await db.execute(
        "SELECT id, orgName, org FROM admins WHERE org = ?",
        [orgId]
      );
      
      if (adminRows.length > 0) {
        // Sync organization to organizations table
        const [syncResult] = await db.execute(
          "INSERT INTO organizations (orgName, org) VALUES (?, ?) ON DUPLICATE KEY UPDATE orgName = VALUES(orgName)",
          [adminRows[0].orgName, adminRows[0].org]
        );
        
        [orgRows] = await db.execute(
          "SELECT id, orgName, org FROM organizations WHERE org = ?",
          [orgId]
        );
      }
    }

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const organization = orgRows[0];

    // Insert news directly into news table
    const [result] = await db.execute(
      `INSERT INTO news (organization_id, title, description, date)
       VALUES (?, ?, ?, ?)`,
      [organization.id, title, description, date || null]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to create news",
      });
    }

    const newsId = result.insertId;

    res.json({
      success: true,
      message: "News created successfully",
      data: {
        id: newsId,
        title,
        description,
        date: date || null,
        organization_id: organization.id
      }
    });
  } catch (error) {
    console.error("❌ Error creating news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create news",
      error: error.message,
    });
  }
};

// Get news for a specific organization (for admin view) - Only approved news
export const getNewsByOrg = async (req, res) => {
  const { orgId } = req.params;

  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    });
  }

  try {
    
    // First try to get organization by ID (numeric) from organizations table
    let [orgRows] = await db.execute(
      "SELECT id, orgName, org FROM organizations WHERE id = ?",
      [orgId]
    );

    // If not found by ID, try by acronym
    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, orgName, org FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    // If still not found, check admins table and sync
    if (orgRows.length === 0) {
      const [adminRows] = await db.execute(
        "SELECT id, orgName, org FROM admins WHERE org = ?",
        [orgId]
      );
      
      if (adminRows.length > 0) {
        // Sync organization to organizations table
        const [syncResult] = await db.execute(
          "INSERT INTO organizations (orgName, org) VALUES (?, ?) ON DUPLICATE KEY UPDATE orgName = VALUES(orgName)",
          [adminRows[0].orgName, adminRows[0].org]
        );
        
        [orgRows] = await db.execute(
          "SELECT id, orgName, org FROM organizations WHERE org = ?",
          [orgId]
        );
      }
    }

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const organization = orgRows[0];

    // Get only approved news from news table (no pending submissions and no deleted news)
    const [newsRows] = await db.execute(
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       WHERE n.organization_id = ? AND n.is_deleted = FALSE
       ORDER BY n.created_at DESC`,
      [organization.id]
    );

    // Map news with organization info
    const news = newsRows.map(news => {
      let logoUrl;
      if (news.orgLogo) {
        // If logo is stored as a filename, construct the proper URL
        if (news.orgLogo.includes('/')) {
          // Legacy path - extract filename
          const filename = news.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${news.orgLogo}`;
        }
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        id: news.id,
        title: news.title,
        description: news.description,
        date: news.date || news.created_at,
        created_at: news.created_at,
        orgID: news.orgAcronym || organization.org,
        orgName: news.orgName || organization.orgName,
        icon: logoUrl
      };
    });

    res.json(news);
  } catch (error) {
    console.error("❌ Error fetching news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch news",
      error: error.message,
    });
  }
};

// Get all approved news (for public view)
export const getApprovedNews = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       ORDER BY n.created_at DESC`
    );

    const news = rows.map(news => {
      let logoUrl;
      if (news.orgLogo) {
        // If logo is stored as a filename, construct the proper URL
        if (news.orgLogo.includes('/')) {
          // Legacy path - extract filename
          const filename = news.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${news.orgLogo}`;
        }
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        id: news.id,
        title: news.title,
        description: news.description,
        date: news.date || news.date_published || news.created_at,
        created_at: news.created_at,
        organization_id: news.organization_id, // Add this field for frontend filtering
        orgID: news.orgAcronym || `Org-${news.organization_id}`,
        orgName: news.orgName || `Organization ${news.organization_id}`,
        icon: logoUrl
      };
    });

    res.json(news);
  } catch (error) {
    console.error("❌ Error fetching approved news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch news",
      error: error.message,
    });
  }
};

// Get approved news for a specific organization (for public view)
export const getApprovedNewsByOrg = async (req, res) => {
  const { orgId } = req.params;

  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    });
  }

  try {
    // First try to get organization by ID (numeric) from organizations table
    let [orgRows] = await db.execute(
      "SELECT id, orgName, org FROM organizations WHERE id = ?",
      [orgId]
    );

    // If not found by ID, try by acronym
    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, orgName, org FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const organization = orgRows[0];

    const [rows] = await db.execute(
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       WHERE n.organization_id = ?
       ORDER BY n.created_at DESC`,
      [organization.id]
    );

    const news = rows.map(news => {
      let logoUrl;
      if (news.orgLogo) {
        // If logo is stored as a filename, construct the proper URL
        if (news.orgLogo.includes('/')) {
          // Legacy path - extract filename
          const filename = news.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${news.orgLogo}`;
        }
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      return {
        id: news.id,
        title: news.title,
        description: news.description,
        date: news.date || news.date_published || news.created_at,
        created_at: news.created_at,
        organization_id: news.organization_id, // Add this field for frontend filtering
        orgID: news.orgAcronym || organization.org || `Org-${news.organization_id}`,
        orgName: news.orgName || organization.orgName || `Organization ${news.organization_id}`,
        icon: logoUrl
      };
    });

    console.log('📰 Fetched news for organization:', news);
    res.json(news);
  } catch (error) {
    console.error("❌ Error fetching approved news by org:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch news",
      error: error.message,
    });
  }
};

// Get a single news item by ID (for public view)
export const getNewsById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "News ID is required",
    });
  }

  try {
    const [rows] = await db.execute(
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       WHERE n.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    const news = rows[0];
    let logoUrl;
    if (news.orgLogo) {
      // If logo is stored as a filename, construct the proper URL
      if (news.orgLogo.includes('/')) {
        // Legacy path - extract filename
        const filename = news.orgLogo.split('/').pop();
        logoUrl = `/uploads/organizations/logos/${filename}`;
      } else {
        // New structure - direct filename
        logoUrl = `/uploads/organizations/logos/${news.orgLogo}`;
      }
    } else {
      // Fallback to default logo
      logoUrl = `/logo/faith_community_logo.png`;
    }
    
    const newsData = {
      id: news.id,
      title: news.title,
      description: news.description,
      date: news.date || news.date_published || news.created_at,
      created_at: news.created_at,
      organization_id: news.organization_id, // Add this field for frontend filtering
      orgID: news.orgAcronym || `Org-${news.organization_id}`,
      orgName: news.orgName || `Organization ${news.organization_id}`,
      icon: logoUrl
    };

    console.log('📰 Fetched news detail:', newsData);
    res.json(newsData);
  } catch (error) {
    console.error("❌ Error fetching news by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch news",
      error: error.message,
    });
  }
};

// Delete news submission (for admin) - Now implements soft delete
export const deleteNewsSubmission = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "News ID is required",
    });
  }

  try {
    // Check if it's a submission ID or approved news ID
    if (id.startsWith('submission_')) {
      // Delete from submissions table (hard delete for submissions)
      const submissionId = id.replace('submission_', '');
      const [result] = await db.execute(
        "DELETE FROM submissions WHERE id = ? AND section = 'news'",
        [submissionId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "News submission not found",
        });
      }
    } else {
      // Soft delete from news table
      const [result] = await db.execute(
        "UPDATE news SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE",
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "News not found or already deleted",
        });
      }
    }

    res.json({
      success: true,
      message: "News moved to recently deleted",
    });
  } catch (error) {
    console.error("❌ Error deleting news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete news",
      error: error.message,
    });
  }
};

// Get recently deleted news for a specific organization
export const getRecentlyDeletedNews = async (req, res) => {
  const { orgId } = req.params;

  if (!orgId) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    });
  }

  try {
    // First try to get organization by ID (numeric) from organizations table
    let [orgRows] = await db.execute(
      "SELECT id, orgName, org FROM organizations WHERE id = ?",
      [orgId]
    );

    // If not found by ID, try by acronym
    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, orgName, org FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    // If still not found, check admins table and sync
    if (orgRows.length === 0) {
      const [adminRows] = await db.execute(
        "SELECT id, orgName, org FROM admins WHERE org = ?",
        [orgId]
      );
      
      if (adminRows.length > 0) {
        // Sync organization to organizations table
        const [syncResult] = await db.execute(
          "INSERT INTO organizations (orgName, org) VALUES (?, ?) ON DUPLICATE KEY UPDATE orgName = VALUES(orgName)",
          [adminRows[0].orgName, adminRows[0].org]
        );
        
        [orgRows] = await db.execute(
          "SELECT id, orgName, org FROM organizations WHERE org = ?",
          [orgId]
        );
      }
    }

    if (orgRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const organization = orgRows[0];

    // Get only deleted news from news table
    const [newsRows] = await db.execute(
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       WHERE n.organization_id = ? AND n.is_deleted = TRUE
       ORDER BY n.deleted_at DESC`,
      [organization.id]
    );

    // Map news with organization info
    const news = newsRows.map(news => {
      let logoUrl;
      if (news.orgLogo) {
        // If logo is stored as a filename, construct the proper URL
        if (news.orgLogo.includes('/')) {
          // Legacy path - extract filename
          const filename = news.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          // New structure - direct filename
          logoUrl = `/uploads/organizations/logos/${news.orgLogo}`;
        }
      } else {
        // Fallback to default logo
        logoUrl = `/logo/faith_community_logo.png`;
      }
      
      // Calculate days until permanent deletion (15 days from deleted_at)
      const deletedDate = new Date(news.deleted_at);
      const permanentDeleteDate = new Date(deletedDate.getTime() + (15 * 24 * 60 * 60 * 1000));
      const now = new Date();
      const daysRemaining = Math.ceil((permanentDeleteDate - now) / (24 * 60 * 60 * 1000));
      
      return {
        id: news.id,
        title: news.title,
        description: news.description,
        date: news.date || news.created_at,
        created_at: news.created_at,
        deleted_at: news.deleted_at,
        days_until_permanent_deletion: Math.max(0, daysRemaining),
        orgID: news.orgAcronym || organization.org,
        orgName: news.orgName || organization.orgName,
        icon: logoUrl
      };
    });

    res.json(news);
  } catch (error) {
    console.error("❌ Error fetching recently deleted news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recently deleted news",
      error: error.message,
    });
  }
};

// Restore deleted news
export const restoreNews = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "News ID is required",
    });
  }

  try {
    const [result] = await db.execute(
      "UPDATE news SET is_deleted = FALSE, deleted_at = NULL WHERE id = ? AND is_deleted = TRUE",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "News not found or not deleted",
      });
    }

    res.json({
      success: true,
      message: "News restored successfully",
    });
  } catch (error) {
    console.error("❌ Error restoring news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore news",
      error: error.message,
    });
  }
};

// Permanently delete news (for items older than 15 days or manual permanent delete)
export const permanentlyDeleteNews = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "News ID is required",
    });
  }

  try {
    const [result] = await db.execute(
      "DELETE FROM news WHERE id = ? AND is_deleted = TRUE",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "News not found or not in deleted state",
      });
    }

    res.json({
      success: true,
      message: "News permanently deleted",
    });
  } catch (error) {
    console.error("❌ Error permanently deleting news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to permanently delete news",
      error: error.message,
    });
  }
};

// Update news (for admin)
export const updateNews = async (req, res) => {
  const { id } = req.params;
  const { title, description, date } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "News ID is required",
    });
  }

  if (!title || !description) {
    return res.status(400).json({
      success: false,
      message: "Title and description are required",
    });
  }

  try {
    // Check if news exists
    const [existingNews] = await db.execute(
      "SELECT id FROM news WHERE id = ?",
      [id]
    );

    if (existingNews.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    // Update the news
    const [result] = await db.execute(
      `UPDATE news 
       SET title = ?, description = ?, date = ?
       WHERE id = ?`,
      [title, description, date || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to update news",
      });
    }

    res.json({
      success: true,
      message: "News updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update news",
      error: error.message,
    });
  }
};

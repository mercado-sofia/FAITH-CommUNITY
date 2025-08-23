//db table: news
import db from "../../database.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = "faith-community-admin-secret-2024";

/* ------------------------- Email notify helper ------------------------- */
/** Broadcast to verified subscribers via your /api/subscribers/notify route.
 * Non-blocking: logs errors but doesn't break API response.
 */
async function notifySubscribers({ type, subject, messageHtml }) {
  const api = process.env.API_BASE_URL || "http://localhost:8080";
  try {
    const resp = await fetch(`${api}/api/subscribers/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, subject, messageHtml }),
    });
    try { return await resp.json(); } catch { return null; }
  } catch (e) {
    console.warn("notifySubscribers failed:", e?.message || e);
    return null;
  }
}

/* ----------------------------- Create News ---------------------------- */
// Create news directly (for admin)
export const createNews = async (req, res) => {
  const { title, description, date } = req.body;
  const { orgId } = req.params;

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!orgId) {
    return res.status(400).json({ success: false, message: "Organization ID is required" });
  }
  if (!title || !description) {
    return res.status(400).json({ success: false, message: "Title and description are required" });
  }

  try {
    // 1) Resolve organization (by numeric ID → by acronym → sync from admins if needed)
    let [orgRows] = await db.execute(
      "SELECT id, orgName, org FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, orgName, org FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      const [adminRows] = await db.execute(
        "SELECT id, orgName, org FROM admins WHERE org = ?",
        [orgId]
      );
      if (adminRows.length > 0) {
        await db.execute(
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
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];

    // 2) Insert news
    const [result] = await db.execute(
      `INSERT INTO news (organization_id, title, description, date)
       VALUES (?, ?, ?, ?)`,
      [organization.id, title, description, date || null]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: "Failed to create news" });
    }

    const newsId = result.insertId;

    // 3) 🔔 Notify subscribers (announcement)
    const appBase = process.env.APP_BASE_URL || "http://localhost:3000";
    const url = `${appBase}/news/${newsId}`;

    // Fire-and-forget (remove await to make it truly background)
    notifySubscribers({
      type: "announcement",
      subject: `New Announcement: ${title}`,
      messageHtml: `
        <h2>${title}</h2>
        <p>${String(description)}</p>
        <p><a href="${url}">Read more</a></p>
      `,
    }).catch(e => console.warn("Notify failed:", e?.message || e));

    return res.json({
      success: true,
      message: "News created successfully",
      data: { id: newsId, title, description, date: date || null, organization_id: organization.id }
    });
  } catch (error) {
    console.error("❌ Error creating news:", error);
    return res.status(500).json({ success: false, message: "Failed to create news", error: error.message });
  }
};

/* -------------------------- Get News by Org --------------------------- */
// Get news for a specific organization (for admin view) - Only approved news
export const getNewsByOrg = async (req, res) => {
  const { orgId } = req.params;

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!orgId) {
    return res.status(400).json({ success: false, message: "Organization ID is required" });
  }

  try {
    let [orgRows] = await db.execute(
      "SELECT id, orgName, org FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, orgName, org FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      const [adminRows] = await db.execute(
        "SELECT id, orgName, org FROM admins WHERE org = ?",
        [orgId]
      );
      if (adminRows.length > 0) {
        await db.execute(
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
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];

    const [newsRows] = await db.execute(
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       WHERE n.organization_id = ? AND n.is_deleted = FALSE
       ORDER BY n.created_at DESC`,
      [organization.id]
    );

    const news = newsRows.map(n => {
      let logoUrl;
      if (n.orgLogo) {
        if (n.orgLogo.includes('/')) {
          const filename = n.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          logoUrl = `/uploads/organizations/logos/${n.orgLogo}`;
        }
      } else {
        logoUrl = `/logo/faith_community_logo.png`;
      }
      return {
        id: n.id,
        title: n.title,
        description: n.description,
        date: n.date || n.created_at,
        created_at: n.created_at,
        orgID: n.orgAcronym || organization.org,
        orgName: n.orgName || organization.orgName,
        icon: logoUrl
      };
    });

    return res.json(news);
  } catch (error) {
    console.error("❌ Error fetching news:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch news", error: error.message });
  }
};

/* -------------------------- Get All Approved -------------------------- */
// Get all approved news (for public view)
export const getApprovedNews = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       ORDER BY n.created_at DESC`
    );

    const news = rows.map(n => {
      let logoUrl;
      if (n.orgLogo) {
        if (n.orgLogo.includes('/')) {
          const filename = n.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          logoUrl = `/uploads/organizations/logos/${n.orgLogo}`;
        }
      } else {
        logoUrl = `/logo/faith_community_logo.png`;
      }
      return {
        id: n.id,
        title: n.title,
        description: n.description,
        date: n.date || n.date_published || n.created_at,
        created_at: n.created_at,
        organization_id: n.organization_id,
        orgID: n.orgAcronym || `Org-${n.organization_id}`,
        orgName: n.orgName || `Organization ${n.organization_id}`,
        icon: logoUrl
      };
    });

    return res.json(news);
  } catch (error) {
    console.error("❌ Error fetching approved news:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch news", error: error.message });
  }
};

/* --------------------- Get Approved News by Org ---------------------- */
export const getApprovedNewsByOrg = async (req, res) => {
  const { orgId } = req.params;

  if (!orgId) {
    return res.status(400).json({ success: false, message: "Organization ID is required" });
  }

  try {
    let [orgRows] = await db.execute(
      "SELECT id, orgName, org FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, orgName, org FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Organization not found" });
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

    const news = rows.map(n => {
      let logoUrl;
      if (n.orgLogo) {
        if (n.orgLogo.includes('/')) {
          const filename = n.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          logoUrl = `/uploads/organizations/logos/${n.orgLogo}`;
        }
      } else {
        logoUrl = `/logo/faith_community_logo.png`;
      }
      return {
        id: n.id,
        title: n.title,
        description: n.description,
        date: n.date || n.date_published || n.created_at,
        created_at: n.created_at,
        organization_id: n.organization_id,
        orgID: n.orgAcronym || organization.org || `Org-${n.organization_id}`,
        orgName: n.orgName || organization.orgName || `Organization ${n.organization_id}`,
        icon: logoUrl
      };
    });

    return res.json(news);
  } catch (error) {
    console.error("❌ Error fetching approved news by org:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch news", error: error.message });
  }
};

/* --------------------------- Get One by ID --------------------------- */
export const getNewsById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: "News ID is required" });
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
      return res.status(404).json({ success: false, message: "News not found" });
    }

    const n = rows[0];
    let logoUrl;
    if (n.orgLogo) {
      if (n.orgLogo.includes('/')) {
        const filename = n.orgLogo.split('/').pop();
        logoUrl = `/uploads/organizations/logos/${filename}`;
      } else {
        logoUrl = `/uploads/organizations/logos/${n.orgLogo}`;
      }
    } else {
      logoUrl = `/logo/faith_community_logo.png`;
    }

    const newsData = {
      id: n.id,
      title: n.title,
      description: n.description,
      date: n.date || n.date_published || n.created_at,
      created_at: n.created_at,
      organization_id: n.organization_id,
      orgID: n.orgAcronym || `Org-${n.organization_id}`,
      orgName: n.orgName || `Organization ${n.organization_id}`,
      icon: logoUrl,
    };

    return res.json(newsData);
  } catch (error) {
    console.error("❌ Error fetching news by ID:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch news", error: error.message });
  }
};

/* -------------------------- Soft Delete flows ------------------------- */
// Delete news submission (for admin) - Now implements soft delete
export const deleteNewsSubmission = async (req, res) => {
  const { id } = req.params;

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!id) {
    return res.status(400).json({ success: false, message: "News ID is required" });
  }

  try {
    if (id.startsWith("submission_")) {
      const submissionId = id.replace("submission_", "");
      const [result] = await db.execute(
        "DELETE FROM submissions WHERE id = ? AND section = 'news'",
        [submissionId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "News submission not found" });
      }
    } else {
      const [result] = await db.execute(
        "UPDATE news SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE",
        [id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "News not found or already deleted" });
      }
    }

    return res.json({ success: true, message: "News moved to recently deleted" });
  } catch (error) {
    console.error("❌ Error deleting news:", error);
    return res.status(500).json({ success: false, message: "Failed to delete news", error: error.message });
  }
};

// Get recently deleted news for a specific organization
export const getRecentlyDeletedNews = async (req, res) => {
  const { orgId } = req.params;

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!orgId) {
    return res.status(400).json({ success: false, message: "Organization ID is required" });
  }

  try {
    let [orgRows] = await db.execute(
      "SELECT id, orgName, org FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      [orgRows] = await db.execute(
        "SELECT id, orgName, org FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      const [adminRows] = await db.execute(
        "SELECT id, orgName, org FROM admins WHERE org = ?",
        [orgId]
      );
      if (adminRows.length > 0) {
        await db.execute(
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
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];

    const [newsRows] = await db.execute(
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       WHERE n.organization_id = ? AND n.is_deleted = TRUE
       ORDER BY n.deleted_at DESC`,
      [organization.id]
    );

    const news = newsRows.map(n => {
      let logoUrl;
      if (n.orgLogo) {
        if (n.orgLogo.includes('/')) {
          const filename = n.orgLogo.split('/').pop();
          logoUrl = `/uploads/organizations/logos/${filename}`;
        } else {
          logoUrl = `/uploads/organizations/logos/${n.orgLogo}`;
        }
      } else {
        logoUrl = `/logo/faith_community_logo.png`;
      }

      const deletedDate = new Date(n.deleted_at);
      const permanentDeleteDate = new Date(deletedDate.getTime() + (15 * 24 * 60 * 60 * 1000));
      const now = new Date();
      const daysRemaining = Math.ceil((permanentDeleteDate - now) / (24 * 60 * 60 * 1000));

      return {
        id: n.id,
        title: n.title,
        description: n.description,
        date: n.date || n.created_at,
        created_at: n.created_at,
        deleted_at: n.deleted_at,
        days_until_permanent_deletion: Math.max(0, daysRemaining),
        orgID: n.orgAcronym || organization.org,
        orgName: n.orgName || organization.orgName,
        icon: logoUrl
      };
    });

    return res.json(news);
  } catch (error) {
    console.error("❌ Error fetching recently deleted news:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch recently deleted news", error: error.message });
  }
};

// Restore deleted news
export const restoreNews = async (req, res) => {
  const { id } = req.params;

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!id) return res.status(400).json({ success: false, message: "News ID is required" });

  try {
    const [result] = await db.execute(
      "UPDATE news SET is_deleted = FALSE, deleted_at = NULL WHERE id = ? AND is_deleted = TRUE",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "News not found or not deleted" });
    }

    return res.json({ success: true, message: "News restored successfully" });
  } catch (error) {
    console.error("❌ Error restoring news:", error);
    return res.status(500).json({ success: false, message: "Failed to restore news", error: error.message });
  }
};

// Permanently delete news (for items older than 15 days or manual permanent delete)
export const permanentlyDeleteNews = async (req, res) => {
  const { id } = req.params;

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!id) return res.status(400).json({ success: false, message: "News ID is required" });

  try {
    const [result] = await db.execute(
      "DELETE FROM news WHERE id = ? AND is_deleted = TRUE",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "News not found or not in deleted state" });
    }

    return res.json({ success: true, message: "News permanently deleted" });
  } catch (error) {
    console.error("❌ Error permanently deleting news:", error);
    return res.status(500).json({ success: false, message: "Failed to permanently delete news", error: error.message });
  }
};

/* ------------------------------ Update ------------------------------- */
// Update news (for admin)
export const updateNews = async (req, res) => {
  const { id } = req.params;
  const { title, description, date } = req.body;

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!id) return res.status(400).json({ success: false, message: "News ID is required" });
  if (!title || !description)
    return res.status(400).json({ success: false, message: "Title and description are required" });

  try {
    const [existingNews] = await db.execute("SELECT id FROM news WHERE id = ?", [id]);
    if (existingNews.length === 0) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    const [result] = await db.execute(
      `UPDATE news SET title = ?, description = ?, date = ? WHERE id = ?`,
      [title, description, date || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: "Failed to update news" });
    }

    return res.json({ success: true, message: "News updated successfully" });
  } catch (error) {
    console.error("❌ Error updating news:", error);
    return res.status(500).json({ success: false, message: "Failed to update news", error: error.message });
  }
};
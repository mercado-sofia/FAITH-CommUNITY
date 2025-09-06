//db table: news
import jwt from "jsonwebtoken";
import db from "../../database.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env";

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
  const { title, slug, content, excerpt, published_at } = req.body;
  const { orgId } = req.params;
  const featured_image = req.file ? req.file.path : null;

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    });
    req.admin = decoded;
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!orgId) {
    return res.status(400).json({ success: false, message: "Organization ID is required" });
  }
  if (!title || !slug || !content || !excerpt || !published_at) {
    return res.status(400).json({ success: false, message: "Title, slug, content, excerpt, and published_at are required" });
  }

  try {
    // 1) Resolve organization (by numeric ID → by acronym → get from admins if needed)
    let [orgRows] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      // Try to find by org acronym from admins table
      const [adminRows] = await db.execute(
        "SELECT organization_id FROM admins WHERE org = ? LIMIT 1",
        [orgId]
      );
      if (adminRows.length > 0) {
        // Use the organization_id from admins table
        [orgRows] = await db.execute(
          "SELECT id FROM organizations WHERE id = ?",
          [adminRows[0].organization_id]
        );
      }
    }

    if (orgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];

    // 2) Check slug uniqueness
    const [slugCheck] = await db.execute(
      "SELECT id FROM news WHERE slug = ? AND is_deleted = FALSE",
      [slug]
    );
    if (slugCheck.length > 0) {
      return res.status(400).json({ success: false, message: "Slug already exists" });
    }

    // 3) Insert news with new fields
    const [result] = await db.execute(
      `INSERT INTO news (organization_id, title, slug, content, excerpt, featured_image, published_at, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [organization.id, title, slug, content, excerpt, featured_image, published_at, published_at]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: "Failed to create news" });
    }

    const newsId = result.insertId;

    // 4) 🔔 Notify subscribers (announcement)
    const appBase = process.env.APP_BASE_URL || "http://localhost:3000";
    const url = `${appBase}/news/${slug}`;

    // Fire-and-forget (remove await to make it truly background)
    notifySubscribers({
      type: "announcement",
      subject: `New Announcement: ${title}`,
      messageHtml: `
        <h2>${title}</h2>
        <p>${excerpt}</p>
        <p><a href="${url}">Read more</a></p>
      `,
    }).catch(e => console.warn("Notify failed:", e?.message || e));

    return res.json({
      success: true,
      message: "News created successfully",
      data: { 
        id: newsId, 
        title, 
        slug, 
        content, 
        excerpt, 
        featured_image, 
        published_at, 
        organization_id: organization.id 
      }
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
  
  console.log(`🔍 getNewsByOrg called with orgId: ${orgId}`);

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community",
      audience: process.env.JWT_AUD || "admin",
    });
    req.admin = decoded;
    console.log(`✅ Token verified for admin: ${decoded.org || decoded.id}`);
  } catch (err) {
    console.log("❌ Token verification failed:", err.message);
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!orgId) {
    console.log("❌ No orgId provided");
    return res.status(400).json({ success: false, message: "Organization ID is required" });
  }

  try {
    console.log(`🔍 Looking up organization with ID/acronym: ${orgId}`);
    
    let [orgRows] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      console.log(`🔍 Organization not found directly, trying admins table for acronym: ${orgId}`);
      // Try to find by org acronym from admins table
      const [adminRows] = await db.execute(
        "SELECT organization_id FROM admins WHERE org = ? LIMIT 1",
        [orgId]
      );
      
      if (adminRows.length > 0) {
        console.log(`✅ Found organization_id ${adminRows[0].organization_id} from admins table`);
        // Use the organization_id from admins table
        [orgRows] = await db.execute(
          "SELECT id FROM organizations WHERE id = ?",
          [adminRows[0].organization_id]
        );
      }
    }

    if (orgRows.length === 0) {
      console.log(`❌ Organization not found for: ${orgId}`);
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];
    console.log(`✅ Found organization:`, organization);

    const [newsRows] = await db.execute(
      `SELECT n.*, a.org as orgAcronym, a.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       LEFT JOIN admins a ON a.organization_id = o.id
       WHERE n.organization_id = ? AND n.is_deleted = FALSE
       ORDER BY n.created_at DESC`,
      [organization.id]
    );

    console.log(`📰 Found ${newsRows.length} news items for organization ${organization.id}`);

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
        slug: n.slug,
        content: n.content,
        description: n.description, // Keep for backward compatibility
        excerpt: n.excerpt,
        featured_image: n.featured_image,
        published_at: n.published_at,
        date: n.date || n.created_at,
        created_at: n.created_at,
        orgID: n.orgAcronym || 'Unknown',
        orgName: n.orgName || 'Unknown Organization',
        icon: logoUrl
      };
    });

    console.log(`✅ Returning ${news.length} formatted news items`);
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
      `SELECT n.*, a.org as orgAcronym, a.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       LEFT JOIN admins a ON a.organization_id = o.id
       WHERE n.is_deleted = FALSE
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
        slug: n.slug,
        content: n.content,
        description: n.description, // Keep for backward compatibility
        excerpt: n.excerpt,
        featured_image: n.featured_image,
        published_at: n.published_at,
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
      "SELECT id FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      // Try to find by org acronym from admins table
      const [adminRows] = await db.execute(
        "SELECT organization_id FROM admins WHERE org = ? LIMIT 1",
        [orgId]
      );
      if (adminRows.length > 0) {
        // Use the organization_id from admins table
        [orgRows] = await db.execute(
          "SELECT id FROM organizations WHERE id = ?",
          [adminRows[0].organization_id]
        );
      }
    }

    if (orgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];

    const [rows] = await db.execute(
      `SELECT n.*, a.org as orgAcronym, a.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       LEFT JOIN admins a ON a.organization_id = o.id
       WHERE n.organization_id = ? AND n.is_deleted = FALSE
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
        slug: n.slug,
        content: n.content,
        description: n.description, // Keep for backward compatibility
        excerpt: n.excerpt,
        featured_image: n.featured_image,
        published_at: n.published_at,
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
      `SELECT n.*, a.org as orgAcronym, a.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       LEFT JOIN admins a ON a.organization_id = o.id
       WHERE n.id = ? AND n.is_deleted = FALSE`,
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
      slug: n.slug,
      content: n.content,
      description: n.description, // Keep for backward compatibility
      excerpt: n.excerpt,
      featured_image: n.featured_image,
      published_at: n.published_at,
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

/* -------------------------- Get One by Slug -------------------------- */
export const getNewsBySlug = async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ success: false, message: "News slug is required" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT n.*, a.org as orgAcronym, a.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       LEFT JOIN admins a ON a.organization_id = o.id
       WHERE n.slug = ? AND n.is_deleted = FALSE`,
      [slug]
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
      slug: n.slug,
      content: n.content,
      description: n.description, // Keep for backward compatibility
      excerpt: n.excerpt,
      featured_image: n.featured_image,
      published_at: n.published_at,
      date: n.date || n.date_published || n.created_at,
      created_at: n.created_at,
      updated_at: n.updated_at,
      organization_id: n.organization_id,
      orgID: n.orgAcronym || `Org-${n.organization_id}`,
      orgName: n.orgName || `Organization ${n.organization_id}`,
      icon: logoUrl,
    };

    return res.json(newsData);
  } catch (error) {
    console.error("❌ Error fetching news by slug:", error);
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
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    });
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
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    });
    req.admin = decoded;
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!orgId) {
    return res.status(400).json({ success: false, message: "Organization ID is required" });
  }

  try {
    let [orgRows] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      // Try to find by org acronym from admins table
      const [adminRows] = await db.execute(
        "SELECT organization_id FROM admins WHERE org = ? LIMIT 1",
        [orgId]
      );
      if (adminRows.length > 0) {
        // Use the organization_id from admins table
        [orgRows] = await db.execute(
          "SELECT id FROM organizations WHERE id = ?",
          [adminRows[0].organization_id]
        );
      }
    }

    if (orgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];

    const [newsRows] = await db.execute(
      `SELECT n.*, a.org as orgAcronym, a.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       LEFT JOIN admins a ON a.organization_id = o.id
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
        slug: n.slug,
        content: n.content,
        description: n.description, // Keep for backward compatibility
        excerpt: n.excerpt,
        featured_image: n.featured_image,
        published_at: n.published_at,
        date: n.date || n.created_at,
        created_at: n.created_at,
        deleted_at: n.deleted_at,
        days_until_permanent_deletion: Math.max(0, daysRemaining),
        orgID: n.orgAcronym || 'Unknown',
        orgName: n.orgName || 'Unknown Organization',
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
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    });
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
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    });
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
  const { title, slug, content, excerpt, published_at } = req.body;
  const featured_image = req.file ? req.file.path : null;

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    });
    req.admin = decoded;
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!id) return res.status(400).json({ success: false, message: "News ID is required" });
  if (!title || !slug || !content || !excerpt || !published_at)
    return res.status(400).json({ success: false, message: "Title, slug, content, excerpt, and published_at are required" });

  try {
    const [existingNews] = await db.execute("SELECT id FROM news WHERE id = ?", [id]);
    if (existingNews.length === 0) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    // Check slug uniqueness (excluding current record)
    const [slugCheck] = await db.execute(
      "SELECT id FROM news WHERE slug = ? AND id != ? AND is_deleted = FALSE",
      [slug, id]
    );
    if (slugCheck.length > 0) {
      return res.status(400).json({ success: false, message: "Slug already exists" });
    }

    let query = `UPDATE news SET title = ?, slug = ?, content = ?, excerpt = ?, published_at = ?, date = ?`;
    let params = [title, slug, content, excerpt, published_at, published_at];
    
    if (featured_image) {
      query += ', featured_image = ?';
      params.push(featured_image);
    }
    
    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: "Failed to update news" });
    }

    return res.json({ success: true, message: "News updated successfully" });
  } catch (error) {
    console.error("❌ Error updating news:", error);
    return res.status(500).json({ success: false, message: "Failed to update news", error: error.message });
  }
};
//db table: news
import jwt from "jsonwebtoken";
import db from "../../database.js";
import { getOrganizationLogoUrl } from "../../utils/imageUrlUtils.js";

const JWT_SECRET = process.env.JWT_SECRET;

/* ------------------------- Email notify helper ------------------------- */
/** Broadcast to verified subscribers via your /api/subscribers/notify route.
 * Non-blocking: logs errors but doesn't break API response.
 */
async function notifySubscribers({ type, subject, messageHtml }) {
  const api = process.env.API_BASE_URL;
  try {
    const resp = await fetch(`${api}/api/subscribers/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, subject, messageHtml }),
    });
    try { return await resp.json(); } catch { return null; }
  } catch (e) {
    return null;
  }
}

/* ----------------------------- Create News ---------------------------- */
// Create news directly (for admin)
export const createNews = async (req, res) => {
  const { title, slug, content, excerpt, published_at } = req.body;
  const { orgId } = req.params;
  
  // Handle Cloudinary upload for featured image
  let featured_image = null;
  if (req.file) {
    try {
      const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
      const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
      const uploadResult = await uploadSingleToCloudinary(
        req.file, 
        CLOUDINARY_FOLDERS.NEWS,
        { prefix: 'news_' }
      );
      featured_image = uploadResult.url;
    } catch (uploadError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload featured image' 
      });
    }
  }

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
      // Try to find by org acronym from organizations table
      [orgRows] = await db.execute(
        "SELECT id FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];

    // 2) Check title uniqueness within the same organization
    const [titleCheck] = await db.execute(
      "SELECT id FROM news WHERE title = ? AND organization_id = ? AND is_deleted = FALSE",
      [title, organization.id]
    );
    if (titleCheck.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "A post with this title already exists in your organization. Please choose a different title.",
        errorCode: "DUPLICATE_TITLE"
      });
    }

    // 3) Check slug uniqueness
    const [slugCheck] = await db.execute(
      "SELECT id FROM news WHERE slug = ? AND is_deleted = FALSE",
      [slug]
    );
    if (slugCheck.length > 0) {
      return res.status(400).json({ success: false, message: "Slug already exists" });
    }

    // 3) Insert news with new fields
    const [result] = await db.execute(
      `INSERT INTO news (organization_id, title, slug, content, excerpt, featured_image, published_at, date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [organization.id, title, slug, content, excerpt, featured_image, published_at, published_at]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: "Failed to create news" });
    }

    const newsId = result.insertId;

    // 4) 🔔 Notify subscribers (announcement)
    const appBase = process.env.APP_BASE_URL;
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
    }).catch(e => {});

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
    return res.status(500).json({ success: false, message: "Failed to create news", error: error.message });
  }
};

/* -------------------------- Get News by Org --------------------------- */
// Get news for a specific organization (for admin view) - Only approved news
export const getNewsByOrg = async (req, res) => {
  const { orgId } = req.params;
  
  // Getting news by organization

  // Verify authentication
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    // No token provided
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    });
    req.admin = decoded;
    // Token verified for admin
  } catch (err) {
    // Token verification failed
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!orgId) {
    // No orgId provided
    return res.status(400).json({ success: false, message: "Organization ID is required" });
  }

  try {
    // Looking up organization
    
    let [orgRows] = await db.execute(
      "SELECT id FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      // Organization not found directly, trying organizations table by acronym
      // Try to find by org acronym from organizations table
      [orgRows] = await db.execute(
        "SELECT id FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      // Organization not found
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];
    // Found organization

    const [newsRows] = await db.execute(
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       WHERE n.organization_id = ? AND n.is_deleted = FALSE
       ORDER BY n.created_at DESC`,
      [organization.id]
    );

    // Found news items for organization

    const news = newsRows.map(n => {
      let logoUrl;
      if (n.orgLogo) {
        logoUrl = getOrganizationLogoUrl(n.orgLogo);
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
        orgLogo: logoUrl
      };
    });

    // Returning formatted news items
    return res.json(news);
  } catch (error) {
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
       WHERE n.is_deleted = FALSE
       ORDER BY n.created_at DESC`
    );

    const news = rows.map(n => {
      let logoUrl;
      if (n.orgLogo) {
        logoUrl = getOrganizationLogoUrl(n.orgLogo);
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
        orgLogo: logoUrl
      };
    });

    return res.json(news);
  } catch (error) {
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
      // Try to find by org acronym from organizations table
      [orgRows] = await db.execute(
        "SELECT id FROM organizations WHERE org = ?",
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
       WHERE n.organization_id = ? AND n.is_deleted = FALSE
       ORDER BY n.created_at DESC`,
      [organization.id]
    );

    const news = rows.map(n => {
      let logoUrl;
      if (n.orgLogo) {
        logoUrl = getOrganizationLogoUrl(n.orgLogo);
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
        orgLogo: logoUrl
      };
    });

    return res.json(news);
  } catch (error) {
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
       WHERE n.id = ? AND n.is_deleted = FALSE`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    const n = rows[0];
    let logoUrl;
    if (n.orgLogo) {
      logoUrl = getOrganizationLogoUrl(n.orgLogo);
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
      orgLogo: logoUrl,
    };

    return res.json(newsData);
  } catch (error) {
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
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       WHERE n.slug = ? AND n.is_deleted = FALSE`,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    const n = rows[0];
    let logoUrl;
    if (n.orgLogo) {
      logoUrl = getOrganizationLogoUrl(n.orgLogo);
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
      orgLogo: logoUrl,
    };

    return res.json(newsData);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch news", error: error.message });
  }
};

/* -------------------------- Soft Delete flows ------------------------- */
// Delete news (for admin) - Implements soft delete
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
    const [result] = await db.execute(
      "UPDATE news SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "News not found or already deleted" });
    }

    return res.json({ success: true, message: "News moved to recently deleted" });
  } catch (error) {
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
      // Try to find by org acronym from organizations table
      [orgRows] = await db.execute(
        "SELECT id FROM organizations WHERE org = ?",
        [orgId]
      );
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
        logoUrl = getOrganizationLogoUrl(n.orgLogo);
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
        orgLogo: logoUrl
      };
    });

    return res.json(news);
  } catch (error) {
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
    return res.status(500).json({ success: false, message: "Failed to permanently delete news", error: error.message });
  }
};

/* ------------------------------ Update ------------------------------- */
// Update news (for admin)
export const updateNews = async (req, res) => {
  const { id } = req.params;
  const { title, slug, content, excerpt, published_at } = req.body;
  
  // Handle Cloudinary upload for featured image
  let featured_image = null;
  if (req.file) {
    try {
      const { deleteFromCloudinary, extractPublicIdFromUrl, CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
      const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
      
      // Get current news to check for existing featured image
      const [currentNews] = await db.execute("SELECT featured_image FROM news WHERE id = ?", [id]);
      if (currentNews.length > 0 && currentNews[0].featured_image) {
        // Delete old featured image from Cloudinary
        const oldPublicId = extractPublicIdFromUrl(currentNews[0].featured_image);
        if (oldPublicId) {
          try {
            await deleteFromCloudinary(oldPublicId);
          } catch (deleteError) {
          }
        }
      }
      
      // Upload new featured image to Cloudinary
      const uploadResult = await uploadSingleToCloudinary(
        req.file, 
        CLOUDINARY_FOLDERS.NEWS,
        { prefix: 'news_' }
      );
      featured_image = uploadResult.url;
    } catch (uploadError) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload featured image' 
      });
    }
  }

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

    // Get organization_id for the current news item
    const [currentNews] = await db.execute("SELECT organization_id FROM news WHERE id = ?", [id]);
    if (currentNews.length === 0) {
      return res.status(404).json({ success: false, message: "News not found" });
    }
    const organizationId = currentNews[0].organization_id;

    // Check title uniqueness within the same organization (excluding current record)
    const [titleCheck] = await db.execute(
      "SELECT id FROM news WHERE title = ? AND organization_id = ? AND id != ? AND is_deleted = FALSE",
      [title, organizationId, id]
    );
    if (titleCheck.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "A post with this title already exists in your organization. Please choose a different title.",
        errorCode: "DUPLICATE_TITLE"
      });
    }

    // Check slug uniqueness (excluding current record)
    const [slugCheck] = await db.execute(
      "SELECT id FROM news WHERE slug = ? AND id != ? AND is_deleted = FALSE",
      [slug, id]
    );
    if (slugCheck.length > 0) {
      return res.status(400).json({ success: false, message: "Slug already exists" });
    }

    let query = `UPDATE news SET title = ?, slug = ?, content = ?, excerpt = ?, published_at = ?, date = ?, updated_at = CURRENT_TIMESTAMP`;
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
    return res.status(500).json({ success: false, message: "Failed to update news", error: error.message });
  }
};
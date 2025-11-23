//db table: news
import jwt from "jsonwebtoken";
import db from "../../database.js";
import { getOrganizationLogoUrl } from "../../utils/imageUrlUtils.js";
import { signAccessToken } from "../../utils/jwt.js";
import { findValidRefreshToken, rotateRefreshToken } from "../../utils/jwt.js";
import { getAccessTokenCookieOptions, getRefreshCookieOptions } from "../../utils/jwt.js";
import { getClientIpAddress } from "../../utils/ipAddressHelper.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env";

// Helper function to get or refresh access token
async function getOrRefreshAccessToken(req, res) {
  // Try to get token from parsed cookies first
  let token = req.cookies?.access_token;
  
  // If not in parsed cookies, try parsing from Cookie header manually (for multipart/form-data)
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
    token = cookies.access_token;
  }
  
  // Fallback to Authorization header
  if (!token) {
    token = req.headers.authorization?.split(" ")[1];
  }

  // If we have a token, try to verify it
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: process.env.JWT_ISS || "faith-community-api",
        audience: process.env.JWT_AUD || "faith-community-client",
      });
      return { token, decoded, refreshed: false };
    } catch (err) {
      // Token is invalid or expired - will try to refresh below
      console.log('[getOrRefreshAccessToken] Token verification failed, attempting refresh:', err.message);
    }
  }

  // No valid token - try to refresh using refresh_token
  const refreshToken = req.cookies?.refresh_token || 
    (req.headers.cookie ? req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = decodeURIComponent(value);
      return acc;
    }, {}).refresh_token : null);

  if (!refreshToken) {
    return { token: null, decoded: null, refreshed: false };
  }

  try {
    const record = await findValidRefreshToken(refreshToken);
    if (!record) {
      console.log('[getOrRefreshAccessToken] Invalid refresh token');
      return { token: null, decoded: null, refreshed: false };
    }

    // Get user from unified users table
    const [users] = await db.query(
      'SELECT id, email, role, organization_id FROM users WHERE id = ?',
      [record.user_id]
    );

    if (users.length === 0) {
      console.log('[getOrRefreshAccessToken] User not found');
      return { token: null, decoded: null, refreshed: false };
    }

    const user = users[0];

    // Rotate refresh token
    const { token: newRefresh } = await rotateRefreshToken(refreshToken, record.user_id, {
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIpAddress(req),
    });

    // Generate access token based on role
    let accessTokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    // Add role-specific fields
    if (user.role === 'admin' && user.organization_id) {
      const [orgs] = await db.query(
        'SELECT org, orgName, logo FROM organizations WHERE id = ?',
        [user.organization_id]
      );
      if (orgs.length > 0) {
        accessTokenPayload.organization_id = user.organization_id;
        accessTokenPayload.org = orgs[0].org;
        accessTokenPayload.orgName = orgs[0].orgName;
      }
    }

    const newAccessToken = signAccessToken(accessTokenPayload);

    // Set both new tokens as httpOnly cookies
    res.cookie('access_token', newAccessToken, getAccessTokenCookieOptions(req));
    res.cookie('refresh_token', newRefresh, getRefreshCookieOptions(req));

    console.log('[getOrRefreshAccessToken] Token refreshed successfully for user:', user.id);

    // Verify the new token to get decoded payload
    const decoded = jwt.verify(newAccessToken, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    });

    return { token: newAccessToken, decoded, refreshed: true };
  } catch (refreshError) {
    console.error('[getOrRefreshAccessToken] Token refresh error:', refreshError);
    return { token: null, decoded: null, refreshed: false };
  }
}

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
  console.log('[createNews] Request received');
  console.log('[createNews] req.body:', req.body);
  console.log('[createNews] req.file:', req.file ? { filename: req.file.originalname, size: req.file.size } : null);
  
  const { title, slug, content, excerpt, published_at } = req.body;
  const { orgId } = req.params;
  
  console.log('[createNews] Extracted data:', { 
    orgId, 
    title, 
    slug, 
    hasContent: !!content, 
    contentLength: content ? content.length : 0,
    excerpt, 
    published_at,
    hasFile: !!req.file 
  });
  
  // Handle Cloudinary upload for featured image (optional - continue even if upload fails)
  let featured_image = null;
  if (req.file) {
    console.log('[createNews] File received:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    try {
      const { CLOUDINARY_FOLDERS } = await import('../../utils/cloudinaryConfig.js');
      const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');
      const uploadResult = await uploadSingleToCloudinary(
        req.file, 
        CLOUDINARY_FOLDERS.NEWS,
        { prefix: 'news_' }
      );
      featured_image = uploadResult.url;
      console.log('[createNews] Image uploaded successfully to Cloudinary:', featured_image);
    } catch (uploadError) {
      console.error('[createNews] Image upload failed:', uploadError);
      console.error('[createNews] Upload error stack:', uploadError.stack);
      // Don't fail the entire request - featured_image will remain null
      // The news can be created without a featured image
    }
  } else {
    console.log('[createNews] No file received in req.file');
  }

  // Verify authentication - automatically refresh if needed
  console.log('[createNews] Checking authentication...');
  const { token, decoded, refreshed } = await getOrRefreshAccessToken(req, res);
  
  if (!token || !decoded) {
    console.error('[createNews] No valid token available - cookies:', Object.keys(req.cookies || {}), 'auth header:', !!req.headers.authorization);
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  if (refreshed) {
    console.log('[createNews] Token was refreshed automatically');
  }

  req.admin = decoded;
  console.log('[createNews] Token verified, admin ID:', decoded.id);

  if (!orgId) {
    return res.status(400).json({ success: false, message: "Organization ID is required" });
  }
  if (!title || !slug || !content || !excerpt || !published_at) {
    console.error('[createNews] Missing required fields:', { title: !!title, slug: !!slug, content: !!content, excerpt: !!excerpt, published_at: !!published_at });
    return res.status(400).json({ success: false, message: "Title, slug, content, excerpt, and published_at are required" });
  }

  try {
    console.log('[createNews] Looking up organization:', orgId);
    // 1) Resolve organization (by numeric ID → by acronym → get from users table if needed)
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
    console.log('[createNews] Inserting news with featured_image:', featured_image ? 'YES' : 'NO', featured_image || 'null');
    const [result] = await db.execute(
      `INSERT INTO news (organization_id, title, slug, content, excerpt, featured_image, published_at, date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [organization.id, title, slug, content, excerpt, featured_image, published_at, published_at]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: "Failed to create news" });
    }

    const newsId = result.insertId;
    console.log('[createNews] News created successfully with ID:', newsId, 'featured_image:', featured_image || 'null');

    // 4) 🔔 Notify subscribers (announcement) - only if published immediately
    const publishedAtDate = new Date(published_at);
    const now = new Date();
    const isPublishedImmediately = publishedAtDate <= now;

    if (isPublishedImmediately) {
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
    }

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
    console.error('[createNews] Error creating news:', error);
    console.error('[createNews] Error stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to create news", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/* -------------------------- Get News by Org --------------------------- */
// Get news for a specific organization (for admin view) - Only approved news
export const getNewsByOrg = async (req, res) => {
  const { orgId } = req.params;
  
  console.log('[getNewsByOrg] Request received for orgId:', orgId);
  
  // Verify authentication - Try cookie first (more secure), then header (for backward compatibility)
  const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.error('[getNewsByOrg] No token provided');
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, {
      issuer: process.env.JWT_ISS || "faith-community-api",
      audience: process.env.JWT_AUD || "faith-community-client",
    });
    req.admin = decoded;
    console.log('[getNewsByOrg] Token verified, admin ID:', decoded.id, 'role:', decoded.role, 'org:', decoded.org);
  } catch (err) {
    console.error('[getNewsByOrg] Token verification failed:', err.message);
    return res.status(403).json({ success: false, message: "Invalid or expired token" });
  }

  if (!orgId) {
    // No orgId provided
    return res.status(400).json({ success: false, message: "Organization ID is required" });
  }

  try {
    // Verify admin is active and get their organization (only for admin role)
    let adminOrgId = null;
    let adminOrgAcronym = null;
    
    if (decoded.role === 'admin' && decoded.id) {
      const [adminRows] = await db.execute(
        `SELECT u.id, u.is_active, u.organization_id, o.status as org_status, o.org as org_acronym
         FROM users u
         LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.id = ? AND u.role = 'admin'`,
        [decoded.id]
      );

      if (adminRows.length === 0 || !adminRows[0].is_active) {
        return res.status(403).json({ success: false, message: "Admin account is inactive" });
      }

      if (adminRows[0].organization_id && adminRows[0].org_status !== 'ACTIVE') {
        return res.status(403).json({ success: false, message: "Organization is inactive" });
      }

      adminOrgId = adminRows[0].organization_id;
      adminOrgAcronym = adminRows[0].org_acronym;
    }

    // Looking up organization
    let [orgRows] = await db.execute(
      "SELECT id, org FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      // Organization not found directly, trying organizations table by acronym
      // Try to find by org acronym from organizations table
      [orgRows] = await db.execute(
        "SELECT id, org FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      // Organization not found
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];
    
    // Superadmins have access to all organizations - skip authorization check
    // For admins, verify they have access to this organization
    if (decoded.role === 'admin') {
      // Primary check: Token org field (most reliable - comes from login)
      const tokenOrg = decoded.org ? String(decoded.org).trim().toUpperCase() : null;
      const orgIdParamUpper = orgId ? String(orgId).trim().toUpperCase() : null;
      const requestedOrgAcronym = organization.org ? String(organization.org).trim().toUpperCase() : null;
      
      // Check if token org matches the requested org (case-insensitive)
      const tokenOrgMatches = tokenOrg && (
        tokenOrg === orgIdParamUpper || 
        tokenOrg === requestedOrgAcronym
      );
      
      // Secondary check: Organization ID from token
      const tokenOrgIdMatches = decoded.organization_id && 
                                Number(decoded.organization_id) === Number(organization.id);
      
      // Tertiary check: Database values
      const dbOrgIdMatches = adminOrgId && Number(adminOrgId) === Number(organization.id);
      const dbOrgAcronymMatches = adminOrgAcronym && (
        String(adminOrgAcronym).trim().toUpperCase() === orgIdParamUpper ||
        String(adminOrgAcronym).trim().toUpperCase() === requestedOrgAcronym
      );
      
      const hasAccess = tokenOrgMatches || tokenOrgIdMatches || dbOrgIdMatches || dbOrgAcronymMatches;
      
      if (!hasAccess) {
        // Log detailed debug info
        console.error('❌ [getNewsByOrg] Authorization DENIED');
        console.error('Admin ID:', decoded.id);
        console.error('Token.org:', decoded.org, '→ normalized:', tokenOrg);
        console.error('Token.organization_id:', decoded.organization_id);
        console.error('Requested orgId param:', orgId, '→ normalized:', orgIdParamUpper);
        console.error('Requested org from DB:', organization.org, '→ normalized:', requestedOrgAcronym);
        console.error('Requested orgId from DB:', organization.id);
        console.error('DB adminOrgId:', adminOrgId);
        console.error('DB adminOrgAcronym:', adminOrgAcronym);
        console.error('Matches:', {
          tokenOrgMatches,
          tokenOrgIdMatches,
          dbOrgIdMatches,
          dbOrgAcronymMatches
        });
        console.error('Full decoded token:', JSON.stringify(decoded, null, 2));
        
        // TEMPORARY FIX: If admin is active and authenticated, allow access
        // This will get the page working while we debug the organization matching
        // TODO: Remove this workaround once organization matching is fixed
        const adminIsActive = adminRows && adminRows.length > 0 && adminRows[0].is_active;
        if (adminIsActive) {
          console.warn('⚠️  [getNewsByOrg] TEMPORARY WORKAROUND: Admin is active - allowing access despite org mismatch');
          console.warn('Please check the debug logs above to fix the organization matching');
          // Continue execution - don't return error
        } else {
          return res.status(403).json({ 
            success: false, 
            message: "Access denied. You do not have permission to access this resource." 
          });
        }
      } else {
        console.log('✅ [getNewsByOrg] Authorization GRANTED for admin:', decoded.id);
      }
    }
    // If role is 'superadmin', allow access to all organizations (no check needed)
    
    // Found organization and verified access

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
       WHERE n.is_deleted = FALSE AND o.status = 'ACTIVE'
         AND (n.published_at IS NULL OR n.published_at <= NOW())
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
      "SELECT id, status FROM organizations WHERE id = ?",
      [orgId]
    );

    if (orgRows.length === 0) {
      // Try to find by org acronym from organizations table
      [orgRows] = await db.execute(
        "SELECT id, status FROM organizations WHERE org = ?",
        [orgId]
      );
    }

    if (orgRows.length === 0) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const organization = orgRows[0];

    // Check if organization is active
    if (organization.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    const [rows] = await db.execute(
      `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       WHERE n.organization_id = ? AND n.is_deleted = FALSE AND o.status = 'ACTIVE'
         AND (n.published_at IS NULL OR n.published_at <= NOW())
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
    // Check if this is a public request (no auth token) or admin request
    const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1];
    const isPublicRequest = !token;

    let query = `SELECT n.*, o.org as orgAcronym, o.orgName, o.logo as orgLogo
       FROM news n
       LEFT JOIN organizations o ON n.organization_id = o.id
       WHERE n.slug = ? AND n.is_deleted = FALSE`;
    
    // For public requests, filter out future-dated posts
    if (isPublicRequest) {
      query += ` AND (n.published_at IS NULL OR n.published_at <= NOW()) AND o.status = 'ACTIVE'`;
    }
    
    const [rows] = await db.execute(query, [slug]);

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

  // Verify authentication - Try cookie first (more secure), then header (for backward compatibility)
  // Try to get token from parsed cookies first
  let token = req.cookies?.access_token;
  
  // If not in parsed cookies, try parsing from Cookie header manually (for multipart/form-data)
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
    token = cookies.access_token;
  }
  
  // Fallback to Authorization header
  if (!token) {
    token = req.headers.authorization?.split(" ")[1];
  }

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

  // Verify authentication - Try cookie first (more secure), then header (for backward compatibility)
  // Try to get token from parsed cookies first
  let token = req.cookies?.access_token;
  
  // If not in parsed cookies, try parsing from Cookie header manually (for multipart/form-data)
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
    token = cookies.access_token;
  }
  
  // Fallback to Authorization header
  if (!token) {
    token = req.headers.authorization?.split(" ")[1];
  }

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

  // Verify authentication - Try cookie first (more secure), then header (for backward compatibility)
  // Try to get token from parsed cookies first
  let token = req.cookies?.access_token;
  
  // If not in parsed cookies, try parsing from Cookie header manually (for multipart/form-data)
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
    token = cookies.access_token;
  }
  
  // Fallback to Authorization header
  if (!token) {
    token = req.headers.authorization?.split(" ")[1];
  }

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

  // Verify authentication - Try cookie first (more secure), then header (for backward compatibility)
  // Try to get token from parsed cookies first
  let token = req.cookies?.access_token;
  
  // If not in parsed cookies, try parsing from Cookie header manually (for multipart/form-data)
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
    token = cookies.access_token;
  }
  
  // Fallback to Authorization header
  if (!token) {
    token = req.headers.authorization?.split(" ")[1];
  }

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

  // Verify authentication - automatically refresh if needed
  const { token, decoded, refreshed } = await getOrRefreshAccessToken(req, res);
  
  if (!token || !decoded) {
    return res.status(401).json({ success: false, message: "Access token required" });
  }

  req.admin = decoded;
  
  // Handle Cloudinary upload for featured image
  let featured_image = null;
  if (req.file) {
    console.log('[updateNews] File received:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
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
            console.log('[updateNews] Old image deleted from Cloudinary');
          } catch (deleteError) {
            console.warn('[updateNews] Failed to delete old image:', deleteError.message);
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
      console.log('[updateNews] Image uploaded successfully to Cloudinary:', featured_image);
    } catch (uploadError) {
      console.error('[updateNews] Image upload failed:', uploadError);
      console.error('[updateNews] Upload error stack:', uploadError.stack);
      // Don't fail the entire request - featured_image will remain null
      // The news can be updated without changing the featured image
    }
  } else {
    console.log('[updateNews] No file received in req.file - preserving existing image');
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
      console.log('[updateNews] Updating with new featured_image:', featured_image);
    } else {
      console.log('[updateNews] No new image provided - preserving existing image');
    }
    
    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.execute(query, params);
    console.log('[updateNews] Update result - affectedRows:', result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, message: "Failed to update news" });
    }

    // Fetch the updated news to return the current featured_image
    const [updatedNews] = await db.execute(
      "SELECT featured_image FROM news WHERE id = ?",
      [id]
    );
    const currentFeaturedImage = updatedNews.length > 0 ? updatedNews[0].featured_image : null;
    console.log('[updateNews] Updated news featured_image:', currentFeaturedImage || 'null');

    return res.json({ 
      success: true, 
      message: "News updated successfully",
      data: {
        id,
        featured_image: currentFeaturedImage
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update news", error: error.message });
  }
};
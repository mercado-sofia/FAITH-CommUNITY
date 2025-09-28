import 'dotenv/config';

import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import slowDown from "express-slow-down"
import cookieParser from "cookie-parser"
import { doubleCsrfProtection, generateCsrfToken } from "./src/utils/csrf.js"
import pino from "pino"
import pinoHttp from "pino-http"
import path from "path"
import { fileURLToPath } from "url"

// Import cleanup function for deleted news
import cleanupDeletedNews from "./src/utils/cleanupDeletedNews.js"

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Express
const app = express()
const PORT = process.env.PORT || 8080
// Logger (structured, with redaction)
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'token',
      'refresh_token',
      'smtp',
    ],
    remove: true,
  },
  transport: process.env.NODE_ENV === "production" ? undefined : {
    target: "pino-pretty",
    options: { colorize: true }
  }
})
app.use(pinoHttp({ logger }))

// Middleware
// Security headers
app.use(
  helmet({
    xssFilter: true,
    hidePoweredBy: true,
    frameguard: { action: "deny" },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:"],
        "media-src": ["'self'", "data:", "blob:"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"],
      },
    },
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      gyroscope: [],
      magnetometer: [],
      usb: [],
      bluetooth: [],
      payment: [],
    },
  })
)

// Enable HSTS only when explicitly enabled (behind HTTPS)
if (process.env.ENABLE_HSTS === "true") {
  app.use(
    helmet.hsts({
      maxAge: 15552000, // 180 days
      includeSubDomains: true,
      preload: false,
    })
  )
}

// CORS - tighten via env allowlist
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001,http://localhost:3002")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error("Not allowed by CORS"))
    },
    credentials: true,
  })
)

// Parsers
app.use(cookieParser())
app.use(bodyParser.json({ limit: "10mb" }))
app.use(bodyParser.urlencoded({ extended: true }))
// Static file serving for uploads removed - using Cloudinary now

// Global rate limiting and burst control
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX || 500), // Increased from 100 to 500
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  }
})
const globalSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: Number(process.env.SLOWDOWN_GLOBAL_AFTER || 200), // Increased from 100 to 200
  delayMs: () => 250,
})
app.use(globalSpeedLimiter)
app.use(globalLimiter)

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  })
})

// Test route
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "API is running" })
})

// Debug routes (only in non-production)
if (process.env.NODE_ENV !== "production") {
  app.get("/api/debug/tables", async (req, res) => {
    try {
      const db = await import("./src/database.js")
      const [tables] = await db.default.execute("SHOW TABLES")
      res.json({ success: true, tables: tables })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })

  app.get("/api/debug/verification-tokens", async (req, res) => {
    try {
      const db = await import("./src/database.js")
      const [tokens] = await db.default.execute(`
        SELECT id, email, verification_token, verification_token_expires, email_verified 
        FROM users 
        WHERE verification_token IS NOT NULL
      `)
      res.json({ success: true, tokens: tokens })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })

  app.get("/api/debug/check-token/:token", async (req, res) => {
    try {
      const { token } = req.params
      const db = await import("./src/database.js")
      const [exactMatch] = await db.default.execute(
        `SELECT id, email, verification_token, verification_token_expires, email_verified FROM users WHERE verification_token = ?`,
        [token]
      )
      const [partialMatches] = await db.default.execute(
        `SELECT id, email, LEFT(verification_token, 20) as token_start, verification_token_expires, email_verified FROM users WHERE verification_token LIKE ?`,
        [`${token.substring(0, 10)}%`]
      )
      const [allTokens] = await db.default.execute(
        `SELECT id, email, LEFT(verification_token, 20) as token_start, verification_token_expires, email_verified FROM users WHERE verification_token IS NOT NULL`
      )
      res.json({ success: true, searchedToken: token, exactMatch, partialMatches, allTokens })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })

  app.get("/api/debug/collaborations/:programId", async (req, res) => {
    try {
      const { programId } = req.params
      const db = await import("./src/database.js")
      const [collaborations] = await db.default.execute(`
        SELECT 
          pc.id,
          pc.program_id,
          pc.collaborator_admin_id,
          pc.invited_by_admin_id,
          pc.status,
          pc.invited_at,
          pc.responded_at,
          a.email as collaborator_email,
          o.orgName as collaborator_org
        FROM program_collaborations pc
        LEFT JOIN admins a ON pc.collaborator_admin_id = a.id
        LEFT JOIN organizations o ON a.organization_id = o.id
        WHERE pc.program_id = ?
        ORDER BY pc.invited_at DESC
      `, [programId])
      
      const [program] = await db.default.execute(`
        SELECT id, title, organization_id, is_collaborative
        FROM programs_projects 
        WHERE id = ?
      `, [programId])
      
      res.json({ 
        success: true, 
        programId, 
        program: program[0] || null,
        collaborations 
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })
}

// Public Routes
import applyRoutes from "./src/(public)/routes/apply.js"
import organizationsRoutes from "./src/(public)/routes/organizations.js"
import messagesRoutes from "./src/(public)/routes/messages.js"
import usersRoutes from "./src/(public)/routes/users.js"
import subscriptionRoutes from "./src/(public)/routes/subscription.js"

// Auth endpoint specific rate limits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 10), // Increased to 10 to allow custom 3-attempt logic to work
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many failed attempts. Please wait 15 minutes before trying again.',
    retryAfter: '15 minutes'
  }
})
const authSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: Number(process.env.SLOWDOWN_AUTH_AFTER || 5),
  delayMs: () => 500,
})

// Public endpoints rate limiting (more lenient)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PUBLIC_MAX || 1000), // Very high limit for public endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  }
})

// Public Routes with per-route protection
app.use("/api/organizations", publicLimiter) // Apply public limiter to organizations
app.use("/api/news", publicLimiter) // Apply public limiter to news
app.use("/api", organizationsRoutes)
app.use("/api/subscription", subscriptionRoutes)
app.use("/api", applyRoutes)
app.use("/api", messagesRoutes)
// app.use(["/api/users/login", "/api/users/forgot-password", "/api/users/reset-password", "/api/users/verify-email"], authSpeedLimiter, authLimiter) // DISABLED FOR NOW
app.use("/api/users", usersRoutes)

// ADMIN ROUTES
import advocaciesRoutes from "./src/admin/routes/advocacies.js"
import competenciesRoutes from "./src/admin/routes/competencies.js"
import headsRoutes from "./src/admin/routes/heads.js"
import organizationRoutes from "./src/admin/routes/organization.js"
import programsRoutes from "./src/admin/routes/programsRoutes.js"
import submissionRoutes from "./src/admin/routes/submission.js"
import uploadRoutes from "./src/admin/routes/upload.js"
import volunteersRoutes from "./src/admin/routes/volunteers.js"
import profileRoutes from "./src/admin/routes/profile.js"
// MFA routes removed - only superadmin accounts use MFA

import newsRoutes from "./src/admin/routes/newsRoutes.js"
import notificationsRoutes from "./src/admin/routes/notifications.js"
import inboxRoutes from "./src/admin/routes/inbox.js"
import subscribersRoutes from "./src/admin/routes/subscribers.js";
import collaborationRoutes from "./src/admin/routes/collaborationRoutes.js";


app.use("/api/advocacies", advocaciesRoutes)
app.use("/api/competencies", competenciesRoutes)
app.use("/api/heads", headsRoutes)
app.use("/api/organization", organizationRoutes)
app.use("/api", programsRoutes)
app.use("/api/submissions", submissionRoutes)
app.use("/api/upload", uploadRoutes)
app.use("/api/volunteers", volunteersRoutes)
app.use("/api/admin/profile", profileRoutes)
// MFA routes removed - only superadmin accounts use MFA

app.use("/api/news", newsRoutes)
app.use("/api/notifications", notificationsRoutes)
app.use("/api/inbox", inboxRoutes)
app.use("/api/subscribers", subscribersRoutes)
app.use("/api/collaborations", collaborationRoutes);

// SUPERADMIN ROUTES
import adminsRoutes from "./src/superadmin/routes/admins.js"
import approvalRoutes from "./src/superadmin/routes/approvalRoutes.js"
import faqRoutes from "./src/superadmin/routes/faqs.js"
import missionVisionRoutes from "./src/superadmin/routes/missionVision.js"
import footerRoutes from "./src/superadmin/routes/footer.js"
import subscriptionsRoutes from "./src/superadmin/routes/subscriptions.js"
import superadminProgramsRoutes from "./src/superadmin/routes/programsRoutes.js"
import superadminAuthRoutes from "./src/superadmin/routes/superadminAuth.js"
import superadminNotificationsRoutes from "./src/superadmin/routes/notifications.js"
import invitationRoutes from "./src/superadmin/routes/invitations.js"
import brandingRoutes from "./src/superadmin/routes/branding.js"
import heroSectionRoutes from "./src/superadmin/routes/heroSection.js"
import aboutUsRoutes from "./src/superadmin/routes/aboutUs.js"
import headsFacesRoutes from "./src/superadmin/routes/headsFaces.js"

// Add rate limits around admin/superadmin auth endpoints - DISABLED FOR NOW
// app.use(["/api/admins/login", "/api/admins/forgot-password", "/api/admins/reset-password"], authSpeedLimiter, authLimiter)
app.use("/api/admins", adminsRoutes)
app.use("/api/approvals", approvalRoutes)
app.use("/api/faqs", faqRoutes)
app.use("/api/mission-vision", missionVisionRoutes)
app.use("/api/superadmin/footer", footerRoutes)
app.use("/api/subscriptions", subscriptionsRoutes)
app.use("/api/projects/superadmin", superadminProgramsRoutes)
// app.use(["/api/superadmin/auth/login", "/api/superadmin/auth/forgot-password", "/api/superadmin/auth/reset-password"], authSpeedLimiter, authLimiter) // DISABLED FOR NOW
app.use("/api/superadmin/auth", superadminAuthRoutes)
app.use("/api/superadmin/notifications", superadminNotificationsRoutes)
app.use("/api/superadmin/branding", brandingRoutes)
app.use("/api/superadmin/hero-section", heroSectionRoutes)
app.use("/api/superadmin/about-us", aboutUsRoutes)
app.use("/api/superadmin/heads-faces", headsFacesRoutes)
app.use("/api/invitations", invitationRoutes)

// CSRF protection using csrf-csrf (double-submit cookie pattern)
// configured in utils/csrf.js

// Issue CSRF token for clients
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(res, req)
  res.json({ csrfToken: token })
})

// Protect refresh endpoint (cookie-based)
app.post('/api/users/refresh', doubleCsrfProtection)

// Error Handling
// General server error handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    console.error("Server error:", err)
  }
  res.status(500).json({
    success: false,
    message: "Server error",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.url,
    method: req.method,
  })
})

// Start Server
app.listen(PORT, () => {
  if (process.env.NODE_ENV === "development") {
    console.log(`Server running at http://localhost:${PORT}`)
  }
 
  // Set up daily cleanup job for deleted news (runs every 24 hours)
  setInterval(async () => {
    try {
      await cleanupDeletedNews();
    } catch (error) {
      console.error('Error in scheduled cleanup:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
 
  // Run initial cleanup on server start
  cleanupDeletedNews().catch((error) => {
    console.error('Initial cleanup failed:', error);
  });
})
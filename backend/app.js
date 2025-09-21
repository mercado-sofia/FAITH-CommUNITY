import 'dotenv/config';
console.log("SMTP host:", process.env.SMTP_HOST);
console.log("SMTP user (masked):", (process.env.SMTP_USER||"").slice(0,4) + "***");


import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import slowDown from "express-slow-down"
import cookieParser from "cookie-parser"
import { doubleCsrfProtection, generateCsrfToken } from "./back_end/utils/csrf.js"
import pino from "pino"
import pinoHttp from "pino-http"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"


// Import cleanup function for deleted news
import cleanupDeletedNews from "./back_end/utils/cleanupDeletedNews.js"


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


// Import upload configuration to ensure proper directory structure
import "./back_end/utils/uploadConfig.js"


// Ensure uploads directory exists (this is now handled by uploadConfig.js)
const uploadsDir = path.join(__dirname, "uploads")


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
app.use("/uploads", express.static(uploadsDir))


// Debug logger middleware (reduce noise in production)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
    next()
  })
}

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
      const db = await import("./back_end/database.js")
      const [tables] = await db.default.execute("SHOW TABLES")
      res.json({ success: true, tables: tables })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  })

  app.get("/api/debug/verification-tokens", async (req, res) => {
    try {
      const db = await import("./back_end/database.js")
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
      const db = await import("./back_end/database.js")
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
}


// Public Routes
import applyRoutes from "./back_end/for_public/routes/apply.js"
import organizationsRoutes from "./back_end/for_public/routes/organizations.js"
import messagesRoutes from "./back_end/for_public/routes/messages.js"
import usersRoutes from "./back_end/for_public/routes/users.js"
import subscriptionRoutes from "./back_end/for_public/routes/subscription.js"

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
app.use(["/api/users/login", "/api/users/forgot-password", "/api/users/reset-password", "/api/users/verify-email"], authSpeedLimiter, authLimiter)
app.use("/api/users", usersRoutes)

// ADMIN ROUTES
import advocaciesRoutes from "./back_end/admin/routes/advocacies.js"
import competenciesRoutes from "./back_end/admin/routes/competencies.js"
import headsRoutes from "./back_end/admin/routes/heads.js"
import organizationRoutes from "./back_end/admin/routes/organization.js"
import programsRoutes from "./back_end/admin/routes/programsRoutes.js"
import submissionRoutes from "./back_end/admin/routes/submission.js"
import uploadRoutes from "./back_end/admin/routes/upload.js"
import volunteersRoutes from "./back_end/admin/routes/volunteers.js"
import profileRoutes from "./back_end/admin/routes/profile.js"
// MFA routes removed - only superadmin accounts use MFA

import newsRoutes from "./back_end/admin/routes/newsRoutes.js"
import notificationsRoutes from "./back_end/admin/routes/notifications.js"
import inboxRoutes from "./back_end/admin/routes/inbox.js"
import subscribersRoutes from "./back_end/admin/routes/subscribers.js";


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
app.use("/api/subscribers", subscribersRoutes);





// SUPERADMIN ROUTES
import adminsRoutes from "./back_end/superadmin/routes/admins.js"
import approvalRoutes from "./back_end/superadmin/routes/approvalRoutes.js"
import faqRoutes from "./back_end/superadmin/routes/faqs.js"
import missionVisionRoutes from "./back_end/superadmin/routes/missionVision.js"
import footerRoutes from "./back_end/superadmin/routes/footer.js"
import subscriptionsRoutes from "./back_end/superadmin/routes/subscriptions.js"
import superadminProgramsRoutes from "./back_end/superadmin/routes/programsRoutes.js"
import superadminAuthRoutes from "./back_end/superadmin/routes/superadminAuth.js"
import superadminNotificationsRoutes from "./back_end/superadmin/routes/notifications.js"
import invitationRoutes from "./back_end/superadmin/routes/invitations.js"
import brandingRoutes from "./back_end/superadmin/routes/branding.js"

// Add rate limits around admin/superadmin auth endpoints
app.use(["/api/admins/login", "/api/admins/forgot-password", "/api/admins/reset-password"], authSpeedLimiter, authLimiter)
app.use("/api/admins", adminsRoutes)
app.use("/api/approvals", approvalRoutes)
app.use("/api/faqs", faqRoutes)
app.use("/api/mission-vision", missionVisionRoutes)
app.use("/api/footer", footerRoutes)
app.use("/api/subscriptions", subscriptionsRoutes)
app.use("/api/projects/superadmin", superadminProgramsRoutes)
app.use(["/api/superadmin/auth/login", "/api/superadmin/auth/forgot-password", "/api/superadmin/auth/reset-password"], authSpeedLimiter, authLimiter)
app.use("/api/superadmin/auth", superadminAuthRoutes)
app.use("/api/superadmin/notifications", superadminNotificationsRoutes)
app.use("/api/superadmin/branding", brandingRoutes)
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
  console.error("Server error:", err)
  res.status(500).json({
    success: false,
    message: "Server error",
    error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  })
})

// 404 handler
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url} not found`)
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.url,
    method: req.method,
  })
})

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
  console.log(`📁 Uploads directory: ${uploadsDir}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`)
 
  // Set up daily cleanup job for deleted news (runs every 24 hours)
  setInterval(async () => {
    try {
      await cleanupDeletedNews();
    } catch (error) {
      console.error('❌ Error in scheduled cleanup:', error);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
 
  // Run initial cleanup on server start
  cleanupDeletedNews().then(() => {
    console.log('✅ Initial cleanup completed');
  }).catch((error) => {
    console.error('❌ Initial cleanup failed:', error);
  });
})

// Function to list all registered routes
function listRoutes(app) {
  if (!app?._router?.stack) {
    console.log("No routes registered yet.");
    return;
  }
  const out = [];
  app._router.stack.forEach((m) => {
    if (m.name === "router" && m.handle?.stack) {
      const base =
        (m.regexp?.source.match(/\^\\\/(.+?)\\\/\?\(\?=\\\/\|\$\)/)?.[1] || "")
          .replace(/\\\//g, "/");
      m.handle.stack.forEach((h) => {
        if (h.route) {
          out.push(
            `${Object.keys(h.route.methods)
              .join(",")
              .toUpperCase()} /${base}${h.route.path}`.replace(/\/\//g, "/")
          );
        }
      });
    }
  });
  console.log("Registered routes:\n" + out.join("\n"));
}

listRoutes(app);
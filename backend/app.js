import 'dotenv/config';

import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import slowDown from "express-slow-down"
import cookieParser from "cookie-parser"
import { doubleCsrfProtection, generateCsrfToken } from "./src/utils/csrf.js"
import pino from "pino"
import pinoHttp from "pino-http"
import path from "path"
import { fileURLToPath } from "url"
import { createServer } from "http"

// Import cleanup function for deleted news
import cleanupDeletedNews from "./src/utils/cleanupDeletedNews.js"

// Validate environment variables
import { logEnvironmentValidation, validateEnvironment } from "./src/utils/envValidation.js"

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Express
const app = express()
const PORT = process.env.PORT || 8080

// Create HTTP server
const httpServer = createServer(app)

// Trust proxy - Required when behind a reverse proxy (Railway, Heroku, etc.)
// This allows Express to correctly identify client IPs from X-Forwarded-For headers
// IMPORTANT: We trust only the first proxy (1) to prevent rate limiting bypass
// Most production environments (Railway, Heroku, etc.) have a single reverse proxy
if (process.env.TRUST_PROXY !== 'false') {
  // In production or when explicitly enabled, trust first proxy only (more secure)
  if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
    // Trust only the first proxy to prevent rate limiting bypass
    // Set to number of proxies if you have multiple (e.g., Cloudflare + Railway = 2)
    const proxyCount = Number(process.env.TRUST_PROXY_COUNT) || 1;
    app.set('trust proxy', proxyCount);
  } else {
    // In development, trust first proxy (useful for local reverse proxies)
    app.set('trust proxy', 1);
  }
}

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

// Global body parser (applies to all routes except submissions which has its own)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

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

// Pusher test endpoint (for debugging - development only)
app.get("/api/pusher/test", async (req, res) => {
  // Security: Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({
      success: false,
      message: "Not found"
    });
  }

  try {
    const { getPusher, publishNotification } = await import("./src/utils/pusher.js");
    const pusher = getPusher();
    
    if (!pusher) {
      return res.status(503).json({
        success: false,
        message: "Pusher not configured",
        configured: false
      });
    }

    // Try to publish a test notification
    const testChannel = 'test-channel';
    const testData = { message: 'Test notification', timestamp: new Date().toISOString() };
    
    const publishResult = await publishNotification(testChannel, 'test-event', testData);
    const published = publishResult.success;
    const publishError = publishResult.error || null;

    res.json({
      success: published,
      message: published ? "Pusher is configured and working" : "Pusher initialized but publish failed",
      pusher: {
        initialized: !!pusher,
        testPublish: published ? 'success' : 'failed',
        error: publishError
      }
    });
  } catch (error) {
    // Log full error details server-side for debugging
    console.error('Pusher test endpoint error:', {
      message: error.message,
      stack: error.stack
    });
    
    // Return sanitized error response without stack trace
    res.status(500).json({
      success: false,
      message: "Pusher test failed",
      error: error.message
    });
  }
})


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
app.use("/api/highlights", publicLimiter) // Apply public limiter to highlights
app.use("/api", organizationsRoutes)
app.use("/api/subscription", subscriptionRoutes)
app.use("/api", applyRoutes)
app.use("/api", messagesRoutes)

// Direct public route for highlights (no authentication required)
app.get("/api/highlights/public/approved", async (req, res) => {
  try {
    const { getApprovedHighlights } = await import("./src/admin/controllers/highlightsController.js");
    await getApprovedHighlights(req, res);
  } catch (error) {
    logger.error('Error in public highlights route', error, { context: 'public_highlights' });
    res.status(500).json({ error: 'Failed to fetch highlights' });
  }
});

// Public route for featured highlights (no authentication required)
app.get("/api/highlights/public/featured", async (req, res) => {
  try {
    const { getFeaturedHighlights } = await import("./src/admin/controllers/highlightsController.js");
    await getFeaturedHighlights(req, res);
  } catch (error) {
    logger.error('Error in public featured highlights route', error, { context: 'public_featured_highlights' });
    res.status(500).json({ error: 'Failed to fetch featured highlights' });
  }
});
app.use(["/api/users/login", "/api/users/forgot-password", "/api/users/reset-password", "/api/users/verify-email"], authSpeedLimiter, authLimiter)
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
import highlightsRoutes from "./src/admin/routes/highlights.js";


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
app.use("/api/admin/highlights", highlightsRoutes);

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

// Add rate limits around admin/superadmin auth endpoints
app.use(["/api/admins/login", "/api/admins/forgot-password", "/api/admins/reset-password"], authSpeedLimiter, authLimiter)
app.use("/api/admins", adminsRoutes)
app.use("/api/approvals", approvalRoutes)
app.use("/api/faqs", faqRoutes)
app.use("/api/mission-vision", missionVisionRoutes)
app.use("/api/superadmin/footer", footerRoutes)
app.use("/api/subscriptions", subscriptionsRoutes)
app.use("/api/projects/superadmin", superadminProgramsRoutes)
app.use(["/api/superadmin/auth/login", "/api/superadmin/auth/forgot-password", "/api/superadmin/auth/reset-password"], authSpeedLimiter, authLimiter)
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
// Body parser error handler - catches errors from express.json() and express.urlencoded() middleware
// MUST be placed after all routes to properly catch parsing errors
app.use((err, req, res, next) => {
  // Check for JSON parsing errors - body-parser may create errors with type 'entity.parse.failed'
  // that are not instances of SyntaxError, so we check both conditions
  // Note: We don't check for 'body' property as body-parser errors may not always have it
  if ((err instanceof SyntaxError || err.type === 'entity.parse.failed') && err.status === 400) {
    // JSON parsing error
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: 'Malformed JSON',
      errorType: 'JSON_PARSE_ERROR'
    });
  }
  if (err.type === 'entity.too.large') {
    // Payload too large error
    return res.status(413).json({
      success: false,
      message: 'Request payload too large',
      error: 'Payload exceeds the maximum allowed size',
      errorType: 'PAYLOAD_TOO_LARGE',
      maxSizeMB: err.limit ? (parseInt(err.limit) / (1024 * 1024)).toFixed(0) : '10'
    });
  }
  next(err);
});

// General server error handler
app.use((err, req, res, next) => {
  logger.error("Server error", err, {
    path: req.path,
    method: req.method,
    ip: req.ip
  })
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
// Store interval references for cleanup (important for graceful shutdown)
let cleanupInterval = null;
let scheduledNewsInterval = null;
let initialCleanupTimeout = null;
let initialScheduledNewsTimeout = null;
let sessionCleanupInterval = null;
let initialSessionCleanupTimeout = null;

httpServer.listen(PORT, async () => {
  if (process.env.NODE_ENV === "development") {
    console.log(`Server running at http://localhost:${PORT}`)
  }

  // Validate environment variables (strict in production)
  try {
    if (process.env.NODE_ENV === "production") {
      validateEnvironment(true); // Fail if required vars are missing in production
    } else {
      logEnvironmentValidation(); // Warn in development
    }
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }

  // Initialize database first
  try {
    const db = await import("./src/database.js");
    const { getDatabase, isDatabaseReady, getInitializationError } = db;
    
    // Wait for database initialization to complete
    if (!isDatabaseReady()) {
      console.log('Waiting for database initialization...');
      try {
        await getDatabase();
        console.log('✅ Database initialized successfully');
      } catch (dbError) {
        console.error('❌ Database initialization failed:', dbError.message);
        if (process.env.NODE_ENV === "production") {
          console.error('\nPlease check:');
          console.error('1. MySQL service is running in Railway');
          console.error('2. Environment variables are set correctly');
          console.error('3. MYSQL_SSL=true is set for Railway MySQL');
          process.exit(1);
        } else {
          console.warn('⚠️  Database not ready. Some features may not work.');
        }
      }
    } else {
      console.log('✅ Database initialized successfully');
    }
  } catch (error) {
    console.error('❌ Failed to import database module:', error);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }

  // Test Pusher initialization on server start
  try {
    const { getPusher } = await import("./src/utils/pusher.js");
    const pusher = getPusher();
    if (!pusher) {
      console.warn('⚠️  Pusher is not configured. Real-time notifications will be disabled.');
    }
  } catch (error) {
    console.error('❌ Failed to check Pusher initialization:', error.message);
  }

  // Verify email configuration (SMTP or SendGrid API)
  try {
    const useSendGridAPI = process.env.USE_SENDGRID_API === 'true';
    const apiKey = process.env.SMTP_PASS?.trim() || process.env.SENDGRID_API_KEY?.trim();
    
    if (useSendGridAPI) {
      // SendGrid API mode
      if (!apiKey) {
        console.warn('⚠️  SendGrid API not configured. Missing: SMTP_PASS or SENDGRID_API_KEY');
        console.warn('   → Email features will not work until SendGrid API key is configured');
      } else {
        console.log('✅ SendGrid API configured - email features are ready');
        console.log(`   → Using SendGrid SDK (HTTPS) instead of SMTP`);
        if (!process.env.MAIL_FROM) {
          console.warn('   → MAIL_FROM not set, will use default: faithcommunityfaces@gmail.com');
        }
      }
    } else {
      // SMTP mode
      const { verifySMTPConnection, getSMTPStatus } = await import("./src/utils/mailer.js");
      const status = getSMTPStatus();
      
      if (!status.configured) {
        const missingList = status.missing.length > 0 
          ? status.missing.join(', ') 
          : 'SMTP_HOST, SMTP_USER, SMTP_PASS';
        console.warn(`⚠️  SMTP not configured. Missing: ${missingList}. Email features will not work.`);
        console.warn('   → Tip: If SMTP is blocked, use SendGrid API: Set USE_SENDGRID_API=true');
      } else {
        // Check for common configuration issues
        const smtpHost = process.env.SMTP_HOST?.trim() || '';
        const smtpPort = Number(process.env.SMTP_PORT) || 587;
        
        if (smtpHost.includes('sendgrid') && smtpPort === 465) {
          console.warn('⚠️  SendGrid Configuration Warning:');
          console.warn('   → SendGrid recommends port 587 (STARTTLS), not port 465');
          console.warn('   → Port 465 may be blocked in deployment environments');
          console.warn('   → Consider changing to: SMTP_PORT=587');
          console.warn('   → Or use SendGrid API: Set USE_SENDGRID_API=true');
        }
        
        if (process.env.SMTP_SKIP_VERIFY === 'true') {
          console.warn('⚠️  SMTP verification skipped (SMTP_SKIP_VERIFY=true). Email features may not work if SMTP is misconfigured.');
        } else {
          // Run verification in background, don't block startup
          // Note: Verification failure is not critical - server will continue running
          verifySMTPConnection().then(success => {
            if (success) {
              console.log('✅ SMTP verification successful - email features are ready');
            } else {
              console.warn('⚠️  SMTP verification failed - server is running but email features may not work');
              console.warn('   → To skip verification: Set SMTP_SKIP_VERIFY=true in .env');
              console.warn('   → Alternative: Use SendGrid API: Set USE_SENDGRID_API=true');
            }
          }).catch(() => {
            // Error already logged in verifySMTPConnection
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to check email configuration:', error.message);
  }
 
  // IMPORTANT: For serverless environments (Vercel, AWS Lambda, etc.):
  // setInterval and setTimeout may not work reliably as functions can be frozen/restarted.
  // For production, use external cron jobs or platform-specific scheduled functions.
  // Only run scheduled tasks in traditional server environments (not serverless)
  
  // Only set up scheduled cleanup if NOT in serverless environment
  // Check if we're in a serverless environment (Vercel sets VERCEL env var)
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_NAME;
  
  if (!isServerless) {
    // Set up daily cleanup job for deleted news (runs every 24 hours)
    // Store interval reference for potential cleanup on graceful shutdown
    cleanupInterval = setInterval(async () => {
      try {
        await cleanupDeletedNews();
      } catch (error) {
        console.error('Error in scheduled cleanup:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    
    // Run initial cleanup on server start (with delay to ensure DB is ready)
    initialCleanupTimeout = setTimeout(async () => {
      try {
        await cleanupDeletedNews();
      } catch (error) {
        console.error('Initial cleanup failed:', error);
      }
      initialCleanupTimeout = null;
    }, 2000); // 2 second delay to ensure database is fully initialized
    
    // Set up scheduled news auto-publish job (runs every 1 minute for more responsive publishing)
    // This automatically publishes scheduled news when their publish date/time arrives
    // Import dynamically to avoid potential circular dependency issues
    scheduledNewsInterval = setInterval(async () => {
      try {
        const { autoUpdateScheduledNews } = await import("./src/admin/controllers/newsController.js");
        const result = await autoUpdateScheduledNews();
        if (result.success && result.updatedCount > 0) {
          console.log(`✅ Auto-published ${result.updatedCount} scheduled news item(s)`);
        }
      } catch (error) {
        console.error('Error auto-publishing scheduled news:', error);
      }
    }, 60 * 1000); // 1 minute in milliseconds (changed from 5 minutes for more responsive publishing)
    
    // Run initial scheduled news check on server start (with delay to ensure DB is ready)
    initialScheduledNewsTimeout = setTimeout(async () => {
      try {
        const { autoUpdateScheduledNews } = await import("./src/admin/controllers/newsController.js");
        const result = await autoUpdateScheduledNews();
        if (result.success && result.updatedCount > 0) {
          console.log(`✅ Auto-published ${result.updatedCount} scheduled news item(s) on startup`);
        }
      } catch (error) {
        console.error('Initial scheduled news check failed:', error);
      }
      initialScheduledNewsTimeout = null;
    }, 3000); // 3 second delay to ensure database is fully initialized
    
    // Session cleanup job (runs every hour)
    sessionCleanupInterval = setInterval(async () => {
      try {
        const { SessionSecurity } = await import("./src/utils/sessionSecurity.js");
        await SessionSecurity.cleanExpiredSessions();
        
        // Also cleanup expired/revoked refresh tokens
        const db = await import("./src/database.js");
        await db.default.query(
          'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL'
        );
        
        console.log('✅ Session cleanup completed');
      } catch (error) {
        console.error('Error in session cleanup:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
    
    // Run initial session cleanup on startup (with delay to ensure DB is ready)
    initialSessionCleanupTimeout = setTimeout(async () => {
      try {
        const { SessionSecurity } = await import("./src/utils/sessionSecurity.js");
        await SessionSecurity.cleanExpiredSessions();
        const db = await import("./src/database.js");
        await db.default.query(
          'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL'
        );
        console.log('✅ Initial session cleanup completed');
      } catch (error) {
        console.error('Initial session cleanup failed:', error);
      }
    }, 30000); // 30 seconds after startup
  } else {
    // In serverless environments, cleanup should be triggered via:
    // - API endpoint (e.g., /api/admin/cleanup)
    // - External cron service (e.g., Vercel Cron Jobs, AWS EventBridge)
    // - Platform-specific scheduled functions
  }
})

// Graceful shutdown handler
// Clean up intervals, timeouts, and HTTP server on server shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Clear cleanup interval
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  
  // Clear scheduled news interval
  if (scheduledNewsInterval) {
    clearInterval(scheduledNewsInterval);
    scheduledNewsInterval = null;
  }
  
  // Clear initial cleanup timeout
  if (initialCleanupTimeout) {
    clearTimeout(initialCleanupTimeout);
    initialCleanupTimeout = null;
  }
  
  // Clear initial scheduled news timeout
  if (initialScheduledNewsTimeout) {
    clearTimeout(initialScheduledNewsTimeout);
    initialScheduledNewsTimeout = null;
  }
  
  // Clear session cleanup interval
  if (sessionCleanupInterval) {
    clearInterval(sessionCleanupInterval);
    sessionCleanupInterval = null;
  }
  
  // Clear initial session cleanup timeout
  if (initialSessionCleanupTimeout) {
    clearTimeout(initialSessionCleanupTimeout);
    initialSessionCleanupTimeout = null;
  }
  
  // Store forced shutdown timeout so we can clear it on successful shutdown
  const forcedShutdownTimeout = setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
  
  // Helper function to close HTTP server
  const closeHttpServer = () => {
    // Clear the forced shutdown timeout before exiting successfully
    // This prevents race condition where timeout could fire after process.exit(0)
    clearTimeout(forcedShutdownTimeout);
    
    // Close HTTP server (stop accepting new connections)
    // Existing connections will be allowed to finish
    httpServer.close(() => {
      console.log('HTTP server closed.');
      console.log('Graceful shutdown completed.');
      process.exit(0);
    });
  };
  
  // Close HTTP server
  closeHttpServer();
};

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
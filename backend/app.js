import 'dotenv/config';
console.log("SMTP host:", process.env.SMTP_HOST);
console.log("SMTP user (masked):", (process.env.SMTP_USER||"").slice(0,4) + "***");

import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
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

// Import upload configuration to ensure proper directory structure
import "./back_end/utils/uploadConfig.js"

// Ensure uploads directory exists (this is now handled by uploadConfig.js)
const uploadsDir = path.join(__dirname, "uploads")

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    credentials: true,
  }),
)
app.use(bodyParser.json({ limit: "10mb" }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use("/uploads", express.static(uploadsDir))

// Debug logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

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

// Debug route to check table names
app.get("/api/debug/tables", async (req, res) => {
  try {
    const db = await import("./back_end/database.js")
    const [tables] = await db.default.execute("SHOW TABLES")
    res.json({ success: true, tables: tables })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Public Routes
import applyRoutes from "./back_end/for_public/routes/apply.js"
import organizationsRoutes from "./back_end/for_public/routes/organizations.js"
import messagesRoutes from "./back_end/for_public/routes/messages.js"

app.use("/api", applyRoutes)
app.use("/api", organizationsRoutes)
app.use("/api", messagesRoutes)

// ADMIN ROUTES
import advocaciesRoutes from "./back_end/admin/routes/advocacies.js"
import competenciesRoutes from "./back_end/admin/routes/competencies.js"
import headsRoutes from "./back_end/admin/routes/heads.js"
import organizationRoutes from "./back_end/admin/routes/organization.js"
import programProjectRoutes from "./back_end/admin/routes/programProjects.js"
import projectRoutes from "./back_end/admin/routes/project.js"
import programsRoutes from "./back_end/admin/routes/programsRoutes.js"
import submissionRoutes from "./back_end/admin/routes/submission.js"
import uploadRoutes from "./back_end/admin/routes/upload.js"
import volunteersRoutes from "./back_end/admin/routes/volunteers.js"
import orgSyncRoutes from "./back_end/admin/routes/orgSync.js"
import newsRoutes from "./back_end/admin/routes/newsRoutes.js"
import notificationsRoutes from "./back_end/admin/routes/notifications.js"
import inboxRoutes from "./back_end/admin/routes/inbox.js"
import subscribersRoutes from "./back_end/admin/routes/subscribers.js";

app.use("/api/advocacies", advocaciesRoutes)
app.use("/api/competencies", competenciesRoutes)
app.use("/api/heads", headsRoutes)
app.use("/api/organization", organizationRoutes)
app.use("/api/projects", programProjectRoutes)
app.use("/api/admin/project", projectRoutes)
app.use("/api", programsRoutes)
app.use("/api/submissions", submissionRoutes)
app.use("/api/upload", uploadRoutes)
app.use("/api/volunteers", volunteersRoutes)
app.use("/api", orgSyncRoutes)
app.use("/api/news", newsRoutes)
app.use("/api/notifications", notificationsRoutes)
app.use("/api/inbox", inboxRoutes)
app.use("/api/subscribers", subscribersRoutes);

// PUBLIC ROUTES
import publicOrganizationsRoutes from "./back_end/for_public/routes/organizations.js"

app.use("/api", publicOrganizationsRoutes)

// SUPERADMIN ROUTES
import adminsRoutes from "./back_end/superadmin/routes/admins.js"
import approvalRoutes from "./back_end/superadmin/routes/approvalRoutes.js"
import faqRoutes from "./back_end/superadmin/routes/faqs.js"
import missionVisionRoutes from "./back_end/superadmin/routes/missionVision.js"
import footerRoutes from "./back_end/superadmin/routes/footer.js"
import subscriptionsRoutes from "./back_end/superadmin/routes/subscriptions.js"
import superadminProgramsRoutes from "./back_end/superadmin/routes/programsRoutes.js"
import featuredProjectsRoutes from "./back_end/superadmin/routes/featuredProjectsRoutes.js"

app.use("/api/admins", adminsRoutes)
app.use("/api/approvals", approvalRoutes)
app.use("/api/faqs", faqRoutes)
app.use("/api/mission-vision", missionVisionRoutes)
app.use("/api/footer", footerRoutes)
app.use("/api/subscriptions", subscriptionsRoutes)
app.use("/api/projects/superadmin", superadminProgramsRoutes)
app.use("/api/superadmin/featured-projects", featuredProjectsRoutes)

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
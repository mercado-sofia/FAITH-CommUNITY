import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import path from "path"
import { fileURLToPath } from "url"
import fs from 'fs'

// Get current directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Public route
import applyRoutes from "./back_end/for_public/routes/apply.js"

// Admin routes
import activitiesRoutes from "./back_end/admin/routes/activities.js"
import adminsRoutes from "./back_end/admin/routes/admins.js"
import advocaciesRoutes from "./back_end/admin/routes/advocacies.js"
import competenciesRoutes from "./back_end/admin/routes/competencies.js"
import eventsRoutes from "./back_end/admin/routes/events.js"
import headsRoutes from "./back_end/admin/routes/heads.js"
import organizationRoutes from "./back_end/admin/routes/organization.js"
import programProjectRoutes from "./back_end/admin/routes/programProjects.js"
import volunteersRoutes from "./back_end/admin/routes/volunteers.js"
import approvalRoutes from "./back_end/admin/routes/approvalRoutes.js"
import submissionRoutes from "./back_end/admin/routes/submission.js"
import uploadRoutes from "./back_end/admin/routes/upload.js"
import projectRoutes from "./back_end/admin/routes/project.js"

const app = express()
const PORT = 8080

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: true }))

// Debug middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// Serve uploaded files from the uploads directory
app.use('/uploads', express.static(uploadsDir))

// Add test route directly to app for debugging
app.get("/api/test", (req, res) => {
  console.log("Test GET endpoint hit")
  res.json({ success: true, message: "API is running" })
})

// Public route
app.use("/apply", applyRoutes)

// Admin routes under /api
app.use("/api/activities", activitiesRoutes)
app.use("/api/admins", adminsRoutes)
app.use("/api/advocacies", advocaciesRoutes)
app.use("/api/competencies", competenciesRoutes)
app.use("/api/events", eventsRoutes)
app.use("/api/heads", headsRoutes)
app.use("/api/organization", organizationRoutes)
app.use("/api/projects", programProjectRoutes)
app.use("/api/volunteers", volunteersRoutes)
app.use("/api/approvals", approvalRoutes)
app.use("/api/submissions", submissionRoutes)
app.use("/api/upload", uploadRoutes)
app.use("/api/admin/project", projectRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err)
  res.status(500).json({
    error: "Server error",
    message: err.message,
  })
})

// 404 handler - must be after all other routes
app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url} not found`)
  res.status(404).json({ 
    error: 'Route not found',
    path: req.url,
    method: req.method
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
  // console.log('Available routes:')
  // console.log('- GET /api/test')
  // console.log('- GET /api/admin/project')
})

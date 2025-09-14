import db from "../../database.js"
import crypto from "crypto"
import bcrypt from "bcrypt"
import nodemailer from "nodemailer"

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })
}

// Generate secure invitation token
const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

// Send invitation email
const sendInvitationEmail = async (email, token) => {
  const transporter = createTransporter()
  const invitationLink = `${process.env.FRONTEND_URL}/admin/invitation/accept?token=${token}`
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Admin Invitation - FAITH-CommUNITY',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Admin Invitation</h2>
        <p>You have been invited to become an admin for FAITH-CommUNITY.</p>
        <p>Click the button below to accept the invitation and set up your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This invitation will expire in 7 days. If you didn't request this invitation, please ignore this email.
        </p>
        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${invitationLink}">${invitationLink}</a>
        </p>
      </div>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Email sending failed:', error)
    return false
  }
}

// Send invitation
export const sendInvitation = async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: "Email is required" })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" })
  }

  try {
    // Check if admin with this email already exists
    const [existingAdmin] = await db.execute("SELECT id FROM admins WHERE email = ?", [email])
    if (existingAdmin.length > 0) {
      return res.status(409).json({ error: "Admin with this email already exists" })
    }

    // Check if there's already a pending invitation for this email
    const [existingInvitation] = await db.execute(
      "SELECT id FROM admin_invitations WHERE email = ? AND status = 'pending' AND expires_at > NOW()",
      [email]
    )
    if (existingInvitation.length > 0) {
      return res.status(409).json({ error: "A pending invitation already exists for this email" })
    }

    // Generate token and expiration (7 days from now)
    const token = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation record
    await db.execute(
      "INSERT INTO admin_invitations (email, token, expires_at) VALUES (?, ?, ?)",
      [email, token, expiresAt]
    )

    // Send invitation email
    const emailSent = await sendInvitationEmail(email, token)
    if (!emailSent) {
      // If email fails, delete the invitation record
      await db.execute("DELETE FROM admin_invitations WHERE token = ?", [token])
      return res.status(500).json({ error: "Failed to send invitation email" })
    }

    res.status(201).json({
      message: "Invitation sent successfully",
      email: email
    })
  } catch (err) {
    console.error("Send invitation error:", err)
    res.status(500).json({ error: "Internal server error while sending invitation" })
  }
}

// Validate invitation token
export const validateInvitationToken = async (req, res) => {
  const { token } = req.params

  try {
    const [invitations] = await db.execute(
      "SELECT * FROM admin_invitations WHERE token = ? AND status = 'pending' AND expires_at > NOW()",
      [token]
    )

    if (invitations.length === 0) {
      return res.status(404).json({ error: "Invalid or expired invitation token" })
    }

    res.json({
      valid: true,
      email: invitations[0].email
    })
  } catch (err) {
    console.error("Validate invitation token error:", err)
    res.status(500).json({ error: "Internal server error while validating token" })
  }
}

// Accept invitation and create admin account
export const acceptInvitation = async (req, res) => {
  const { token, org, orgName, logo, password } = req.body

  if (!token || !org || !orgName || !password) {
    return res.status(400).json({ error: "All fields are required" })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" })
  }

  const connection = await db.getConnection()
  
  try {
    await connection.beginTransaction()

    // Validate invitation token
    const [invitations] = await connection.execute(
      "SELECT * FROM admin_invitations WHERE token = ? AND status = 'pending' AND expires_at > NOW()",
      [token]
    )

    if (invitations.length === 0) {
      await connection.rollback()
      return res.status(404).json({ error: "Invalid or expired invitation token" })
    }

    const invitation = invitations[0]

    // Check if admin with this email already exists
    const [existingAdmin] = await connection.execute("SELECT id FROM admins WHERE email = ?", [invitation.email])
    if (existingAdmin.length > 0) {
      await connection.rollback()
      return res.status(409).json({ error: "Admin with this email already exists" })
    }

    // Check if organization with this acronym already exists
    const [existingOrg] = await connection.execute("SELECT id FROM organizations WHERE org = ?", [org])
    if (existingOrg.length > 0) {
      await connection.rollback()
      return res.status(409).json({ error: "Organization with this acronym already exists" })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create organization record
    const [orgResult] = await connection.execute(
      `INSERT INTO organizations (org, orgName, logo, status, org_color) 
       VALUES (?, ?, ?, 'ACTIVE', '#444444')`,
      [org, orgName, logo || null]
    )

    const organizationId = orgResult.insertId

    // Create admin record
    const [adminResult] = await connection.execute(
      `INSERT INTO admins (email, password, role, status, organization_id, created_at) 
       VALUES (?, ?, 'admin', 'ACTIVE', ?, NOW())`,
      [invitation.email, hashedPassword, organizationId]
    )

    // Mark invitation as accepted
    await connection.execute(
      "UPDATE admin_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = ?",
      [invitation.id]
    )

    await connection.commit()

    res.status(201).json({
      message: "Admin account created successfully",
      admin: {
        id: adminResult.insertId,
        email: invitation.email,
        role: "admin",
        status: "ACTIVE",
        organization_id: organizationId
      }
    })
  } catch (err) {
    await connection.rollback()
    console.error("Accept invitation error:", err)
    res.status(500).json({ error: "Internal server error while accepting invitation" })
  } finally {
    connection.release()
  }
}

// Get all invitations (for superadmin management)
export const getAllInvitations = async (req, res) => {
  try {
    const [invitations] = await db.execute(
      `SELECT id, email, status, created_at, accepted_at, expires_at 
       FROM admin_invitations 
       ORDER BY created_at DESC`
    )
    res.json(invitations)
  } catch (err) {
    console.error("Get all invitations error:", err)
    res.status(500).json({ error: "Internal server error while fetching invitations" })
  }
}

// Cancel invitation
export const cancelInvitation = async (req, res) => {
  const { id } = req.params

  try {
    const [result] = await db.execute(
      "UPDATE admin_invitations SET status = 'expired' WHERE id = ? AND status = 'pending'",
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Invitation not found or already processed" })
    }

    res.json({ message: "Invitation cancelled successfully" })
  } catch (err) {
    console.error("Cancel invitation error:", err)
    res.status(500).json({ error: "Internal server error while cancelling invitation" })
  }
}

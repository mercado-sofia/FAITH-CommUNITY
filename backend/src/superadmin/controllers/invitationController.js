import db from "../../database.js"
import crypto from "crypto"
import * as bcrypt from "bcrypt"
import { sendMail } from "../../utils/mailer.js"
import { logSuperadminAction } from "../../utils/audit.js"

// Generate secure invitation token
const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

// Send invitation email
const sendInvitationEmail = async (email, token) => {
  try {
    if (!process.env.FRONTEND_URL) {
      console.error('FRONTEND_URL not configured')
      throw new Error('FRONTEND_URL not configured')
    }

    const invitationLink = `${process.env.FRONTEND_URL}/admin/invitation/accept?token=${token}`
  
    await sendMail({
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
      `,
      text: `You have been invited to become an admin for FAITH-CommUNITY. Click this link to accept: ${invitationLink}`
    })
    return { success: true }
  } catch (error) {
    console.error('Email sending failed:', error.message)
    if (error.code) {
      console.error(`   → Error code: ${error.code}`)
    }
    if (error.command) {
      console.error(`   → Failed command: ${error.command}`)
    }
    
    // Return detailed error information
    const isSendGrid = process.env.SMTP_HOST?.trim()?.includes('sendgrid')
    const isTimeoutError = error.code === 'ETIMEDOUT' || 
                          error.message.includes('timeout') || 
                          error.message.includes('ETIMEDOUT') ||
                          error.command === 'CONN'
    
    let errorMessage = 'Failed to send invitation email'
    
    if (isTimeoutError) {
      if (isSendGrid) {
        const currentPort = Number(process.env.SMTP_PORT) || 587
        const useAPI = process.env.USE_SENDGRID_API === 'true'
        
        if (useAPI) {
          errorMessage = 'Connection timeout: SendGrid REST API is enabled but still timing out. Please verify SMTP_PASS (your SendGrid API key) is correct.'
        } else {
          errorMessage = 'Connection timeout: Unable to connect to SendGrid SMTP server. '
          if (currentPort === 465) {
            errorMessage += 'CRITICAL: Port 465 is likely blocked. Please change SMTP_PORT to 587 in your deployment environment variables. '
          } else {
            errorMessage += 'Your deployment platform may be blocking outbound SMTP connections. '
          }
          errorMessage += 'SOLUTION: Set USE_SENDGRID_API=true to use SendGrid REST API instead (uses HTTPS, not blocked).'
        }
      } else {
        errorMessage = 'Connection timeout: Unable to connect to SMTP server. Please check your SMTP configuration and network settings.'
      }
    } else if (error.code === 'EAUTH' || error.message.includes('Invalid login') || error.message.includes('BadCredentials')) {
      if (isSendGrid) {
        errorMessage = 'Authentication failed: Please verify SMTP_USER=apikey and SMTP_PASS is your SendGrid API key (not password).'
      } else {
        errorMessage = 'Authentication failed: Please check your SMTP_USER and SMTP_PASS credentials.'
      }
    } else if (error.code === 'SMTP_NOT_CONFIGURED') {
      errorMessage = 'SMTP not configured: Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.'
    } else if (error.message) {
      errorMessage = `Email sending failed: ${error.message}`
    }
    
    return { success: false, error: errorMessage }
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
    // Check if email exists in users table
    const [existingUser] = await db.execute("SELECT id FROM users WHERE email = ?", [email])
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "This email is already registered as a user" })
    }

    // Check if email exists in superadmin table (username is used as email)
    const [existingSuperadmin] = await db.execute("SELECT id FROM superadmin WHERE username = ?", [email])
    if (existingSuperadmin.length > 0) {
      return res.status(409).json({ error: "This email is already registered as a superadmin" })
    }

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
    const emailResult = await sendInvitationEmail(email, token)
    if (!emailResult.success) {
      // If email fails, delete the invitation record
      await db.execute("DELETE FROM admin_invitations WHERE token = ?", [token])
      // Return detailed error message to help with troubleshooting
      return res.status(500).json({ 
        error: emailResult.error || "Failed to send invitation email",
        details: emailResult.error || "Please check your SMTP configuration"
      })
    }

    // Log superadmin action
    await logSuperadminAction(req.superadmin?.id, 'send_invitation', `Sent admin invitation to ${email}`, req)

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
    // First check if token exists at all
    const [allInvitations] = await db.execute(
      "SELECT * FROM admin_invitations WHERE token = ?",
      [token]
    )

    if (allInvitations.length === 0) {
      return res.status(404).json({ error: "Invalid invitation token" })
    }

    const invitation = allInvitations[0]

    // Check if admin with this email already exists (regardless of invitation status)
    const [existingAdmin] = await db.execute("SELECT id FROM admins WHERE email = ?", [invitation.email])
    if (existingAdmin.length > 0) {
      return res.status(410).json({ error: "Invitation has already been accepted" })
    }

    // Check if invitation has already been accepted
    if (invitation.status === 'accepted') {
      return res.status(410).json({ error: "Invitation has already been accepted" })
    }

    // Check if invitation is expired
    if (invitation.status === 'expired' || new Date() > new Date(invitation.expires_at)) {
      return res.status(404).json({ error: "Invitation has expired" })
    }

    // Check if invitation is still pending and valid
    if (invitation.status === 'pending' && new Date() <= new Date(invitation.expires_at)) {
      res.json({
        valid: true,
        email: invitation.email
      })
    } else {
      return res.status(404).json({ error: "Invalid invitation token" })
    }
  } catch (err) {
    console.error("Validate invitation token error:", err)
    res.status(500).json({ error: "Internal server error while validating token" })
  }
}

// Accept invitation and create admin account
export const acceptInvitation = async (req, res) => {
  const { token, org, orgName, logo, password } = req.body

  if (!token || !org || !orgName || !logo || !password) {
    return res.status(400).json({ error: "All fields are required including logo" })
  }

  // Validate password requirements (matching frontend)
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long" })
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return res.status(400).json({ error: "Password must contain at least one lowercase letter" })
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return res.status(400).json({ error: "Password must contain at least one uppercase letter" })
  }
  if (!/(?=.*\d)/.test(password)) {
    return res.status(400).json({ error: "Password must contain at least one number" })
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
      `INSERT INTO organizations (org, orgName, logo, status) 
       VALUES (?, ?, ?, 'ACTIVE')`,
      [org, orgName, logo]
    )

    const organizationId = orgResult.insertId

    // Create admin record
    const [adminResult] = await connection.execute(
      `INSERT INTO admins (email, password, is_active, organization_id, created_at) 
       VALUES (?, ?, TRUE, ?, NOW())`,
      [invitation.email, hashedPassword, organizationId]
    )

    // Mark invitation as accepted
    await connection.execute(
      "UPDATE admin_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = ?",
      [invitation.id]
    )

    await connection.commit()

    // Fetch the complete admin data with organization info
    const [adminWithOrg] = await connection.execute(
      `SELECT a.id, a.email, a.is_active, a.organization_id, o.org, o.orgName
       FROM admins a
       LEFT JOIN organizations o ON a.organization_id = o.id
       WHERE a.id = ?`,
      [adminResult.insertId]
    )

    // Create notification for superadmin about new admin account
    try {
      const [superadminRows] = await connection.execute("SELECT id FROM superadmin LIMIT 1")
      if (superadminRows.length > 0) {
        const superadminId = superadminRows[0].id
        const { SuperAdminNotificationController } = await import('../superadminNotificationController.js')
        
        await SuperAdminNotificationController.createNotification(
          superadminId,
          'system',
          'New Admin Account Created',
          `A new admin account has been created for ${orgName} (${org}) by ${invitation.email}`,
          'admin_management',
          null,
          organizationId  // Pass organization_id instead of acronym
        )
      }
    } catch (notificationError) {
      // Don't fail the main operation if notification fails
    }

    res.status(201).json({
      message: "Admin account created successfully",
      admin: {
        id: adminWithOrg[0].id,
        email: adminWithOrg[0].email,
        is_active: adminWithOrg[0].is_active,
        organization_id: adminWithOrg[0].organization_id,
        org: adminWithOrg[0].org,
        orgName: adminWithOrg[0].orgName
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
      `SELECT 
         ai.id, 
         ai.email, 
         ai.status, 
         ai.created_at, 
         ai.accepted_at, 
         ai.expires_at,
         a.id as admin_id,
         a.is_active as admin_is_active,
         o.org,
         o.orgName
       FROM admin_invitations ai
       LEFT JOIN admins a ON ai.email = a.email AND ai.status = 'accepted'
       LEFT JOIN organizations o ON a.organization_id = o.id
       ORDER BY ai.created_at DESC`
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

// Delete invitation and associated admin account (permanent deletion)
export const deleteInvitation = async (req, res) => {
  const { id } = req.params

  try {
    // First, get the invitation details to check if there's an associated admin
    const [invitationRows] = await db.execute(
      `SELECT ai.email, a.id as admin_id, a.is_active 
       FROM admin_invitations ai
       LEFT JOIN admins a ON ai.email = a.email
       WHERE ai.id = ?`,
      [id]
    )

    if (invitationRows.length === 0) {
      return res.status(404).json({ error: "Invitation not found" })
    }

    const invitation = invitationRows[0]
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // Delete from admin_invitations table
      await connection.execute(
        "DELETE FROM admin_invitations WHERE id = ?",
        [id]
      )

      // If there's an associated admin account, delete it too (regardless of active status)
      // This is admin management - when superadmin deletes from invites page, 
      // they're removing the admin account entirely
      if (invitation.admin_id) {
        // Get admin details to check organization
        const [adminDetails] = await connection.execute(
          "SELECT organization_id FROM admins WHERE id = ?",
          [invitation.admin_id]
        )

        if (adminDetails.length > 0) {
          const organizationId = adminDetails[0].organization_id

          // Delete the admin account
          await connection.execute(
            "DELETE FROM admins WHERE id = ?",
            [invitation.admin_id]
          )

          // Handle organization cleanup if needed
          if (organizationId) {
            // Check if there are other active admins for this organization
            const [otherAdmins] = await connection.execute(
              "SELECT COUNT(*) as count FROM admins WHERE organization_id = ? AND is_active = TRUE",
              [organizationId]
            )

            const hasOtherActiveAdmins = otherAdmins[0].count > 0

            if (!hasOtherActiveAdmins) {
              // No other active admins - set organization to INACTIVE
              await connection.execute(
                "UPDATE organizations SET status = 'INACTIVE' WHERE id = ?",
                [organizationId]
              )
            }
          }
        }
      }

      await connection.commit()

      const message = invitation.admin_id 
        ? "Admin account and invitation deleted successfully"
        : "Invitation deleted successfully"

      res.json({ message })
    } catch (transactionError) {
      await connection.rollback()
      throw transactionError
    } finally {
      connection.release()
    }
  } catch (err) {
    console.error("Delete invitation error:", err)
    res.status(500).json({ error: "Internal server error while deleting invitation" })
  }
}

// Deactivate admin associated with invitation
export const deactivateAdminFromInvitation = async (req, res) => {
  const { id } = req.params

  const connection = await db.getConnection()
  
  try {
    await connection.beginTransaction()

    // Get the invitation and associated admin details
    const [invitationRows] = await connection.execute(
      `SELECT ai.email, a.id as admin_id, a.is_active, a.organization_id 
       FROM admin_invitations ai
       LEFT JOIN admins a ON ai.email = a.email
       WHERE ai.id = ?`,
      [id]
    )

    if (invitationRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({ error: "Invitation not found" })
    }

    const invitation = invitationRows[0]

    if (!invitation.admin_id) {
      await connection.rollback()
      return res.status(404).json({ error: "No admin account found for this invitation" })
    }

    // Deactivate the admin account
    await connection.execute(
      "UPDATE admins SET is_active = FALSE WHERE id = ?",
      [invitation.admin_id]
    )

    // Also deactivate their organization
    if (invitation.organization_id) {
      await connection.execute(
        "UPDATE organizations SET status = 'INACTIVE' WHERE id = ?",
        [invitation.organization_id]
      )
    }

    await connection.commit()

    res.json({ 
      message: "Admin account deactivated successfully",
      is_active: false,
      organization_updated: invitation.organization_id ? true : false
    })
  } catch (err) {
    await connection.rollback()
    console.error("Deactivate admin from invitation error:", err)
    res.status(500).json({ error: "Internal server error while deactivating admin" })
  } finally {
    connection.release()
  }
}
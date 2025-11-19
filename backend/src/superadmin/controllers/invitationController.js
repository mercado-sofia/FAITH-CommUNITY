import db from "../../database.js"
import crypto from "crypto"
import * as bcrypt from "bcrypt"
import { sendMail } from "../../utils/mailer.js"
import { logSuperadminAction } from "../../utils/audit.js"
import { getSiteName } from "../../utils/siteName.js"

const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

const sendInvitationEmail = async (email, token) => {
  try {
    if (!process.env.FRONTEND_URL) {
      console.error('FRONTEND_URL not configured')
      throw new Error('FRONTEND_URL not configured')
    }

    const invitationLink = `${process.env.FRONTEND_URL}/invitation/accept?token=${token}`
    const siteName = await getSiteName()
  
    await sendMail({
      to: email,
      subject: `Admin Invitation - ${siteName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
            <p style="color: #E8F5F3; margin: 10px 0 0 0;">Admin Invitation</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1A685B; margin-top: 0;">You've Been Invited!</h2>
            
            <p>You have been invited to become an admin for ${siteName}. Click the button below to accept the invitation and set up your account:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="display: inline-block; background: #1A685B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 13px; background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">${invitationLink}</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;"><strong>Important:</strong> This invitation will expire in 7 days. If you didn't request this invitation, please ignore this email.</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Best regards,<br><strong>${siteName} Team</strong>
            </p>
          </div>
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
    const [existingUserCheck] = await db.execute("SELECT id, role FROM users WHERE email = ?", [email])
    if (existingUserCheck.length > 0) {
      const role = existingUserCheck[0].role;
      if (role === 'superadmin') {
        return res.status(409).json({ error: "This email is already registered as a superadmin" })
      } else if (role === 'admin') {
        return res.status(409).json({ error: "Admin with this email already exists" })
      } else {
        return res.status(409).json({ error: "This email is already registered as a user" })
      }
    }

    const [existingInvitation] = await db.execute(
      "SELECT id FROM admin_invitations WHERE email = ? AND status = 'pending' AND expires_at > NOW()",
      [email]
    )
    if (existingInvitation.length > 0) {
      return res.status(409).json({ error: "A pending invitation already exists for this email" })
    }

    const token = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await db.execute(
      "INSERT INTO admin_invitations (email, token, expires_at) VALUES (?, ?, ?)",
      [email, token, expiresAt]
    )

    const emailResult = await sendInvitationEmail(email, token)
    if (!emailResult.success) {
      await db.execute("DELETE FROM admin_invitations WHERE token = ?", [token])
      return res.status(500).json({ 
        error: emailResult.error || "Failed to send invitation email",
        details: emailResult.error || "Please check your SMTP configuration"
      })
    }

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

export const validateInvitationToken = async (req, res) => {
  const { token } = req.params

  try {
    const [allInvitations] = await db.execute(
      "SELECT * FROM admin_invitations WHERE token = ?",
      [token]
    )

    if (allInvitations.length === 0) {
      return res.status(404).json({ error: "Invalid invitation token" })
    }

    const invitation = allInvitations[0]

    const [existingAdmin] = await db.execute("SELECT id FROM users WHERE email = ? AND role = 'admin'", [invitation.email])
    if (existingAdmin.length > 0) {
      return res.status(410).json({ error: "Invitation has already been accepted" })
    }

    if (invitation.status === 'accepted') {
      return res.status(410).json({ error: "Invitation has already been accepted" })
    }

    if (invitation.status === 'expired' || new Date() > new Date(invitation.expires_at)) {
      return res.status(404).json({ error: "Invitation has expired" })
    }

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

export const acceptInvitation = async (req, res) => {
  const { token, org, orgName, logo, password } = req.body

  if (!token || !org || !orgName || !logo || !password) {
    return res.status(400).json({ error: "All fields are required including logo" })
  }

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
    const [existingAdmin] = await connection.execute("SELECT id FROM users WHERE email = ? AND role = 'admin'", [invitation.email])
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

    // Create admin record in unified users table
    const [adminResult] = await connection.execute(
      `INSERT INTO users (email, password_hash, role, is_active, organization_id, created_at) 
       VALUES (?, ?, 'admin', TRUE, ?, NOW())`,
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
      `SELECT u.id, u.email, u.is_active, u.organization_id, o.org, o.orgName
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = ? AND u.role = 'admin'`,
      [adminResult.insertId]
    )

    // Create notification for superadmin about new admin account
    try {
      const [superadminRows] = await connection.execute("SELECT id FROM users WHERE role = 'superadmin' LIMIT 1")
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
         u.id as admin_id,
         u.is_active as admin_is_active,
         o.org,
         o.orgName
       FROM admin_invitations ai
       LEFT JOIN users u ON ai.email = u.email AND ai.status = 'accepted' AND u.role = 'admin'
       LEFT JOIN organizations o ON u.organization_id = o.id
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
      `SELECT ai.email, u.id as admin_id, u.is_active 
       FROM admin_invitations ai
       LEFT JOIN users u ON ai.email = u.email AND u.role = 'admin'
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
          "SELECT organization_id FROM users WHERE id = ? AND role = 'admin'",
          [invitation.admin_id]
        )

        if (adminDetails.length > 0) {
          const organizationId = adminDetails[0].organization_id

          // Delete the admin account
          await connection.execute(
            "DELETE FROM users WHERE id = ? AND role = 'admin'",
            [invitation.admin_id]
          )

          // Handle organization cleanup if needed
          if (organizationId) {
            // Check if there are other active admins for this organization
            const [otherAdmins] = await connection.execute(
              "SELECT COUNT(*) as count FROM users WHERE organization_id = ? AND role = 'admin' AND is_active = TRUE",
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

// Deactivate/Reactivate admin associated with invitation (toggles status)
export const deactivateAdminFromInvitation = async (req, res) => {
  const { id } = req.params

  const connection = await db.getConnection()
  
  try {
    await connection.beginTransaction()

    // Get the invitation and associated admin details
    const [invitationRows] = await connection.execute(
      `SELECT ai.email, u.id as admin_id, u.is_active, u.organization_id 
       FROM admin_invitations ai
       LEFT JOIN users u ON ai.email = u.email AND u.role = 'admin'
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

    // Get current status (handle both boolean and numeric 0/1 from MySQL)
    const currentStatus = invitation.is_active === true || invitation.is_active === 1
    const newStatus = !currentStatus
    const action = newStatus ? 'reactivated' : 'deactivated'

    // Toggle admin account status
    await connection.execute(
      "UPDATE users SET is_active = ? WHERE id = ? AND role = 'admin'",
      [newStatus, invitation.admin_id]
    )

    // If deactivating admin, also deactivate their organization
    if (!newStatus && invitation.organization_id) {
      await connection.execute(
        "UPDATE organizations SET status = 'INACTIVE' WHERE id = ?",
        [invitation.organization_id]
      )
    }
    // If reactivating admin, also reactivate their organization
    else if (newStatus && invitation.organization_id) {
      await connection.execute(
        "UPDATE organizations SET status = 'ACTIVE' WHERE id = ?",
        [invitation.organization_id]
      )
    }

    await connection.commit()

    res.json({ 
      message: `Admin account ${action} successfully`,
      is_active: newStatus,
      organization_updated: invitation.organization_id ? true : false
    })
  } catch (err) {
    await connection.rollback()
    console.error("Deactivate/Reactivate admin from invitation error:", err)
    res.status(500).json({ error: "Internal server error while updating admin status" })
  } finally {
    connection.release()
  }
}
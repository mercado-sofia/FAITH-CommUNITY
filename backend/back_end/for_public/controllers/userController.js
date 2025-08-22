import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import promisePool from '../../database.js';

// User registration
export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      contactNumber,
      gender,
      address,
      birthDate,
      password
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !contactNumber || !gender || !address || !birthDate || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Validate gender
    const validGenders = ['Male', 'Female', 'Other'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ error: 'Invalid gender value' });
    }

    // Check if user already exists
    const [existingUsers] = await promisePool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Convert birth date from MM/DD/YYYY to YYYY-MM-DD format for MySQL
    let formattedBirthDate = null;
    if (birthDate && birthDate.trim()) {
      const dateParts = birthDate.split('/');
      if (dateParts.length === 3) {
        const [month, day, year] = dateParts;
        // Validate date components
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        const yearNum = parseInt(year, 10);
        
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
          formattedBirthDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
          return res.status(400).json({ error: 'Invalid birth date' });
        }
      } else {
        return res.status(400).json({ error: 'Invalid birth date format' });
      }
    } else {
      return res.status(400).json({ error: 'Birth date is required' });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    console.log('Generated verification token:', verificationToken);
    console.log('Token length:', verificationToken.length);
    console.log('Token expires at:', verificationExpires);

    // Insert new user with verification token
    const [result] = await promisePool.query(
      `INSERT INTO users (
        first_name, last_name, email, contact_number, gender, 
        address, birth_date, password_hash, verification_token, 
        verification_token_expires, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [firstName, lastName, email, contactNumber, gender, address, formattedBirthDate, hashedPassword, verificationToken, verificationExpires]
    );

    console.log('User inserted with ID:', result.insertId);
    console.log('Stored verification token in database:', verificationToken);

    const userId = result.insertId;

    // Send verification email
    try {
      const { sendMail } = await import('../../utils/mailer.js');
      
      const verificationLink = `http://localhost:3000/signup?token=${verificationToken}`;
      
      await sendMail({
        to: email,
        subject: "Verify Your Email - FAITH CommUNITY",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1A685B;">Welcome to FAITH CommUNITY!</h2>
            <p>Hello ${firstName},</p>
            <p>Thank you for registering with FAITH CommUNITY. To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" style="display: inline-block; background: #1A685B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationLink}</p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with FAITH CommUNITY, please ignore this email.</p>
            <p>Best regards,<br>FAITH CommUNITY Team</p>
          </div>
        `,
        text: `Welcome to FAITH CommUNITY!\n\nHello ${firstName},\n\nThank you for registering with FAITH CommUNITY. To complete your registration, please verify your email address by visiting this link:\n\n${verificationLink}\n\nThis verification link will expire in 24 hours.\n\nIf you didn't create an account with FAITH CommUNITY, please ignore this email.\n\nBest regards,\nFAITH CommUNITY Team`
      });

      res.status(201).json({
        message: 'Registration successful! Please check your email to verify your account.',
        user: {
          id: userId,
          firstName,
          lastName,
          email,
          contactNumber,
          gender,
          address,
          birthDate
        },
        requiresVerification: true
      });

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // If email fails, still return success but inform user to contact support
      res.status(201).json({
        message: 'Registration successful! However, we could not send the verification email. Please contact support to verify your account.',
        user: {
          id: userId,
          firstName,
          lastName,
          email,
          contactNumber,
          gender,
          address,
          birthDate
        },
        requiresVerification: true,
        emailError: true
      });
    }

  } catch (error) {
    console.error('User registration error:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// User login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({ 
        error: 'Please verify your email address before logging in. Check your email for a verification link.',
        requiresVerification: true 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'user' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Update last login
    await promisePool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        contactNumber: user.contact_number,
        gender: user.gender,
        address: user.address,
        birthDate: user.birth_date,
        profilePhoto: user.profile_photo_url,
        occupation: user.occupation,
        citizenship: user.citizenship,
        newsletterSubscribed: Boolean(user.newsletter_subscribed)
      }
    });

  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    res.json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        contactNumber: user.contact_number,
        gender: user.gender,
        address: user.address,
        birthDate: user.birth_date,
        profilePhoto: user.profile_photo_url,
        occupation: user.occupation,
        citizenship: user.citizenship,
        newsletterSubscribed: Boolean(user.newsletter_subscribed),
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      contactNumber,
      gender,
      address,
      birthDate,
      occupation,
      citizenship
    } = req.body;

    // Update user profile
    await promisePool.query(
      `UPDATE users SET 
        first_name = ?, last_name = ?, contact_number = ?, 
        gender = ?, address = ?, birth_date = ?, 
        occupation = ?, citizenship = ?, updated_at = NOW()
      WHERE id = ?`,
      [firstName, lastName, contactNumber, gender, address, birthDate, occupation, citizenship, userId]
    );

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Move file from temp directory to user-profile directory
    const fs = await import('fs');
    const path = await import('path');
    
    const tempFilePath = req.file.path;
    const fileName = req.file.filename;
    const userProfileDir = path.join(process.cwd(), 'uploads', 'user-profile');
    
    // Ensure user-profile directory exists
    if (!fs.existsSync(userProfileDir)) {
      fs.mkdirSync(userProfileDir, { recursive: true });
    }
    
    const targetPath = path.join(userProfileDir, fileName);
    
    // Move file to user-profile directory
    fs.renameSync(tempFilePath, targetPath);
    
    // Generate the URL for the uploaded file
    const profilePhotoUrl = `/uploads/user-profile/${fileName}`;
    
    // Update user's profile_photo_url in database
    await promisePool.query(
      'UPDATE users SET profile_photo_url = ?, updated_at = NOW() WHERE id = ?',
      [profilePhotoUrl, userId]
    );
    
    // Get updated user data
    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    res.json({
      message: 'Profile photo uploaded successfully',
      profilePhotoUrl: profilePhotoUrl,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        contactNumber: user.contact_number,
        gender: user.gender,
        address: user.address,
        birthDate: user.birth_date,
        occupation: user.occupation,
        citizenship: user.citizenship,
        profile_photo_url: user.profile_photo_url
      }
    });

  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const [users] = await promisePool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await promisePool.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Subscribe to newsletter (for logged-in users)
export const subscribeToNewsletter = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user details
    const [users] = await promisePool.query(
      'SELECT email, newsletter_subscribed FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (user.newsletter_subscribed) {
      return res.status(400).json({ error: 'You are already subscribed to the newsletter' });
    }

    // Update user's newsletter subscription status
    await promisePool.query(
      'UPDATE users SET newsletter_subscribed = 1, updated_at = NOW() WHERE id = ?',
      [userId]
    );

    // Also add to subscribers table for consistency
    const verifyToken = crypto.randomBytes(24).toString("hex");
    const unsubscribeToken = crypto.randomBytes(24).toString("hex");

    await promisePool.query(
      `INSERT INTO subscribers (email, verify_token, unsubscribe_token, is_verified)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE 
         verify_token = VALUES(verify_token),
         unsubscribe_token = VALUES(unsubscribe_token),
         is_verified = 1`,
      [user.email, verifyToken, unsubscribeToken]
    );

    res.json({ 
      message: 'Successfully subscribed to newsletter!',
      subscribed: true 
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unsubscribe from newsletter (for logged-in users)
export const unsubscribeFromNewsletter = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user details
    const [users] = await promisePool.query(
      'SELECT email, newsletter_subscribed FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (!user.newsletter_subscribed) {
      return res.status(400).json({ error: 'You are not subscribed to the newsletter' });
    }

    // Update user's newsletter subscription status
    await promisePool.query(
      'UPDATE users SET newsletter_subscribed = 0, updated_at = NOW() WHERE id = ?',
      [userId]
    );

    // Also remove from subscribers table for consistency
    await promisePool.query(
      'DELETE FROM subscribers WHERE email = ?',
      [user.email]
    );

    res.json({ 
      message: 'Successfully unsubscribed from newsletter',
      subscribed: false 
    });

  } catch (error) {
    console.error('Newsletter unsubscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get newsletter subscription status
export const getNewsletterStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await promisePool.query(
      'SELECT newsletter_subscribed FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      subscribed: Boolean(users[0].newsletter_subscribed)
    });

  } catch (error) {
    console.error('Get newsletter status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// User logout
export const logoutUser = async (req, res) => {
  try {
    // In a stateless JWT system, logout is typically handled client-side
    // by removing the token from storage. However, we can log the logout
    // and update the last_login timestamp if needed.
    
    const userId = req.user?.id;
    if (userId) {
      // Update last login timestamp (optional)
      await promisePool.query(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [userId]
      );
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('User logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify email address
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    console.log('Verification attempt with token:', token);

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with this verification token
    const [users] = await promisePool.query(
      'SELECT id, email, verification_token, verification_token_expires FROM users WHERE verification_token = ?',
      [token]
    );

    console.log('Found users with token:', users.length);

    if (users.length === 0) {
      // Let's also check if there are any users with verification tokens at all
      const [allUsersWithTokens] = await promisePool.query(
        'SELECT id, email, verification_token FROM users WHERE verification_token IS NOT NULL'
      );
      console.log('All users with verification tokens:', allUsersWithTokens);
      
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const user = users[0];

    // Check if token has expired
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
    }

    // Update user to verified and clear verification token
    await promisePool.query(
      'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL, updated_at = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({ 
      message: 'Email verified successfully! You can now log in to your account.',
      verified: true 
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Resend verification email
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const [users] = await promisePool.query(
      'SELECT id, first_name, email, email_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Update user with new verification token
    await promisePool.query(
      'UPDATE users SET verification_token = ?, verification_token_expires = ?, updated_at = NOW() WHERE id = ?',
      [verificationToken, verificationExpires, user.id]
    );

    // Send verification email
    try {
      const { sendMail } = await import('../../utils/mailer.js');
      
      const verificationLink = `http://localhost:3000/signup?token=${verificationToken}`;
      
      await sendMail({
        to: email,
        subject: "Verify Your Email - FAITH CommUNITY",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1A685B;">Verify Your Email - FAITH CommUNITY</h2>
            <p>Hello ${user.first_name},</p>
            <p>You requested a new verification email. Please verify your email address by clicking the button below:</p>
            <a href="${verificationLink}" style="display: inline-block; background: #1A685B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationLink}</p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't request this verification email, please ignore this message.</p>
            <p>Best regards,<br>FAITH CommUNITY Team</p>
          </div>
        `,
        text: `Verify Your Email - FAITH CommUNITY\n\nHello ${user.first_name},\n\nYou requested a new verification email. Please verify your email address by visiting this link:\n\n${verificationLink}\n\nThis verification link will expire in 24 hours.\n\nIf you didn't request this verification email, please ignore this message.\n\nBest regards,\nFAITH CommUNITY Team`
      });

      res.json({ 
        message: 'Verification email sent successfully! Please check your email.',
        sent: true 
      });

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify JWT token middleware
export const verifyToken = async (req, res, next) => {
  try {
    console.log('Verifying token...');
    console.log('Authorization header:', req.headers.authorization);
    
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Extracted token:', token ? 'Present' : 'Missing');

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('Decoded token:', decoded);
    req.user = decoded;
    next();

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// User notification functions
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [notifications] = await promisePool.query(
      `SELECT id, user_id, type, title, message, is_read, created_at 
       FROM user_notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      notifications: notifications
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [result] = await promisePool.query(
      `SELECT COUNT(*) as count 
       FROM user_notifications 
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    res.json({
      success: true,
      count: result[0].count
    });
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    const [result] = await promisePool.query(
      `UPDATE user_notifications 
       SET is_read = 1 
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await promisePool.query(
      `UPDATE user_notifications 
       SET is_read = 1 
       WHERE user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
};

// Helper function to create notification (used by other controllers)
export const createUserNotification = async (userId, type, title, message) => {
  try {
    await promisePool.query(
      `INSERT INTO user_notifications (user_id, type, title, message, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, type, title, message]
    );
  } catch (error) {
    console.error('Error creating user notification:', error);
  }
};

// Forgot password - send reset email for users
export const forgotPasswordUser = async (req, res) => {
  const { email } = req.body

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    // Check if user exists with this email
    const [userRows] = await promisePool.query(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    )

    if (userRows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: "If an account with that email exists, a password reset link has been sent." })
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Store token in password_reset_tokens table
    await promisePool.query(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expiresAt]
    )

    // Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&type=user`
    
    const { sendMail } = await import('../../utils/mailer.js')
    
    await sendMail({
      to: email,
      subject: "Password Reset Request - FAITH CommUNITY",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1A685B;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your FAITH CommUNITY account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background: #1A685B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>FAITH CommUNITY Team</p>
        </div>
      `,
      text: `Password Reset Request - FAITH CommUNITY\n\nHello,\n\nYou have requested to reset your password for your FAITH CommUNITY account.\n\nClick the following link to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, please ignore this email.\n\nBest regards,\nFAITH CommUNITY Team`
    })

    res.json({ message: "If an account with that email exists, a password reset link has been sent." })
  } catch (err) {
    console.error("User forgot password error:", err)
    res.status(500).json({ error: "Internal server error while processing password reset request" })
  }
}

// Reset password with token for users
export const resetPasswordUser = async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" })
  }

  try {
    // Find valid token
    const [tokenRows] = await promisePool.query(
      'SELECT email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    )

    if (tokenRows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

    const tokenData = tokenRows[0]

    // Hash new password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update user password
    await promisePool.query(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, tokenData.email]
    )

    // Also update admin password if email exists there
    await promisePool.query(
      'UPDATE admins SET password = ? WHERE email = ? AND status = "ACTIVE"',
      [hashedPassword, tokenData.email]
    )

    // Also update superadmin password if email exists there
    await promisePool.query(
      'UPDATE superadmin SET password = ? WHERE username = ?',
      [hashedPassword, tokenData.email]
    )

    // Delete used token
    await promisePool.query(
      'DELETE FROM password_reset_tokens WHERE token = ?',
      [token]
    )

    // Send confirmation email
    const { sendMail } = await import('../../utils/mailer.js')
    
    await sendMail({
      to: tokenData.email,
      subject: "Password Successfully Reset - FAITH CommUNITY",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1A685B;">Password Successfully Reset</h2>
          <p>Hello,</p>
          <p>Your password has been successfully reset for your FAITH CommUNITY account.</p>
          <p>You can now log in with your new password.</p>
          <p>If you didn't request this password reset, please contact support immediately.</p>
          <p>Best regards,<br>FAITH CommUNITY Team</p>
        </div>
      `,
      text: `Password Successfully Reset - FAITH CommUNITY\n\nHello,\n\nYour password has been successfully reset for your FAITH CommUNITY account.\n\nYou can now log in with your new password.\n\nIf you didn't request this password reset, please contact support immediately.\n\nBest regards,\nFAITH CommUNITY Team`
    })

    res.json({ message: "Password has been successfully reset" })
  } catch (err) {
    console.error("User reset password error:", err)
    res.status(500).json({ error: "Internal server error while resetting password" })
  }
}

// Validate reset token without using it
export const validateResetToken = async (req, res) => {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({ error: "Token is required" })
  }

  try {
    // Check if token exists and is not expired
    const [tokenRows] = await promisePool.query(
      'SELECT email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    )

    if (tokenRows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

    res.json({ message: "Token is valid" })
  } catch (err) {
    console.error("Validate reset token error:", err)
    res.status(500).json({ error: "Internal server error while validating token" })
  }
}

// Check if email exists in user system
export const checkEmailUser = async (req, res) => {
  const { email } = req.body

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    const [userRows] = await promisePool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (userRows.length > 0) {
      res.json({ exists: true })
    } else {
      res.status(404).json({ exists: false })
    }
  } catch (err) {
    console.error("User check email error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

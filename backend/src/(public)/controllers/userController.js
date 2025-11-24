import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getOrganizationLogoUrl } from '../../utils/imageUrlUtils.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  findValidRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  getAccessTokenCookieOptions,
  getRefreshCookieOptions,
  getClearCookieOptions,
} from '../../utils/jwt.js';
import crypto from 'crypto';
import db from '../../database.js';
import { LoginAttemptTracker } from '../../utils/loginAttemptTracker.js';
import { SecurityMonitoring } from '../../utils/securityMonitoring.js';
import { getClientIpAddress } from '../../utils/ipAddressHelper.js';
import { logError } from '../../utils/logger.js';

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

    // Check if email already exists in unified users table
    const [existingUser] = await db.query(
      'SELECT id, role FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      const role = existingUser[0].role;
      if (role === 'admin') {
        return res.status(409).json({ error: 'This email is already registered as an admin' });
      } else if (role === 'superadmin') {
        return res.status(409).json({ error: 'This email is already registered as a superadmin' });
      } else {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Convert birth date from MM/DD/YYYY to YYYY-MM-DD format for MySQL
    let formattedBirthDate = null;
    if (birthDate && birthDate.trim()) {
      // Check if it's already in ISO format (YYYY-MM-DD)
      if (birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Validate the date components
        const [year, month, day] = birthDate.split('-');
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
          formattedBirthDate = birthDate; // Already in correct format
        } else {
          return res.status(400).json({ error: 'Invalid birth date' });
        }
      } else {
        // Handle legacy MM/DD/YYYY format for backward compatibility
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
      }
    } else {
      return res.status(400).json({ error: 'Birth date is required' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Insert new user into unified users table with verification token
    const [result] = await db.query(
      `INSERT INTO users (
        email, password_hash, role, verification_token, 
        verification_token_expires, email_verified, created_at
      ) VALUES (?, ?, 'user', ?, ?, FALSE, NOW())`,
      [email, hashedPassword, verificationToken, verificationExpires]
    );

    const userId = result.insertId;

    // Insert profile data into user_profiles table
    await db.query(
      `INSERT INTO user_profiles (
        user_id, first_name, last_name, contact_number, gender, 
        address, birth_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, firstName, lastName, contactNumber, gender, address, formattedBirthDate]
    );

    try {
      const { sendMail } = await import('../../utils/mailer.js');
      const { getSiteName } = await import('../../utils/siteName.js');
      
      // URL encode the token to ensure proper handling across all email clients and browsers
      const encodedToken = encodeURIComponent(verificationToken);
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?token=${encodedToken}`;
      const siteName = await getSiteName();
      
      await sendMail({
        to: email,
        subject: `Verify Your Email - ${siteName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
              <p style="color: #E8F5F3; margin: 10px 0 0 0;">Email Verification</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1A685B; margin-top: 0;">Welcome to ${siteName}!</h2>
              
              <p>Hello ${firstName},</p>
              
              <p>Thank you for registering with ${siteName}. To complete your registration, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" style="display: inline-block; background: #1A685B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 13px; background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">${verificationLink}</p>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;"><strong>Important:</strong> This verification link will expire in 24 hours.</p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you didn't create an account with ${siteName}, please ignore this email.
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Best regards,<br><strong>${siteName} Team</strong>
              </p>
            </div>
          </div>
        `,
        text: `Welcome to ${siteName}!\n\nHello ${firstName},\n\nThank you for registering with ${siteName}. To complete your registration, please verify your email address by visiting this link:\n\n${verificationLink}\n\nThis verification link will expire in 24 hours.\n\nIf you didn't create an account with ${siteName}, please ignore this email.\n\nBest regards,\n${siteName} Team`
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
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Failed to send verification email:', emailError.message);
      }
      
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
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = getClientIpAddress(req);
    const normalizedEmail = email?.trim().toLowerCase();

    const failedAttempts = await LoginAttemptTracker.getFailedAttempts(normalizedEmail, ipAddress, 'user');
    const maxAttempts = LoginAttemptTracker.getMaxAttempts();
    
    if (failedAttempts >= maxAttempts) {
      const remainingSeconds = await LoginAttemptTracker.getLockoutTimeRemaining(normalizedEmail, ipAddress, 'user');
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      
      return res.status(429).json({ 
        error: `Too many failed login attempts. Please wait ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} before trying again.`,
        retryAfter: `${remainingMinutes} minutes`,
        remainingSeconds: remainingSeconds,
        attempts: failedAttempts,
        maxAttempts: maxAttempts
      });
    }

    // Find user by email with profile data (case-insensitive comparison)
    const [users] = await db.query(
      `SELECT u.*, up.first_name, up.last_name, up.contact_number, up.gender, 
              up.address, up.birth_date, up.occupation, up.citizenship, 
              up.profile_photo_url, up.newsletter_subscribed
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE LOWER(u.email) = ? AND u.role = 'user'`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      await LoginAttemptTracker.trackFailedAttempt(normalizedEmail, ipAddress, 'user');
      await SecurityMonitoring.logSecurityEvent('failed_login', 'warn', { email: normalizedEmail, reason: 'user_not_found' }, req);
      const newFailedAttempts = await LoginAttemptTracker.getFailedAttempts(normalizedEmail, ipAddress, 'user');
      const maxAttempts = LoginAttemptTracker.getMaxAttempts();
      return res.status(401).json({ 
        error: 'Invalid email or password',
        attempts: newFailedAttempts,
        remainingAttempts: Math.max(0, maxAttempts - newFailedAttempts)
      });
    }

    const user = users[0];

    if (user.is_active === 0 || user.is_active === false) {
      await LoginAttemptTracker.trackFailedAttempt(normalizedEmail, ipAddress, 'user');
      await SecurityMonitoring.logSecurityEvent('failed_login', 'warn', { email: normalizedEmail, reason: 'account_inactive' }, req);
      return res.status(401).json({ 
        error: 'Your account has been deactivated. Please contact support for assistance.',
        accountInactive: true
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      await LoginAttemptTracker.trackFailedAttempt(normalizedEmail, ipAddress, 'user');
      await SecurityMonitoring.logSecurityEvent('failed_login', 'warn', { email: normalizedEmail, reason: 'invalid_password' }, req);
      const newFailedAttempts = await LoginAttemptTracker.getFailedAttempts(normalizedEmail, ipAddress, 'user');
      const maxAttempts = LoginAttemptTracker.getMaxAttempts();
      return res.status(401).json({ 
        error: 'Invalid email or password',
        attempts: newFailedAttempts,
        remainingAttempts: Math.max(0, maxAttempts - newFailedAttempts)
      });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({ 
        error: 'Please verify your email address before logging in. Check your email for a verification link.',
        requiresVerification: true 
      });
    }

    // Issue short-lived access token and refresh token
    const accessToken = signAccessToken({ id: user.id, email: user.email, role: 'user' })
    const { token: refreshToken, expiresAt } = await issueRefreshToken(user.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIpAddress(req),
    })

    await LoginAttemptTracker.clearFailedAttempts(normalizedEmail, ipAddress, 'user');
    
    await SecurityMonitoring.logSecurityEvent('successful_login', 'info', { email: normalizedEmail, userId: user.id }, req);

    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Set both tokens as httpOnly cookies (secure - not accessible to JavaScript)
    // Pass req to cookie options functions so they can use forwarded host for domain
    const accessCookieOptions = getAccessTokenCookieOptions(req);
    const refreshCookieOptions = getRefreshCookieOptions(req);
    
    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[loginUser] Setting cookies:', {
        accessTokenLength: accessToken.length,
        refreshTokenLength: refreshToken.length,
        accessCookieOptions,
        refreshCookieOptions,
        host: req.headers.host,
        origin: req.headers.origin,
        'x-forwarded-host': req.headers['x-forwarded-host']
      });
    }
    
    // Set both tokens as httpOnly cookies
    // Express will automatically overwrite existing cookies with the same name
    res.cookie('access_token', accessToken, accessCookieOptions)
    res.cookie('refresh_token', refreshToken, refreshCookieOptions)
    
    // Log the actual Set-Cookie headers being sent (development only)
    if (process.env.NODE_ENV === 'development') {
      const setCookieHeaders = res.getHeader('Set-Cookie');
      console.log('[loginUser] Set-Cookie headers being sent:', setCookieHeaders);
    }
    
    // Don't return token in response body - it's in httpOnly cookie now
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        contactNumber: user.contact_number,
        gender: user.gender,
        address: user.address,
        birthDate: user.birth_date,
        profile_photo_url: user.profile_photo_url,
        occupation: user.occupation,
        citizenship: user.citizenship,
        newsletterSubscribed: Boolean(user.newsletter_subscribed)
      }
    });

  } catch (error) {
    logError('Login error', error, { context: 'user_controller', email: req.body?.email });
    if (process.env.NODE_ENV === 'development') {
      console.error('Login error details:', {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        stack: error.stack
      });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await db.query(
      `SELECT u.*, up.first_name, up.last_name, up.contact_number, up.gender, 
              up.address, up.birth_date, up.occupation, up.citizenship, 
              up.profile_photo_url, up.newsletter_subscribed
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ? AND u.role = 'user'`,
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
        profile_photo_url: user.profile_photo_url,
        occupation: user.occupation,
        citizenship: user.citizenship,
        newsletterSubscribed: Boolean(user.newsletter_subscribed),
        createdAt: user.created_at,
        passwordChangedAt: user.password_changed_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
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

    // Update user profile in user_profiles table
    await db.query(
      `UPDATE user_profiles SET 
        first_name = ?, last_name = ?, contact_number = ?, 
        gender = ?, address = ?, birth_date = ?, 
        occupation = ?, citizenship = ?, updated_at = NOW()
      WHERE user_id = ?`,
      [firstName, lastName, contactNumber, gender, address, birthDate, occupation, citizenship, userId]
    );

    // Update users table updated_at
    await db.query(
      `UPDATE users SET updated_at = NOW() WHERE id = ?`,
      [userId]
    );

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Check if file buffer exists
    if (!req.file.buffer) {
      return res.status(400).json({ error: 'File buffer not found' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, AVIF, and SVG images are allowed' });
    }

    // Validate file size (3MB limit)
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 3MB' });
    }

    // Import Cloudinary utilities
    const { 
      deleteFromCloudinary, 
      extractPublicIdFromUrl,
      CLOUDINARY_FOLDERS 
    } = await import('../../utils/cloudinaryConfig.js');
    const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');

    // Get current user to check for existing profile photo
    let users;
    try {
      [users] = await db.query(
        `SELECT u.*, up.profile_photo_url 
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.id = ? AND u.role = 'user'`,
        [userId]
      );
    } catch (dbError) {
      throw new Error(`Database query failed: ${dbError.message}`);
    }
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];

    // Delete old profile photo from Cloudinary if it exists
    if (user.profile_photo_url) {
      const oldPublicId = extractPublicIdFromUrl(user.profile_photo_url);
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId);
        } catch (deleteError) {
        }
      }
    }

    // Upload new profile photo to Cloudinary
    let uploadResult;
    try {
      uploadResult = await uploadSingleToCloudinary(
        req.file, 
        CLOUDINARY_FOLDERS.USER_PROFILES,
        { prefix: 'profile_' }
      );
    } catch (cloudinaryError) {
      throw new Error(`Cloudinary upload failed: ${cloudinaryError.message}`);
    }

    const profilePhotoUrl = uploadResult.url;

    // Update user's profile_photo_url in user_profiles table
    try {
      await db.query(
        'UPDATE user_profiles SET profile_photo_url = ?, updated_at = NOW() WHERE user_id = ?',
        [profilePhotoUrl, userId]
      );
      // Update users table updated_at
      await db.query(
        'UPDATE users SET updated_at = NOW() WHERE id = ?',
        [userId]
      );
    } catch (dbError) {
      throw new Error(`Database update failed: ${dbError.message}`);
    }
    
    // Get updated user data
    let updatedUsers;
    try {
      [updatedUsers] = await db.query(
        `SELECT u.*, up.first_name, up.last_name, up.contact_number, up.gender, 
                up.address, up.birth_date, up.occupation, up.citizenship, 
                up.profile_photo_url
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         WHERE u.id = ? AND u.role = 'user'`,
        [userId]
      );
    } catch (dbError) {
      throw new Error(`Final database query failed: ${dbError.message}`);
    }
    
    const updatedUser = updatedUsers[0];
    
    res.json({
      message: 'Profile photo uploaded successfully',
      profilePhotoUrl: profilePhotoUrl,
      cloudinary_info: {
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        size: uploadResult.size
      },
      user: {
        id: updatedUser.id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        contactNumber: updatedUser.contact_number,
        gender: updatedUser.gender,
        address: updatedUser.address,
        birthDate: updatedUser.birth_date,
        occupation: updatedUser.occupation,
        citizenship: updatedUser.citizenship,
        profile_photo_url: updatedUser.profile_photo_url
      }
    });

  } catch (error) {
    // Provide more specific error messages
    let errorMessage = 'Internal server error';
    if (error.message.includes('Cloudinary')) {
      errorMessage = 'Failed to upload to cloud storage';
    } else if (error.message.includes('database')) {
      errorMessage = 'Failed to update database';
    } else if (error.message.includes('file')) {
      errorMessage = 'File processing error';
    }
    
    res.status(500).json({ error: errorMessage });
  }
};

// Remove profile photo
export const removeProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current profile photo URL
    const [users] = await db.query(
      `SELECT up.profile_photo_url 
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ? AND u.role = 'user'`,
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentPhotoUrl = users[0].profile_photo_url;
    
    // Delete the photo from Cloudinary if it exists
    if (currentPhotoUrl) {
      const { deleteFromCloudinary, extractPublicIdFromUrl } = await import('../../utils/cloudinaryConfig.js');
      
      const publicId = extractPublicIdFromUrl(currentPhotoUrl);
      if (publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (deleteError) {
        }
      }
    }
    
    // Update user's profile_photo_url to null in user_profiles table
    await db.query(
      'UPDATE user_profiles SET profile_photo_url = NULL, updated_at = NOW() WHERE user_id = ?',
      [userId]
    );
    // Update users table updated_at
    await db.query(
      'UPDATE users SET updated_at = NOW() WHERE id = ?',
      [userId]
    );
    
    // Get updated user data
    const [updatedUsers] = await db.query(
      `SELECT u.*, up.first_name, up.last_name, up.contact_number, up.gender, 
              up.address, up.birth_date, up.occupation, up.citizenship, 
              up.profile_photo_url
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ? AND u.role = 'user'`,
      [userId]
    );
    
    const user = updatedUsers[0];
    
    res.json({
      message: 'Profile photo removed successfully',
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
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change email - Step 1: Request email change with password verification
export const requestEmailChange = async (req, res) => {
  try {
    
    const userId = req.user.id;
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      return res.status(400).json({ error: 'New email and current password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get current user data
    const [users] = await db.query(
      `SELECT u.email, u.password_hash, up.first_name, up.last_name 
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ? AND u.role = 'user'`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Check if new email is different from current email
    if (newEmail === user.email) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Check if new email is already taken
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [newEmail, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email is already taken by another user' });
    }

    // Create OTP and send verification email
    const { EmailChangeOTP } = await import('../../utils/emailChangeOTP.js');
    const userName = `${user.first_name} ${user.last_name}`.trim();
    
    const result = await EmailChangeOTP.createEmailChangeOTP(
      userId, 
      'user', 
      newEmail, 
      user.email, 
      userName
    );

    res.json({
      message: 'OTP sent to new email address. Please check your email and enter the verification code.',
      token: result.token,
      expiresAt: result.expiresAt
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change email - Step 2: Verify OTP and complete email change
export const verifyEmailChangeOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, otp } = req.body;

    if (!token || !otp) {
      return res.status(400).json({ error: 'Token and OTP are required' });
    }

    // Verify OTP
    const { EmailChangeOTP } = await import('../../utils/emailChangeOTP.js');
    const verificationResult = await EmailChangeOTP.verifyOTP(token, otp, userId, 'user');

    if (!verificationResult.success) {
      return res.status(400).json({ error: verificationResult.error });
    }

    // Update email in database
    await db.query(
      'UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?',
      [verificationResult.newEmail, userId]
    );

    // Get updated user data for new token
    const [updatedUsers] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (updatedUsers.length === 0) {
      return res.status(404).json({ error: 'User not found after email update' });
    }

    const updatedUser = updatedUsers[0];

    // Generate new access token with updated email
    const newAccessToken = signAccessToken({ 
      id: updatedUser.id, 
      email: updatedUser.email, 
      role: 'user' 
    });

    // Clean up expired OTPs
    await EmailChangeOTP.cleanupExpiredOTPs();

    res.json({ 
      message: 'Email changed successfully',
      newEmail: verificationResult.newEmail,
      token: newAccessToken,
      user: {
        id: updatedUser.id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        contactNumber: updatedUser.contact_number,
        gender: updatedUser.gender,
        address: updatedUser.address,
        birthDate: updatedUser.birth_date,
        profile_photo_url: updatedUser.profile_photo_url,
        occupation: updatedUser.occupation,
        citizenship: updatedUser.citizenship,
        newsletterSubscribed: Boolean(updatedUser.newsletter_subscribed)
      }
    });

  } catch (error) {
    // Log the actual error for debugging
    logError('Error verifying user email change OTP', error, {
      context: 'user_controller',
      userId: req.user?.id,
      errorStack: error.stack
    });
    
    // Return error message (hide details in production for security)
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error';
    
    res.status(500).json({ error: errorMessage });
  }
};


// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    // Enhanced password complexity validation
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    // Get current password hash and user details
    const [users] = await db.query(
      `SELECT u.password_hash, u.email, up.first_name, up.last_name 
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ? AND u.is_active = 1 AND u.role = 'user'`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found or inactive' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, userId]
    );

    // Revoke all existing refresh tokens and clear both cookies
    try {
      await revokeAllUserRefreshTokens(userId)
    } catch {}
    // Clear both cookies using the same domain logic as cookie setting
    const clearCookieOptions = getClearCookieOptions(req);
    res.clearCookie('access_token', clearCookieOptions)
    res.clearCookie('refresh_token', clearCookieOptions)

    // Send password change notification
    try {
      const { PasswordChangeNotification } = await import('../../utils/passwordChangeNotification.js');
      const userName = users[0].first_name && users[0].last_name ? 
        `${users[0].first_name} ${users[0].last_name}` : null;
      await PasswordChangeNotification.sendPasswordChangeNotification(
        users[0].email, 
        userName, 
        'user'
      );
    } catch (notificationError) {
      // Continue with success response even if notification fails
    }

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Subscribe to newsletter (for logged-in users)
export const subscribeToNewsletter = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user details
    const [users] = await db.query(
      `SELECT u.email, up.newsletter_subscribed 
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ? AND u.role = 'user'`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (user.newsletter_subscribed) {
      return res.status(400).json({ error: 'You are already subscribed to the newsletter' });
    }

    // Update user's newsletter subscription status in user_profiles table
    await db.query(
      'UPDATE user_profiles SET newsletter_subscribed = 1, updated_at = NOW() WHERE user_id = ?',
      [userId]
    );
    // Update users table updated_at
    await db.query(
      'UPDATE users SET updated_at = NOW() WHERE id = ?',
      [userId]
    );

    // Also add to subscribers table for consistency
    const verifyToken = crypto.randomBytes(24).toString("hex");
    const unsubscribeToken = crypto.randomBytes(24).toString("hex");

    await db.query(
      `INSERT INTO subscribers (email, verify_token, unsubscribe_token, is_verified, verified_at)
       VALUES (?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE 
         verify_token = VALUES(verify_token),
         unsubscribe_token = VALUES(unsubscribe_token),
         is_verified = 1,
         verified_at = NOW()`,
      [user.email, verifyToken, unsubscribeToken]
    );

    res.json({ 
      message: 'Successfully subscribed to newsletter!',
      subscribed: true 
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unsubscribe from newsletter (for logged-in users)
export const unsubscribeFromNewsletter = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user details
    const [users] = await db.query(
      `SELECT u.email, up.newsletter_subscribed 
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ? AND u.role = 'user'`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (!user.newsletter_subscribed) {
      return res.status(400).json({ error: 'You are not subscribed to the newsletter' });
    }

    // Update user's newsletter subscription status in user_profiles table
    await db.query(
      'UPDATE user_profiles SET newsletter_subscribed = 0, updated_at = NOW() WHERE user_id = ?',
      [userId]
    );
    // Update users table updated_at
    await db.query(
      'UPDATE users SET updated_at = NOW() WHERE id = ?',
      [userId]
    );

    // Also remove from subscribers table for consistency
    await db.query(
      'DELETE FROM subscribers WHERE email = ?',
      [user.email]
    );

    res.json({ 
      message: 'Successfully unsubscribed from newsletter',
      subscribed: false 
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get newsletter subscription status
export const getNewsletterStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await db.query(
      `SELECT up.newsletter_subscribed 
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ? AND u.role = 'user'`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      subscribed: Boolean(users[0].newsletter_subscribed)
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unified logout - works for all roles (user, admin, superadmin)
export const logoutUser = async (req, res) => {
  try {
    // Get user from token (works for all roles with unified users table)
    const userId = req.user?.id || req.admin?.id || req.superadmin?.id;
    
    if (userId) {
      // Update last login timestamp (optional)
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [userId]
      );
    }

    // Revoke presented refresh token cookie if present
    const presented = req.cookies?.refresh_token
    if (presented) {
      await revokeRefreshToken(presented)
    }

    // Clear both cookies (works for all roles)
    // IMPORTANT: Must specify same domain that was used to set the cookie
    // Use the shared utility function that matches getAccessTokenCookieOptions/getRefreshCookieOptions
    const clearCookieOptions = getClearCookieOptions(req);
    res.clearCookie('access_token', clearCookieOptions)
    res.clearCookie('refresh_token', clearCookieOptions)

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unified refresh access token - works for all roles (user, admin, superadmin)
export const refreshAccessToken = async (req, res) => {
  try {
    const presented = req.cookies?.refresh_token
    if (!presented) return res.status(401).json({ error: 'Refresh token required' })

    const record = await findValidRefreshToken(presented)
    if (!record) return res.status(401).json({ error: 'Invalid or expired refresh token' })

    // Get user from unified users table - works for all roles!
    const [users] = await db.query(
      'SELECT id, email, role, organization_id FROM users WHERE id = ?',
      [record.user_id]
    )
    
    if (users.length === 0) return res.status(401).json({ error: 'User not found' })

    const user = users[0]

    // Rotate refresh token
    const { token: newRefresh } = await rotateRefreshToken(presented, record.user_id, {
      userAgent: req.headers['user-agent'],
      ipAddress: getClientIpAddress(req),
    })

    // Generate access token based on role (unified approach!)
    let accessTokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    }

    // Add role-specific fields
    if (user.role === 'admin' && user.organization_id) {
      // Get admin organization details
      const [orgs] = await db.query(
        'SELECT org, orgName, logo FROM organizations WHERE id = ?',
        [user.organization_id]
      )
      if (orgs.length > 0) {
        accessTokenPayload.organization_id = user.organization_id
        accessTokenPayload.org = orgs[0].org
        accessTokenPayload.orgName = orgs[0].orgName
      }
    }

    const accessToken = signAccessToken(accessTokenPayload)

    // Set both new tokens as httpOnly cookies
    // Pass req to cookie options functions so they can use forwarded host for domain
    res.cookie('access_token', accessToken, getAccessTokenCookieOptions(req))
    res.cookie('refresh_token', newRefresh, getRefreshCookieOptions(req))
    
    res.json({ 
      message: 'Token refreshed successfully',
      role: user.role // Return role so frontend knows which type
    })
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[refreshAccessToken] Error refreshing token:', e);
      console.error('[refreshAccessToken] Error details:', {
        name: e.name,
        message: e.message,
        stack: e.stack?.split('\n').slice(0, 10).join('\n')
      });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? e.message : undefined
    })
  }
}

// Verify email address
export const verifyEmail = async (req, res) => {
  try {
    // Trim and validate token to handle any whitespace or encoding issues
    const token = req.query?.token?.trim();

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Validate token format (should be 64 hex characters from crypto.randomBytes(32))
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Invalid token format:', { tokenLength: token.length, tokenPreview: token.substring(0, 10) + '...' });
      }
      return res.status(400).json({ error: 'Invalid verification token format' });
    }

    // Find user with this verification token
    const [users] = await db.query(
      'SELECT id, email, verification_token, verification_token_expires, email_verified FROM users WHERE verification_token = ? AND role = \'user\'',
      [token]
    );

    if (users.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Token not found in database:', { tokenLength: token.length, tokenPreview: token.substring(0, 10) + '...' });
      }
      return res.status(400).json({ error: 'Invalid verification token. The token may have already been used or does not exist.' });
    }

    const user = users[0];

    // Check if email is already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified. You can log in to your account.' });
    }

    // Check if token has expired
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
    }

    // Update user to verified and clear verification token
    await db.query(
      'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL, updated_at = NOW() WHERE id = ?',
      [user.id]
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Email verified successfully for user:', user.email);
    }

    res.json({ 
      message: 'Email verified successfully! You can now log in to your account.',
      verified: true 
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Error verifying email:', error);
    }
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
    const [users] = await db.query(
      `SELECT u.id, up.first_name, u.email, u.email_verified 
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.email = ? AND u.role = 'user'`,
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
    await db.query(
      'UPDATE users SET verification_token = ?, verification_token_expires = ?, updated_at = NOW() WHERE id = ?',
      [verificationToken, verificationExpires, user.id]
    );

    try {
      const { sendMail } = await import('../../utils/mailer.js');
      const { getSiteName } = await import('../../utils/siteName.js');
      
      // URL encode the token to ensure proper handling across all email clients and browsers
      const encodedToken = encodeURIComponent(verificationToken);
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?token=${encodedToken}`;
      const siteName = await getSiteName();
      
      await sendMail({
        to: email,
        subject: `Verify Your Email - ${siteName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
              <p style="color: #E8F5F3; margin: 10px 0 0 0;">Email Verification</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1A685B; margin-top: 0;">Verify Your Email</h2>
              
              <p>Hello ${user.first_name},</p>
              
              <p>You requested a new verification email. Please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" style="display: inline-block; background: #1A685B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 13px; background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">${verificationLink}</p>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;"><strong>Important:</strong> This verification link will expire in 24 hours.</p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                If you didn't request this verification email, please ignore this message.
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Best regards,<br><strong>${siteName} Team</strong>
              </p>
            </div>
          </div>
        `,
        text: `Verify Your Email - ${siteName}\n\nHello ${user.first_name},\n\nYou requested a new verification email. Please verify your email address by visiting this link:\n\n${verificationLink}\n\nThis verification link will expire in 24 hours.\n\nIf you didn't request this verification email, please ignore this message.\n\nBest regards,\n${siteName} Team`
      });

      res.json({ 
        message: 'Verification email sent successfully! Please check your email.',
        sent: true 
      });

    } catch (emailError) {
      res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
    }

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check authentication status (for frontend to verify if user is logged in)
// Works for all roles (user, admin, superadmin) using unified users table
export const checkAuthStatus = async (req, res) => {
  try {
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      
      // If no access token but refresh token exists, try to refresh
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        try {
          const record = await findValidRefreshToken(refreshToken);
          if (record) {
            // Get user from unified table
            const [users] = await db.query(
              'SELECT id, email, role, organization_id FROM users WHERE id = ?',
              [record.user_id]
            );
            
            if (users.length > 0) {
              const user = users[0];
              
              // Rotate refresh token
              const { token: newRefresh } = await rotateRefreshToken(refreshToken, record.user_id, {
                userAgent: req.headers['user-agent'],
                ipAddress: getClientIpAddress(req),
              });
              
              // Generate new access token
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
              
              const accessToken = signAccessToken(accessTokenPayload);
              
              // Get cookie options and log them BEFORE setting cookies
              const accessCookieOpts = getAccessTokenCookieOptions(req);
              const refreshCookieOpts = getRefreshCookieOptions(req);
              
              // Debug logging (development only)
              if (process.env.NODE_ENV === 'development') {
                console.log('[checkAuthStatus] Cookie options BEFORE setting:', {
                  accessCookieOpts,
                  refreshCookieOpts,
                  accessTokenLength: accessToken.length
                });
              }
              
              // Set both new tokens as httpOnly cookies
              // Express will automatically overwrite existing cookies with the same name
              res.cookie('access_token', accessToken, accessCookieOpts);
              res.cookie('refresh_token', newRefresh, refreshCookieOpts);
              
              // Log the actual Set-Cookie headers being sent (development only)
              if (process.env.NODE_ENV === 'development') {
                const setCookieHeaders = res.getHeader('Set-Cookie');
                console.log('[checkAuthStatus] Set-Cookie headers after refresh:', setCookieHeaders);
              }
              
              // Get user data (same logic as below)
              let userData = { id: user.id, email: user.email, role: user.role };
              
              if (user.role === 'user') {
                const [profiles] = await db.query(
                  `SELECT first_name, last_name, contact_number, gender, address, 
                          birth_date, occupation, citizenship, profile_photo_url, newsletter_subscribed
                   FROM user_profiles WHERE user_id = ?`,
                  [user.id]
                );
                if (profiles.length > 0) {
                  const p = profiles[0];
                  userData = {
                    ...userData,
                    firstName: p.first_name,
                    lastName: p.last_name,
                    contactNumber: p.contact_number,
                    gender: p.gender,
                    address: p.address,
                    birthDate: p.birth_date,
                    occupation: p.occupation,
                    citizenship: p.citizenship,
                    profile_photo_url: p.profile_photo_url,
                    newsletterSubscribed: Boolean(p.newsletter_subscribed)
                  };
                }
              } else if (user.role === 'admin' && user.organization_id) {
                const [orgs] = await db.query(
                  'SELECT org, orgName, logo FROM organizations WHERE id = ?',
                  [user.organization_id]
                );
                if (orgs.length > 0) {
                  userData = {
                    ...userData,
                    organization_id: user.organization_id,
                    org: orgs[0].org,
                    orgName: orgs[0].orgName,
                    logo: orgs[0].logo
                  };
                }
              }
              
              return res.json({
                authenticated: true,
                user: userData
              });
            }
          }
        } catch (refreshError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[checkAuthStatus] Token refresh error (no access token):', refreshError);
          }
        }
      }
      
      return res.json({ authenticated: false });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-env', {
        issuer: process.env.JWT_ISS || 'faith-community-api',
        audience: process.env.JWT_AUD || 'faith-community-client'
      });
      
      // Get user from unified table
      const [users] = await db.query(
        'SELECT id, email, role, organization_id FROM users WHERE id = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        return res.json({ authenticated: false });
      }

      const user = users[0];
      let userData = { id: user.id, email: user.email, role: user.role };

      // Get role-specific data
      if (user.role === 'user') {
        const [profiles] = await db.query(
          `SELECT first_name, last_name, contact_number, gender, address, 
                  birth_date, occupation, citizenship, profile_photo_url, newsletter_subscribed
           FROM user_profiles WHERE user_id = ?`,
          [user.id]
        );
        if (profiles.length > 0) {
          const p = profiles[0];
          userData = {
            ...userData,
            firstName: p.first_name,
            lastName: p.last_name,
            contactNumber: p.contact_number,
            gender: p.gender,
            address: p.address,
            birthDate: p.birth_date,
            occupation: p.occupation,
            citizenship: p.citizenship,
            profile_photo_url: p.profile_photo_url,
            newsletterSubscribed: Boolean(p.newsletter_subscribed)
          };
        }
      } else if (user.role === 'admin' && user.organization_id) {
        const [orgs] = await db.query(
          'SELECT org, orgName, logo FROM organizations WHERE id = ?',
          [user.organization_id]
        );
        if (orgs.length > 0) {
          userData = {
            ...userData,
            organization_id: user.organization_id,
            org: orgs[0].org,
            orgName: orgs[0].orgName,
            logo: orgs[0].logo
          };
        }
      }
      
      return res.json({
        authenticated: true,
        user: userData
      });
    } catch (error) {
      // Token invalid or expired - try to refresh automatically
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        try {
          const record = await findValidRefreshToken(refreshToken);
          if (record) {
            // Get user from unified table
            const [users] = await db.query(
              'SELECT id, email, role, organization_id FROM users WHERE id = ?',
              [record.user_id]
            );
            
            if (users.length > 0) {
              const user = users[0];
              
              // Rotate refresh token
              const { token: newRefresh } = await rotateRefreshToken(refreshToken, record.user_id, {
                userAgent: req.headers['user-agent'],
                ipAddress: getClientIpAddress(req),
              });
              
              // Generate new access token
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
              
              const accessToken = signAccessToken(accessTokenPayload);
              
              // Set both new tokens as httpOnly cookies
              // Pass req to cookie options functions so they can use forwarded host for domain
              res.cookie('access_token', accessToken, getAccessTokenCookieOptions(req));
              res.cookie('refresh_token', newRefresh, getRefreshCookieOptions(req));
              
              // Get user data (same logic as above)
              let userData = { id: user.id, email: user.email, role: user.role };
              
              if (user.role === 'user') {
                const [profiles] = await db.query(
                  `SELECT first_name, last_name, contact_number, gender, address, 
                          birth_date, occupation, citizenship, profile_photo_url, newsletter_subscribed
                   FROM user_profiles WHERE user_id = ?`,
                  [user.id]
                );
                if (profiles.length > 0) {
                  const p = profiles[0];
                  userData = {
                    ...userData,
                    firstName: p.first_name,
                    lastName: p.last_name,
                    contactNumber: p.contact_number,
                    gender: p.gender,
                    address: p.address,
                    birthDate: p.birth_date,
                    occupation: p.occupation,
                    citizenship: p.citizenship,
                    profile_photo_url: p.profile_photo_url,
                    newsletterSubscribed: Boolean(p.newsletter_subscribed)
                  };
                }
              } else if (user.role === 'admin' && user.organization_id) {
                const [orgs] = await db.query(
                  'SELECT org, orgName, logo FROM organizations WHERE id = ?',
                  [user.organization_id]
                );
                if (orgs.length > 0) {
                  userData = {
                    ...userData,
                    organization_id: user.organization_id,
                    org: orgs[0].org,
                    orgName: orgs[0].orgName,
                    logo: orgs[0].logo
                  };
                }
              }
              
              return res.json({
                authenticated: true,
                user: userData
              });
            }
          }
        } catch (refreshError) {
          // Refresh failed - return not authenticated
          if (process.env.NODE_ENV === 'development') {
            console.error('[checkAuthStatus] Token refresh error:', refreshError);
          }
        }
      }
      return res.json({ authenticated: false });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[checkAuthStatus] Error in checkAuthStatus:', error);
      console.error('[checkAuthStatus] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
    return res.json({ authenticated: false, error: error.message });
  }
};

// Verify JWT token middleware
export const verifyToken = async (req, res, next) => {
  try {
    // Try cookie first (more secure), then header (for backward compatibility)
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-env', {
      issuer: process.env.JWT_ISS || 'faith-community-api',
      audience: process.env.JWT_AUD || 'faith-community-client'
    });
    
    // Set user based on role (unified approach!)
    req.user = decoded;
    if (decoded.role === 'admin') {
      req.admin = decoded;
    } else if (decoded.role === 'superadmin') {
      req.superadmin = decoded;
    }
    
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token format' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    } else {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
};

// User notification functions
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [notifications] = await db.query(
      `SELECT id, user_id, type, title, message, is_read, created_at 
       FROM user_notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    // Transform the data to match frontend expectations
    const transformedNotifications = notifications.map(notification => ({
      id: notification.id,
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.is_read === 1,
      createdAt: notification.created_at
    }));

    res.json({
      success: true,
      notifications: transformedNotifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [result] = await db.query(
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
    
    const [result] = await db.query(
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
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [result] = await db.query(
      `UPDATE user_notifications 
       SET is_read = 1 
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read',
      affectedRows: result.affectedRows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;
    
    const [result] = await db.query(
      `DELETE FROM user_notifications 
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
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
};

// Helper function to create notification (used by other controllers)
// Returns the notification ID if successful, null otherwise
// Note: section and relatedId parameters are accepted for backward compatibility but not currently stored
export const createUserNotification = async (userId, type, title, message, section = null, relatedId = null) => {
  try {
    const [result] = await db.execute(
      `INSERT INTO user_notifications (user_id, type, title, message, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, type, title, message]
    );
    return result.insertId;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error creating user notification:', error);
    }
    return null;
  }
};

// Forgot password - send reset email for users
export const forgotPasswordUser = async (req, res) => {
  const { email } = req.body

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    // Check if user exists with this email (only for role='user')
    const [userRows] = await db.query(
      'SELECT id, email FROM users WHERE email = ? AND role = \'user\'',
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
    await db.query(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expiresAt]
    )

    // Send email with reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}&type=user`
    
    const { sendMail } = await import('../../utils/mailer.js')
    const { getSiteName } = await import('../../utils/siteName.js')
    const siteName = await getSiteName()
    
    await sendMail({
      to: email,
      subject: `Password Reset Request - ${siteName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
            <p style="color: #E8F5F3; margin: 10px 0 0 0;">Password Reset Request</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1A685B; margin-top: 0;">Password Reset Request</h2>
            
            <p>Hello,</p>
            
            <p>You have requested to reset your password for your ${siteName} account. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="display: inline-block; background: #1A685B; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 13px; background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">${resetLink}</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;"><strong>Important:</strong> This link will expire in 1 hour.</p>
            </div>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24; font-size: 14px;"><strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email.</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Best regards,<br><strong>${siteName} Team</strong>
            </p>
          </div>
        </div>
      `,
      text: `Password Reset Request - ${siteName}\n\nHello,\n\nYou have requested to reset your password for your ${siteName} account.\n\nClick the following link to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, please ignore this email.\n\nBest regards,\n${siteName} Team`
    })

    res.json({ message: "If an account with that email exists, a password reset link has been sent." })
  } catch (err) {
    res.status(500).json({ error: "Internal server error while processing password reset request" })
  }
}

// Reset password with token for users
export const resetPasswordUser = async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" })
  }

  // Validate password requirements (matching frontend)
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long" })
  }
  if (!/(?=.*[a-z])/.test(newPassword)) {
    return res.status(400).json({ error: "Password must contain at least one lowercase letter" })
  }
  if (!/(?=.*[A-Z])/.test(newPassword)) {
    return res.status(400).json({ error: "Password must contain at least one uppercase letter" })
  }
  if (!/(?=.*\d)/.test(newPassword)) {
    return res.status(400).json({ error: "Password must contain at least one number" })
  }

  try {
    // Find valid token
    const [tokenRows] = await db.execute(
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

    // Update user password in unified users table (only for role='user')
    await db.execute(
      'UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE email = ? AND role = \'user\'',
      [hashedPassword, tokenData.email]
    )

    // Delete used token
    await db.execute(
      'DELETE FROM password_reset_tokens WHERE token = ?',
      [token]
    )

    // Send confirmation email
    const { sendMail } = await import('../../utils/mailer.js')
    const { getSiteName } = await import('../../utils/siteName.js')
    const siteName = await getSiteName()
    
    await sendMail({
      to: tokenData.email,
      subject: `Password Successfully Reset - ${siteName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1A685B 0%, #2D8F7F 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${siteName}</h1>
            <p style="color: #E8F5F3; margin: 10px 0 0 0;">Password Reset Confirmation</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1A685B; margin-top: 0;">Password Successfully Reset</h2>
            
            <p>Hello,</p>
            
            <p>Your password has been successfully reset for your ${siteName} account. You can now log in with your new password.</p>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #155724; font-size: 14px;"><strong>✓ Success:</strong> Your password has been changed. You may need to log in again on all devices where you're currently signed in.</p>
            </div>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #721c24; font-size: 14px;"><strong>Security Alert:</strong> If you didn't request this password reset, please contact our support team immediately as your account may be compromised.</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Best regards,<br><strong>${siteName} Team</strong>
            </p>
          </div>
        </div>
      `,
      text: `Password Successfully Reset - ${siteName}\n\nHello,\n\nYour password has been successfully reset for your ${siteName} account.\n\nYou can now log in with your new password.\n\nIf you didn't request this password reset, please contact support immediately.\n\nBest regards,\n${siteName} Team`
    })

    res.json({ message: "Password has been successfully reset" })
  } catch (err) {
    logError('Error resetting password (user)', err, { 
      context: 'userController', 
      email: req.body.token ? 'token provided' : 'no token',
      error: err.message 
    })
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
    const [tokenRows] = await db.query(
      'SELECT email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    )

    if (tokenRows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

    res.json({ message: "Token is valid" })
  } catch (err) {
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
    const [userRows] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (userRows.length > 0) {
      res.json({ exists: true })
    } else {
      res.status(404).json({ exists: false })
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}

// Delete account (hard delete - permanently removes account and related data)
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Get current password hash and profile photo URL
    const [users] = await db.query(
      `SELECT u.password_hash, u.is_active, up.profile_photo_url 
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ? AND u.role = 'user'`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Check if account is already deactivated (safety check)
    if (!user.is_active) {
      return res.status(400).json({ error: 'Account is already deactivated. Please contact support if you need assistance.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Incorrect password, please try again' });
    }

    // Delete profile photo from Cloudinary if it exists
    if (user.profile_photo_url) {
      try {
        const { deleteFromCloudinary, extractPublicIdFromUrl } = await import('../../utils/cloudinaryConfig.js');
        const publicId = extractPublicIdFromUrl(user.profile_photo_url);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      } catch (photoError) {
        // Log error but continue with account deletion even if photo deletion fails
        console.error('Error deleting profile photo from Cloudinary:', photoError);
      }
    }

    // Hard delete: Permanently delete the user record
    // Related data will be automatically deleted via CASCADE foreign keys:
    // - user_profiles (ON DELETE CASCADE)
    // - user_notifications (ON DELETE CASCADE)
    // - volunteers/applications (ON DELETE CASCADE)
    // - submissions (ON DELETE CASCADE)
    // - admin_notifications (ON DELETE CASCADE) if user was admin
    // - superadmin_notifications (ON DELETE CASCADE) if user was superadmin
    // - program_collaborations (ON DELETE CASCADE)
    // - admin_highlights (ON DELETE CASCADE)
    // 
    // Tables with ON DELETE SET NULL will have user_id set to NULL:
    // - messages (user_id)
    // - program_post_act_reports (uploaded_by_admin_id, reviewed_by_superadmin_id)
    await db.query(
      'DELETE FROM users WHERE id = ? AND role = \'user\'',
      [userId]
    );

    res.json({ 
      message: 'Your account has been permanently deleted',
      success: true 
    });

  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'An error occurred while deleting your account' });
  }
};

// Get user applications (volunteer applications)
export const getUserApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [applications] = await db.query(
      `SELECT 
        v.id,
        v.program_id,
        v.reason,
        v.status,
        v.created_at as appliedAt,
        p.title as programName,
        p.description as programDescription,
        p.image as programImage,
        p.slug as programSlug,
        p.event_start_date as programStartDate,
        p.event_end_date as programEndDate,
        p.organization_id,
        o.orgName as organizationName,
        o.org as organizationAcronym,
        o.logo as orgLogo
      FROM volunteers v
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE v.user_id = ?
      ORDER BY v.created_at DESC`,
      [userId]
    );

    // Get multiple dates for each program
    const applicationsWithDates = await Promise.all(applications.map(async (application) => {
      let multipleDates = [];
      
      // If program has event_start_date and event_end_date, check if they're the same (single day)
      if (application.programStartDate && application.programEndDate) {
        if (application.programStartDate === application.programEndDate) {
          // Single day program
          multipleDates = [application.programStartDate];
        } else {
          // Date range - include both dates
          multipleDates = [application.programStartDate, application.programEndDate];
        }
      } else if (application.programStartDate) {
        // Only start date
        multipleDates = [application.programStartDate];
      } else {
        // Check for multiple dates in program_event_dates table
        const [dateRows] = await db.execute(
          'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
          [application.program_id]
        );
        multipleDates = dateRows.map(row => row.event_date);
      }

      return {
        ...application,
        multiple_dates: multipleDates
      };
    }));

    // Transform the data to match frontend expectations
    // Convert TIMESTAMP fields to ISO format with timezone info
    const convertTimestampToISO = (timestamp) => {
      if (!timestamp) return null;
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      }
      try {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (e) {
        // If parsing fails, return as-is
      }
      return timestamp;
    };
    
    const transformedApplications = applicationsWithDates.map(application => {
      // Construct proper organization logo URL
      let orgLogoUrl = null;
      if (application.orgLogo) {
        orgLogoUrl = getOrganizationLogoUrl(application.orgLogo);
      }

      return {
        id: application.id,
        programId: application.program_id,
        programName: application.programName,
        programDescription: application.programDescription,
        programImage: application.programImage,
        programSlug: application.programSlug,
        programLocation: null, // Location not available in current database structure
        programStartDate: application.programStartDate,
        programEndDate: application.programEndDate,
        multiple_dates: application.multiple_dates, // Include multiple dates array
        organizationId: application.organization_id,
        organizationName: application.organizationName,
        organizationAcronym: application.organizationAcronym,
        orgLogo: orgLogoUrl,
        reason: application.reason,
        status: application.status === 'Declined' ? 'rejected' : application.status.toLowerCase(),
        appliedAt: convertTimestampToISO(application.appliedAt), // TIMESTAMP - convert to ISO
        notes: application.reason, // Using reason as notes for now
        feedback: null // This could be added later if feedback system is implemented
      };
    });

    res.json({
      success: true,
      applications: transformedApplications
    });
  } catch (error) {
    // Error fetching user applications
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

// Get individual application details by ID
export const getApplicationDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required'
      });
    }

    const [results] = await db.query(
      `SELECT 
        v.id,
        v.program_id,
        v.reason,
        v.status,
        v.created_at as appliedAt,
        v.updated_at as updatedAt,
        p.title as programName,
        p.description as programDescription,
        p.category as programCategory,
        p.event_start_date as programStartDate,
        p.event_end_date as programEndDate,
        p.image as programImage,
        p.slug as programSlug,
        p.organization_id,
        o.orgName as organizationName,
        o.org as organizationAcronym,
        o.logo as orgLogo,
        o.org_color as organizationColor
      FROM volunteers v
      LEFT JOIN programs_projects p ON v.program_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE v.id = ? AND v.user_id = ?`,
      [id, userId]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or access denied'
      });
    }

    const application = results[0];
    
    // Get multiple dates for this program
    let multipleDates = [];
    
    // If program has event_start_date and event_end_date, check if they're the same (single day)
    if (application.programStartDate && application.programEndDate) {
      if (application.programStartDate === application.programEndDate) {
        // Single day program
        multipleDates = [application.programStartDate];
      } else {
        // Date range - include both dates
        multipleDates = [application.programStartDate, application.programEndDate];
      }
    } else if (application.programStartDate) {
      // Only start date
      multipleDates = [application.programStartDate];
    } else {
      // Check for multiple dates in program_event_dates table
      const [dateRows] = await db.execute(
        'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
        [application.program_id]
      );
      multipleDates = dateRows.map(row => row.event_date);
    }
    
    // Transform the data to match frontend expectations
    // Convert TIMESTAMP fields to ISO format with timezone info
    const convertTimestampToISO = (timestamp) => {
      if (!timestamp) return null;
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      }
      try {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (e) {
        // If parsing fails, return as-is
      }
      return timestamp;
    };
    
    const transformedApplication = {
      id: application.id,
      programId: application.program_id,
      programName: application.programName,
      programDescription: application.programDescription,
      programCategory: application.programCategory,
      programImage: application.programImage,
      programSlug: application.programSlug,
      programStartDate: application.programStartDate,
      programEndDate: application.programEndDate,
      multiple_dates: multipleDates, // Include multiple dates array
      organizationId: application.organization_id,
      organizationName: application.organizationName,
      organizationAcronym: application.organizationAcronym,
      orgLogo: application.orgLogo,
      organizationColor: application.organizationColor,
      reason: application.reason,
      status: application.status === 'Declined' ? 'rejected' : application.status.toLowerCase(),
      appliedAt: convertTimestampToISO(application.appliedAt), // TIMESTAMP - convert to ISO
      updatedAt: convertTimestampToISO(application.updatedAt), // TIMESTAMP - convert to ISO
      notes: application.reason,
      feedback: null // This could be added later if feedback system is implemented
    };

    res.json({
      success: true,
      application: transformedApplication
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application details',
      error: error.message
    });
  }
};

// Cancel user application
export const cancelApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required'
      });
    }

    // First, verify the application belongs to the user
    const [existingApp] = await db.query(
      'SELECT id, status FROM volunteers WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingApp.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or access denied'
      });
    }

    const application = existingApp[0];

    // Check if application can be cancelled (not already cancelled or rejected)
    if (application.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Application is already cancelled'
      });
    }

    if (application.status === 'Declined') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a rejected application'
      });
    }

    // Update the application status to 'Cancelled'
    await db.query(
      'UPDATE volunteers SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      ['Cancelled', id, userId]
    );

    res.json({
      success: true,
      message: 'Application cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel application',
      error: error.message
    });
  }
};

// Delete user application
export const deleteApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required'
      });
    }

    // First, verify the application belongs to the user
    const [existingApp] = await db.query(
      'SELECT id, status FROM volunteers WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingApp.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or access denied'
      });
    }

    const application = existingApp[0];

    // Handle different statuses appropriately
    if (application.status === 'Approved') {
      // For approved applications, change status to 'Cancelled' instead of deleting
      await db.query(
        'UPDATE volunteers SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        ['Cancelled', id, userId]
      );
      
      res.json({
        success: true,
        message: 'Application cancelled successfully'
      });
      return;
    }

    if (application.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed applications. They are kept for historical records.'
      });
    }

    if (application.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete cancelled applications. They are kept for historical records.'
      });
    }

    // Delete the application (for pending or declined applications only)
    await db.query(
      'DELETE FROM volunteers WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete application',
      error: error.message
    });
  }
};

// Complete user application
export const completeApplication = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required'
      });
    }

    // First, verify the application belongs to the user
    const [existingApp] = await db.query(
      'SELECT id, status FROM volunteers WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingApp.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or access denied'
      });
    }

    const application = existingApp[0];

    // Check if application can be marked as completed (only approved applications)
    if (application.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved applications can be marked as completed'
      });
    }

    // Update the application status to 'Completed'
    await db.query(
      'UPDATE volunteers SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      ['Completed', id, userId]
    );

    res.json({
      success: true,
      message: 'Application marked as completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark application as completed',
      error: error.message
    });
  }
};
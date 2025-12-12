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
import { SessionSecurity } from '../../utils/sessionSecurity.js';
import { publishNotification } from '../../utils/pusher.js';

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

    if (!firstName || !lastName || !email || !contactNumber || !gender || !address || !birthDate || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const validGenders = ['Male', 'Female', 'Other'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ error: 'Invalid gender value' });
    }

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

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    let formattedBirthDate = null;
    if (birthDate && birthDate.trim()) {
      if (birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = birthDate.split('-');
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
          formattedBirthDate = birthDate;
        } else {
          return res.status(400).json({ error: 'Invalid birth date' });
        }
        } else {
          const dateParts = birthDate.split('/');
          if (dateParts.length === 3) {
            const [month, day, year] = dateParts;
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
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [result] = await db.query(
      `INSERT INTO users (
        email, password_hash, role, verification_token, 
        verification_token_expires, email_verified, created_at
      ) VALUES (?, ?, 'user', ?, ?, FALSE, NOW())`,
      [email, hashedPassword, verificationToken, verificationExpires]
    );

    const userId = result.insertId;

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

    if (!user.email_verified) {
      return res.status(401).json({ 
        error: 'Please verify your email address before logging in. Check your email for a verification link.',
        requiresVerification: true 
      });
    }

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

    const accessCookieOptions = getAccessTokenCookieOptions(req);
    const refreshCookieOptions = getRefreshCookieOptions(req);
    
    res.cookie('access_token', accessToken, accessCookieOptions)
    res.cookie('refresh_token', refreshToken, refreshCookieOptions)
    
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
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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

    await db.query(
      `UPDATE user_profiles SET 
        first_name = ?, last_name = ?, contact_number = ?, 
        gender = ?, address = ?, birth_date = ?, 
        occupation = ?, citizenship = ?, updated_at = NOW()
      WHERE user_id = ?`,
      [firstName, lastName, contactNumber, gender, address, birthDate, occupation, citizenship, userId]
    );

    await db.query(
      `UPDATE users SET updated_at = NOW() WHERE id = ?`,
      [userId]
    );

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!req.file.buffer) {
      return res.status(400).json({ error: 'File buffer not found' });
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, AVIF, and SVG images are allowed' });
    }

    const maxSize = 3 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'File too large. Maximum size is 3MB' });
    }

    const { 
      deleteFromCloudinary, 
      extractPublicIdFromUrl,
      CLOUDINARY_FOLDERS 
    } = await import('../../utils/cloudinaryConfig.js');
    const { uploadSingleToCloudinary } = await import('../../utils/cloudinaryUpload.js');

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

    if (user.profile_photo_url) {
      const oldPublicId = extractPublicIdFromUrl(user.profile_photo_url);
      if (oldPublicId) {
        try {
          await deleteFromCloudinary(oldPublicId);
        } catch (deleteError) {
        }
      }
    }

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

    try {
      await db.query(
        'UPDATE user_profiles SET profile_photo_url = ?, updated_at = NOW() WHERE user_id = ?',
        [profilePhotoUrl, userId]
      );
      await db.query(
        'UPDATE users SET updated_at = NOW() WHERE id = ?',
        [userId]
      );
    } catch (dbError) {
      throw new Error(`Database update failed: ${dbError.message}`);
    }
    
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

export const removeProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    
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
    
    await db.query(
      'UPDATE user_profiles SET profile_photo_url = NULL, updated_at = NOW() WHERE user_id = ?',
      [userId]
    );
    await db.query(
      'UPDATE users SET updated_at = NOW() WHERE id = ?',
      [userId]
    );
    
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

    if (newEmail === user.email) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [newEmail, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email is already taken by another user' });
    }

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

export const verifyEmailChangeOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, otp } = req.body;

    if (!token || !otp) {
      return res.status(400).json({ error: 'Token and OTP are required' });
    }

    const { EmailChangeOTP } = await import('../../utils/emailChangeOTP.js');
    const verificationResult = await EmailChangeOTP.verifyOTP(token, otp, userId, 'user');

    if (!verificationResult.success) {
      return res.status(400).json({ error: verificationResult.error });
    }

    await db.query(
      'UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?',
      [verificationResult.newEmail, userId]
    );

    const [updatedUsers] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (updatedUsers.length === 0) {
      return res.status(404).json({ error: 'User not found after email update' });
    }

    const updatedUser = updatedUsers[0];

    const newAccessToken = signAccessToken({ 
      id: updatedUser.id, 
      email: updatedUser.email, 
      role: 'user' 
    });

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
    logError('Error verifying user email change OTP', error, {
      context: 'user_controller',
      userId: req.user?.id,
      errorStack: error.stack
    });
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error';
    
    res.status(500).json({ error: errorMessage });
  }
};


export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

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

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.query(
      'UPDATE users SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, userId]
    );

    try {
      await revokeAllUserRefreshTokens(userId)
    } catch {}
    const clearCookieOptions = getClearCookieOptions(req);
    res.clearCookie('access_token', clearCookieOptions)
    res.clearCookie('refresh_token', clearCookieOptions)

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
    }

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

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
    await db.query(
      'UPDATE users SET updated_at = NOW() WHERE id = ?',
      [userId]
    );

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
    await db.query(
      'UPDATE users SET updated_at = NOW() WHERE id = ?',
      [userId]
    );

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

export const logoutUser = async (req, res) => {
  try {
    const userId = req.user?.id || req.admin?.id || req.superadmin?.id;
    const role = req.user?.role || req.admin?.role || req.superadmin?.role;
    
    if (userId) {
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [userId]
      );
      
      // Revoke admin/superadmin sessions
      if (role === 'admin' || role === 'superadmin') {
        await SessionSecurity.revokeAllAdminSessions(userId);
      }
    }

    const presented = req.cookies?.refresh_token
    if (presented) {
      await revokeRefreshToken(presented)
    }

    const clearCookieOptions = getClearCookieOptions(req);
    res.clearCookie('access_token', clearCookieOptions)
    res.clearCookie('refresh_token', clearCookieOptions)

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const presented = req.cookies?.refresh_token
    if (!presented) return res.status(401).json({ error: 'Refresh token required' })

    const record = await findValidRefreshToken(presented)
    if (!record) return res.status(401).json({ error: 'Invalid or expired refresh token' })

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
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? e.message : undefined
    })
  }
}

export const verifyEmail = async (req, res) => {
  try {
    const token = req.query?.token?.trim();

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ error: 'Invalid verification token format' });
    }

    const [users] = await db.query(
      'SELECT id, email, verification_token, verification_token_expires, email_verified FROM users WHERE verification_token = ? AND role = \'user\'',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token. The token may have already been used or does not exist.' });
    }

    const user = users[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified. You can log in to your account.' });
    }

    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
    }

    await db.query(
      'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL, updated_at = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({ 
      message: 'Email verified successfully! You can now log in to your account.',
      verified: true 
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

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

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

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

export const checkAuthStatus = async (req, res) => {
  try {
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
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
              
              const accessCookieOpts = getAccessTokenCookieOptions(req);
              const refreshCookieOpts = getRefreshCookieOptions(req);
              
              res.cookie('access_token', accessToken, accessCookieOpts);
              res.cookie('refresh_token', newRefresh, refreshCookieOpts);
              
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
        }
      }
      
      return res.json({ authenticated: false });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-env', {
        issuer: process.env.JWT_ISS || 'faith-community-api',
        audience: process.env.JWT_AUD || 'faith-community-client'
      });
      
      const [users] = await db.query(
        'SELECT id, email, role, organization_id FROM users WHERE id = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        return res.json({ authenticated: false });
      }

      const user = users[0];
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
    } catch (error) {
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
              
              res.cookie('access_token', accessToken, getAccessTokenCookieOptions(req));
              res.cookie('refresh_token', newRefresh, getRefreshCookieOptions(req));
              
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
        }
      }
      return res.json({ authenticated: false });
    }
  } catch (error) {
    return res.json({ authenticated: false, error: error.message });
  }
};

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-env', {
      issuer: process.env.JWT_ISS || 'faith-community-api',
      audience: process.env.JWT_AUD || 'faith-community-client'
    });
    
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

/**
 * Pusher authentication endpoint for user private channels
 * Verifies JWT token and authorizes access to private-user-{userId} channel
 */
export const authenticatePusher = async (req, res) => {
  try {
    const { socket_id, channel_name } = req.body;

    if (!socket_id || !channel_name) {
      return res.status(400).json({ error: 'socket_id and channel_name are required' });
    }

    // Verify the user is authenticated
    const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-env', {
      issuer: process.env.JWT_ISS || 'faith-community-api',
      audience: process.env.JWT_AUD || 'faith-community-client'
    });

    // Verify the channel name matches the user's ID
    const expectedChannel = `private-user-${decoded.id}`;
    if (channel_name !== expectedChannel) {
      return res.status(403).json({ error: 'Unauthorized channel access' });
    }

    // Import Pusher utility
    const { authenticateChannel } = await import('../../utils/pusher.js');
    const auth = authenticateChannel(socket_id, channel_name);

    if (!auth) {
      return res.status(500).json({ error: 'Failed to authenticate channel' });
    }

    res.json(auth);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('❌ Pusher authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

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
    console.error(`[getUserNotifications] Error fetching notifications for user_id ${req.user?.id}:`, error.message);
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

    const count = result[0].count;

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error(`[getUnreadNotificationCount] Error fetching unread count for user_id ${req.user?.id}:`, error.message);
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

export const createUserNotification = async (userId, type, title, message, section = null, relatedId = null) => {
  try {
    // Validate required parameters
    if (!userId || !type || !title || !message) {
      console.error('❌ createUserNotification: Missing required parameters', {
        userId: !!userId,
        type: !!type,
        title: !!title,
        message: !!message
      });
      return null;
    }

    const [result] = await db.execute(
      `INSERT INTO user_notifications (user_id, type, title, message, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, type, title, message]
    );
    
    if (result && result.insertId) {
      const notificationId = result.insertId;
      
      // Publish to Pusher for real-time delivery
      const channelName = `private-user-${userId}`;
      const notificationData = {
        id: notificationId,
        userId,
        type,
        title,
        message,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      await publishNotification(channelName, 'new-notification', notificationData);
      
      return notificationId;
    } else {
      console.error('❌ createUserNotification: Insert succeeded but no insertId returned', {
        userId,
        type,
        title
      });
      return null;
    }
  } catch (error) {
    console.error('❌ createUserNotification: Database error', {
      userId,
      type,
      title,
      error: error.message,
      code: error.code
    });
    return null;
  }
};

export const forgotPasswordUser = async (req, res) => {
  const { email } = req.body

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" })
  }

  try {
    const [userRows] = await db.query(
      'SELECT id, email FROM users WHERE email = ? AND role = \'user\'',
      [email]
    )

    if (userRows.length === 0) {
      return res.json({ message: "If an account with that email exists, a password reset link has been sent." })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await db.query(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expiresAt]
    )

    // URL encode the token to ensure proper handling across all email clients and browsers
    const encodedToken = encodeURIComponent(token);
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${encodedToken}&type=user`
    
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

export const resetPasswordUser = async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" })
  }

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
    const [tokenRows] = await db.execute(
      'SELECT email, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    )

    if (tokenRows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

    const tokenData = tokenRows[0]

    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    await db.execute(
      'UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE email = ? AND role = \'user\'',
      [hashedPassword, tokenData.email]
    )

    await db.execute(
      'DELETE FROM password_reset_tokens WHERE token = ?',
      [token]
    )

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

export const validateResetToken = async (req, res) => {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({ error: "Token is required" })
  }

  try {
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

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const [users] = await db.query(
      `SELECT u.password_hash, u.is_active, up.profile_photo_url 
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(400).json({ error: 'Account is already deactivated. Please contact support if you need assistance.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Incorrect password, please try again' });
    }

    if (user.profile_photo_url && typeof user.profile_photo_url === 'string' && user.profile_photo_url.trim() !== '') {
      try {
        const { deleteFromCloudinary, extractPublicIdFromUrl } = await import('../../utils/cloudinaryConfig.js');
        const publicId = extractPublicIdFromUrl(user.profile_photo_url);
        if (publicId) {
          await deleteFromCloudinary(publicId);
        }
      } catch (photoError) {
        // Continue with account deletion even if photo deletion fails
      }
    }

    await db.query(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    res.json({ 
      message: 'Your account has been permanently deleted',
      success: true 
    });

  } catch (error) {
    res.status(500).json({ error: 'An error occurred while deleting your account' });
  }
};

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

    const applicationsWithDates = await Promise.all(applications.map(async (application) => {
      let multipleDates = [];
      
      if (application.programStartDate && application.programEndDate) {
        if (application.programStartDate === application.programEndDate) {
          multipleDates = [application.programStartDate];
        } else {
          multipleDates = [application.programStartDate, application.programEndDate];
        }
      } else if (application.programStartDate) {
        multipleDates = [application.programStartDate];
      } else {
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
        programLocation: null,
        programStartDate: application.programStartDate,
        programEndDate: application.programEndDate,
        multiple_dates: application.multiple_dates,
        organizationId: application.organization_id,
        organizationName: application.organizationName,
        organizationAcronym: application.organizationAcronym,
        orgLogo: orgLogoUrl,
        reason: application.reason,
        status: application.status === 'Declined' ? 'rejected' : application.status.toLowerCase(),
        appliedAt: convertTimestampToISO(application.appliedAt),
        notes: application.reason,
        feedback: null
      };
    });

    res.json({
      success: true,
      applications: transformedApplications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

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
    
    let multipleDates = [];
    
    if (application.programStartDate && application.programEndDate) {
      if (application.programStartDate === application.programEndDate) {
        multipleDates = [application.programStartDate];
      } else {
        multipleDates = [application.programStartDate, application.programEndDate];
      }
    } else if (application.programStartDate) {
      multipleDates = [application.programStartDate];
    } else {
      const [dateRows] = await db.execute(
        'SELECT event_date FROM program_event_dates WHERE program_id = ? ORDER BY event_date ASC',
        [application.program_id]
      );
      multipleDates = dateRows.map(row => row.event_date);
    }
    
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
      multiple_dates: multipleDates,
      organizationId: application.organization_id,
      organizationName: application.organizationName,
      organizationAcronym: application.organizationAcronym,
      orgLogo: application.orgLogo,
      organizationColor: application.organizationColor,
      reason: application.reason,
      status: application.status === 'Declined' ? 'rejected' : application.status.toLowerCase(),
      appliedAt: convertTimestampToISO(application.appliedAt),
      updatedAt: convertTimestampToISO(application.updatedAt),
      notes: application.reason,
      feedback: null
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

    if (application.status === 'Approved') {
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

    if (application.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved applications can be marked as completed'
      });
    }

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
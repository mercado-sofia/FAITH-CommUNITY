import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

    // Insert new user
    const [result] = await promisePool.query(
      `INSERT INTO users (
        first_name, last_name, email, contact_number, gender, 
        address, birth_date, password, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [firstName, lastName, email, contactNumber, gender, address, birthDate, hashedPassword]
    );

    const userId = result.insertId;

    // Generate JWT token
    const token = jwt.sign(
      { userId, email, role: 'user' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        firstName,
        lastName,
        email,
        contactNumber,
        gender,
        address,
        birthDate
      }
    });

  } catch (error) {
    console.error('User registration error:', error);
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
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: 'user' },
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
        profilePhoto: user.profile_photo,
        occupation: user.occupation,
        citizenship: user.citizenship
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
    const userId = req.user.userId;

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
        profilePhoto: user.profile_photo,
        occupation: user.occupation,
        citizenship: user.citizenship,
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
    const userId = req.user.userId;
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

// Upload profile photo (temporarily disabled - Cloudinary integration needed)
export const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // TODO: Implement Cloudinary upload functionality
    // For now, return a placeholder response
    res.json({
      message: 'Profile photo upload functionality coming soon',
      profilePhoto: null
    });

  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const [users] = await promisePool.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await promisePool.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify JWT token middleware
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

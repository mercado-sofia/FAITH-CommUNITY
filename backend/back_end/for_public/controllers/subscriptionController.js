import db from '../../database.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// CREATE (subscribe) - for non-logged-in users
export const createSubscription = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  try {
    console.log('📧 Creating subscription for email:', email);
    
    // Check if already subscribed
    const [existingSub] = await db.execute(
      'SELECT id, is_verified, verified_at FROM subscribers WHERE email = ?',
      [email]
    );

    console.log('🔍 Existing subscriptions found:', existingSub);

    if (existingSub.length > 0) {
      if (existingSub[0].is_verified && existingSub[0].verified_at) {
        console.log('⚠️ Email already subscribed and verified');
        return res.status(400).json({ error: 'This email is already subscribed to our newsletter.' });
      } else {
        console.log('📬 Resending confirmation email for existing unverified subscription');
        // Resend confirmation email
        await sendConfirmationEmail(email, existingSub[0].verify_token);
        return res.status(200).json({
          message: 'Confirmation email sent! Please check your inbox to complete your subscription.',
        });
      }
    }

    // Generate verification tokens
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');

    console.log('🔑 Generated tokens - verify:', verifyToken.substring(0, 10) + '...', 'unsubscribe:', unsubscribeToken.substring(0, 10) + '...');

    // Insert new subscription - explicitly set is_verified to 0
    const [result] = await db.execute(
      `INSERT INTO subscribers (email, verify_token, unsubscribe_token, is_verified, created_at, verified_at) 
       VALUES (?, ?, ?, 0, NOW(), NULL)`,
      [email, verifyToken, unsubscribeToken]
    );

    console.log('💾 Subscription saved to database with ID:', result.insertId);
    
    // Verify the subscription was created with correct values
    const [verificationCheck] = await db.execute(
      'SELECT is_verified, verified_at FROM subscribers WHERE id = ?',
      [result.insertId]
    );
    
    if (verificationCheck.length > 0) {
      console.log('🔍 Verification check - is_verified:', verificationCheck[0].is_verified, 'verified_at:', verificationCheck[0].verified_at);
      
      // If somehow it's still verified, fix it
      if (verificationCheck[0].is_verified !== 0) {
        console.log('⚠️ Subscription was created as verified, fixing...');
        await db.execute(
          'UPDATE subscribers SET is_verified = 0, verified_at = NULL WHERE id = ?',
          [result.insertId]
        );
        console.log('✅ Subscription fixed to unverified state');
      }
    }

    // Send confirmation email
    console.log('📤 Sending confirmation email...');
    try {
      await sendConfirmationEmail(email, verifyToken);
      console.log('📧 Confirmation email sent successfully');
    } catch (emailError) {
      console.error('⚠️ Email sending failed, but subscription was created:', emailError);
      // Don't fail the subscription creation if email fails
      // The user can still confirm manually
    }

    console.log('✅ Subscription created successfully!');

    res.status(201).json({
      message: 'Subscription request received! Please check your email to complete your subscription.',
      id: result.insertId,
      verifyToken: verifyToken, // Temporarily include token for debugging
    });
  } catch (err) {
    console.error('❌ Subscription creation error:', err);
    res.status(500).json({ error: 'Failed to create subscription. Please try again.' });
  }
};

// Confirm subscription
export const confirmSubscription = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'Verification token is required.' });
  }

  try {
    console.log('🔍 Confirming subscription with token:', token);
    
    // Find subscription by verification token
    const [subscribers] = await db.execute(
      'SELECT id, email, is_verified, verified_at FROM subscribers WHERE verify_token = ?',
      [token]
    );

    console.log('📊 Found subscribers:', subscribers);

    if (subscribers.length === 0) {
      console.log('❌ No subscription found for token');
      return res.status(404).json({ error: 'Invalid or expired verification token.' });
    }

    const subscriber = subscribers[0];
    console.log('👤 Subscriber found:', subscriber);

    if (subscriber.is_verified && subscriber.verified_at) {
      console.log('⚠️ Subscription already verified');
      return res.status(400).json({ error: 'This subscription has already been confirmed.' });
    }

    console.log('✅ Marking subscription as verified...');
    
    // Mark as verified
    await db.execute(
      'UPDATE subscribers SET is_verified = 1, verified_at = NOW() WHERE id = ?',
      [subscriber.id]
    );

    console.log('🎉 Subscription confirmed successfully!');

    res.json({
      message: 'Subscription confirmed successfully! Welcome to our newsletter.',
      email: subscriber.email,
    });
  } catch (err) {
    console.error('❌ Subscription confirmation error:', err);
    res.status(500).json({ error: 'Failed to confirm subscription. Please try again.' });
  }
};

// Unsubscribe
export const unsubscribe = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ error: 'Unsubscribe token is required.' });
  }

  try {
    // Find subscription by unsubscribe token
    const [subscribers] = await db.execute(
      'SELECT id, email FROM subscribers WHERE unsubscribe_token = ?',
      [token]
    );

    if (subscribers.length === 0) {
      return res.status(404).json({ error: 'Invalid unsubscribe token.' });
    }

    // Delete subscription
    await db.execute('DELETE FROM subscribers WHERE id = ?', [subscribers[0].id]);

    res.json({
      message: 'Successfully unsubscribed from our newsletter.',
      email: subscribers[0].email,
    });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe. Please try again.' });
  }
};

// GET ALL subscriptions (for admin)
export const getAllSubscriptions = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM subscribers ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Debug endpoint to check subscribers table
export const debugSubscribers = async (req, res) => {
  try {
    console.log('🔍 Debug: Checking subscribers table...');
    
    // Check if table exists
    const [tables] = await db.execute('SHOW TABLES LIKE "subscribers"');
    console.log('📋 Tables found:', tables);
    
    if (tables.length === 0) {
      return res.status(404).json({ error: 'Subscribers table does not exist' });
    }
    
    // Check table structure
    const [columns] = await db.execute('DESCRIBE subscribers');
    console.log('🏗️ Table structure:', columns);
    
    // Count total subscriptions
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM subscribers');
    const total = countResult[0].total;
    console.log('📊 Total subscriptions:', total);
    
    // Get sample data
    const [sampleData] = await db.execute('SELECT * FROM subscribers LIMIT 5');
    console.log('📝 Sample data:', sampleData);
    
    res.json({
      tableExists: true,
      tableStructure: columns,
      totalSubscriptions: total,
      sampleData: sampleData
    });
  } catch (err) {
    console.error('❌ Debug error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Fix incorrectly verified subscriptions
export const fixSubscriptions = async (req, res) => {
  try {
    console.log('🔧 Fixing incorrectly verified subscriptions...');
    
    // Find subscriptions that are marked as verified but don't have verified_at timestamp
    const [incorrectSubs] = await db.execute(`
      SELECT id, email, is_verified, verified_at 
      FROM subscribers 
      WHERE is_verified = 1 AND verified_at IS NULL
    `);
    
    console.log('📊 Found incorrectly verified subscriptions:', incorrectSubs);
    
    if (incorrectSubs.length > 0) {
      // Reset them to unverified
      await db.execute(`
        UPDATE subscribers 
        SET is_verified = 0 
        WHERE is_verified = 1 AND verified_at IS NULL
      `);
      
      console.log(`✅ Fixed ${incorrectSubs.length} incorrectly verified subscriptions`);
    }
    
    // Also check for any subscriptions that might have been created by the public system
    // but got marked as verified by the user system
    const [publicSubs] = await db.execute(`
      SELECT id, email, is_verified, verified_at, created_at
      FROM subscribers 
      WHERE verified_at IS NOT NULL 
      AND TIMESTAMPDIFF(SECOND, created_at, verified_at) < 60
    `);
    
    console.log('📊 Found potentially auto-verified public subscriptions:', publicSubs);
    
    if (publicSubs.length > 0) {
      // Reset these to unverified as they were likely auto-verified
      await db.execute(`
        UPDATE subscribers 
        SET is_verified = 0, verified_at = NULL
        WHERE verified_at IS NOT NULL 
        AND TIMESTAMPDIFF(SECOND, created_at, verified_at) < 60
      `);
      
      console.log(`✅ Fixed ${publicSubs.length} auto-verified public subscriptions`);
    }
    
    const totalFixed = incorrectSubs.length + publicSubs.length;
    
    res.json({
      message: `Fixed ${totalFixed} incorrectly verified subscriptions`,
      fixedSubscriptions: [...incorrectSubs, ...publicSubs]
    });
  } catch (err) {
    console.error('❌ Fix subscriptions error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Helper function to send confirmation email
async function sendConfirmationEmail(email, verifyToken) {
  const confirmationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/newsletter/confirm/${verifyToken}`;
  const unsubscribeUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/newsletter/unsubscribe/${verifyToken}`;

  const mailOptions = {
    from: `"FAITH CommUNITY" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Confirm Your Newsletter Subscription - FAITH CommUNITY',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1A685B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">FAITH CommUNITY</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Newsletter Subscription Confirmation</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Welcome to FAITH CommUNITY!</h2>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Thank you for subscribing to our newsletter! We're excited to keep you updated on our programs, 
            volunteer opportunities, and stories that make a difference in our community.
          </p>
          
          <p style="color: #555; line-height: 1.6; margin-bottom: 30px;">
            To complete your subscription, please click the button below to confirm your email address:
          </p>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${confirmationUrl}" 
               style="background-color: #1A685B; color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 5px; display: inline-block; font-weight: bold;">
              Confirm Subscription
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            If the button doesn't work, you can copy and paste this link into your browser:<br>
            <a href="${confirmationUrl}" style="color: #1A685B;">${confirmationUrl}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; line-height: 1.4;">
            If you didn't request this subscription, you can safely ignore this email or 
            <a href="${unsubscribeUrl}" style="color: #1A685B;">unsubscribe here</a>.
          </p>
          
          <p style="color: #666; font-size: 12px; line-height: 1.4;">
            This confirmation link will expire in 24 hours for security reasons.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${email}`);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw new Error('Failed to send confirmation email');
  }
}

import 'dotenv/config';
import db from '../src/database.js';
import bcrypt from 'bcrypt';

/**
 * Script to find and reset an admin password
 * Usage: 
 *   node scripts/resetAdminPassword.js <email>                    - Find admin info
 *   node scripts/resetAdminPassword.js <email> <newPassword>        - Reset password
 */

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email) {
  console.error('❌ Error: Email is required');
  console.log('Usage:');
  console.log('  node scripts/resetAdminPassword.js <email>                    - Find admin info');
  console.log('  node scripts/resetAdminPassword.js <email> <newPassword>      - Reset password');
  process.exit(1);
}

if (newPassword && newPassword.length < 6) {
  console.error('❌ Error: Password must be at least 6 characters long');
  process.exit(1);
}

async function resetAdminPassword() {
  try {
    console.log(`\n🔍 Looking for admin with email: ${email}\n`);

    // Find admin by email
    const [adminRows] = await db.execute(
      'SELECT id, email, is_active, organization_id, created_at FROM admins WHERE email = ?',
      [email]
    );

    if (adminRows.length === 0) {
      console.error(`❌ Admin with email "${email}" not found in the database`);
      console.log('\n💡 Tip: Make sure the email is correct and the admin exists.');
      process.exit(1);
    }

    const admin = adminRows[0];
    console.log('✅ Admin found:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Active: ${admin.is_active ? 'Yes' : 'No'}`);
    console.log(`   Organization ID: ${admin.organization_id || 'N/A'}`);
    console.log(`   Created: ${admin.created_at}\n`);

    if (!newPassword) {
      console.log('ℹ️  To reset the password, run:');
      console.log(`   node scripts/resetAdminPassword.js ${email} <newPassword>\n`);
      process.exit(0);
    }

    if (!admin.is_active) {
      console.warn('⚠️  Warning: This admin account is inactive!');
      console.log('   The password will be reset, but the account will remain inactive.\n');
    }

    console.log('🔄 Resetting password...\n');

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password
    await db.execute(
      'UPDATE admins SET password = ?, password_changed_at = NOW(), updated_at = NOW() WHERE id = ?',
      [hashedPassword, admin.id]
    );

    console.log('✅ Password has been reset successfully!');
    console.log(`\n📧 Admin ${email} can now log in with the new password.`);
    console.log(`   New password: ${newPassword}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resetAdminPassword();


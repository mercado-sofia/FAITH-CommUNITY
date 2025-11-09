#!/usr/bin/env node
/**
 * SMTP Connection Test Script
 * 
 * This script tests your SMTP configuration by:
 * 1. Verifying the connection
 * 2. Sending a test email (optional)
 * 
 * Usage:
 *   cd backend
 *   node scripts/test-smtp.js
 *   node scripts/test-smtp.js --send=test@example.com
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables FIRST, before importing mailer
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function testSMTP() {
  // Import mailer after .env is loaded (dynamic import)
  const { verifySMTPConnection, sendMail, getSMTPStatus } = await import('../src/utils/mailer.js');
  
  // Check if using SendGrid API instead of SMTP
  const useSendGridAPI = process.env.USE_SENDGRID_API === 'true';
  const apiKey = process.env.SMTP_PASS?.trim() || process.env.SENDGRID_API_KEY?.trim();
  
  if (useSendGridAPI) {
    console.log('🔍 Testing SendGrid API Configuration...\n');
    
    if (!apiKey) {
      console.error('❌ SendGrid API key is not configured.');
      console.error('   Please set SMTP_PASS or SENDGRID_API_KEY in your .env file');
      console.error('   Make sure you\'re running this from the backend directory');
      process.exit(1);
    }
    
    console.log('📋 Configuration Status:');
    console.log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`   From: ${process.env.MAIL_FROM || 'Not set (will use default)'}`);
    console.log(`   Configured: ✅`);
    
    // Check if user wants to send a test email
    const sendTo = process.argv.find(arg => arg.startsWith('--send='))?.split('=')[1];
    
    if (sendTo) {
      console.log(`\n📧 Sending test email via SendGrid API to ${sendTo}...`);
      try {
        await sendMail({
          to: sendTo,
          subject: 'FAITH CommUNITY - SendGrid API Test Email',
          html: `
            <h2>SendGrid API Test Email</h2>
            <p>This is a test email from FAITH CommUNITY sent via SendGrid API.</p>
            <p>If you received this email, your SendGrid API configuration is working correctly! ✅</p>
            <p><small>Sent at: ${new Date().toISOString()}</small></p>
          `,
          text: 'This is a test email from FAITH CommUNITY sent via SendGrid API. If you received this email, your SendGrid API configuration is working correctly!',
        });
        console.log('✅ Test email sent successfully via SendGrid API!');
        console.log(`   Check the inbox for: ${sendTo}`);
        process.exit(0);
      } catch (emailError) {
        console.error('❌ Failed to send test email:', emailError.message);
        if (emailError.response) {
          console.error('   Response:', JSON.stringify(emailError.response.body, null, 2));
        }
        process.exit(1);
      }
    } else {
      console.log('\n💡 Tip: To send a test email, run:');
      console.log('   node scripts/test-smtp.js --send=your-email@example.com');
      process.exit(0);
    }
  } else {
    // SMTP mode
    console.log('🔍 Testing SMTP Configuration...\n');
    
    // Check configuration
    const status = getSMTPStatus();
    console.log('📋 Configuration Status:');
    console.log(`   Host: ${status.host}`);
    console.log(`   Port: ${status.port}`);
    console.log(`   User: ${status.user}`);
    console.log(`   Configured: ${status.configured ? '✅' : '❌'}`);
    
    if (!status.configured) {
      console.error('\n❌ SMTP is not configured. Missing:', status.missing.join(', '));
      console.error('   Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file');
      console.error('   Make sure you\'re running this from the backend directory');
      console.error('\n💡 Tip: If SMTP is blocked, try using SendGrid API instead:');
      console.error('   Set USE_SENDGRID_API=true in your .env file');
      process.exit(1);
    }
    
    console.log('\n🔌 Testing SMTP Connection...');
    console.log('   This may take up to 60 seconds...\n');
    
    try {
      const verified = await verifySMTPConnection(0); // No retries for manual test
      
      if (verified) {
        console.log('\n✅ SMTP connection verified successfully!');
        
        // Check if user wants to send a test email
        const sendTo = process.argv.find(arg => arg.startsWith('--send='))?.split('=')[1];
        
        if (sendTo) {
          console.log(`\n📧 Sending test email to ${sendTo}...`);
          try {
            await sendMail({
              to: sendTo,
              subject: 'FAITH CommUNITY - SMTP Test Email',
              html: `
                <h2>SMTP Test Email</h2>
                <p>This is a test email from FAITH CommUNITY.</p>
                <p>If you received this email, your SMTP configuration is working correctly! ✅</p>
                <p><small>Sent at: ${new Date().toISOString()}</small></p>
              `,
              text: 'This is a test email from FAITH CommUNITY. If you received this email, your SMTP configuration is working correctly!',
            });
            console.log('✅ Test email sent successfully!');
            console.log(`   Check the inbox for: ${sendTo}`);
          } catch (emailError) {
            console.error('❌ Failed to send test email:', emailError.message);
            process.exit(1);
          }
        } else {
          console.log('\n💡 Tip: To send a test email, run:');
          console.log('   node scripts/test-smtp.js --send=your-email@example.com');
        }
        
        process.exit(0);
      } else {
        console.error('\n❌ SMTP verification failed');
        console.error('\n💡 Troubleshooting tips:');
        console.error('   1. Check your .env file has correct SMTP settings');
        console.error('   2. For Gmail, make sure you\'re using an App Password');
        console.error('   3. Try port 465: Set SMTP_PORT=465 in .env');
        console.error('   4. Check Windows Firewall/Antivirus settings');
        console.error('   5. Try a different network (some ISPs block SMTP)');
        console.error('   6. Enable debug mode: Set SMTP_DEBUG=true in .env');
        console.error('   7. Skip verification in development: Set SMTP_SKIP_VERIFY=true');
        console.error('\n💡 Alternative: If SMTP is blocked, use SendGrid API instead:');
        console.error('   Set USE_SENDGRID_API=true in your .env file');
        process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ SMTP test failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the test
testSMTP().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});


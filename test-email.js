/**
 * Test script to verify Mailtrap email configuration
 * Run with: node test-email.js
 */

require('dotenv').config();
const { sendPasswordResetEmail } = require('./app/services/emailService');

async function testEmail() {
  console.log('🧪 Testing Mailtrap Email Configuration...\n');

  // Check environment variables
  console.log('📋 Checking configuration:');
  console.log(`   MAILTRAP_HOST: ${process.env.MAILTRAP_HOST || '❌ NOT SET'}`);
  console.log(`   MAILTRAP_PORT: ${process.env.MAILTRAP_PORT || '❌ NOT SET'}`);
  console.log(`   MAILTRAP_USER: ${process.env.MAILTRAP_USER ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   MAILTRAP_PASS: ${process.env.MAILTRAP_PASS ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || '❌ NOT SET'}\n`);

  if (!process.env.MAILTRAP_USER || !process.env.MAILTRAP_PASS) {
    console.error('❌ ERROR: Mailtrap credentials are missing!');
    console.error('\n📝 To fix this:');
    console.error('1. Go to https://mailtrap.io');
    console.error('2. Get your SMTP credentials (Email Testing → Inboxes → SMTP Settings)');
    console.error('3. Add them to your .env file:');
    console.error('   MAILTRAP_USER=your_username');
    console.error('   MAILTRAP_PASS=your_password');
    process.exit(1);
  }

  // Test email sending
  const testEmail = process.argv[2] || 'test@example.com';
  const testToken = 'test-token-1234567890abcdef';

  console.log(`📧 Attempting to send test email to: ${testEmail}`);
  console.log('   (This will appear in your Mailtrap inbox, not your real email)\n');

  try {
    await sendPasswordResetEmail(testEmail, testToken);
    console.log('\n✅ SUCCESS! Email sent successfully!');
    console.log('\n📬 Next steps:');
    console.log('1. Go to https://mailtrap.io');
    console.log('2. Navigate to: Email Testing → Inboxes');
    console.log('3. Click on your inbox');
    console.log('4. You should see the test email there\n');
  } catch (error) {
    console.error('\n❌ ERROR: Failed to send email');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('not configured')) {
      console.error('💡 Solution: Add Mailtrap credentials to .env file');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      console.error('💡 Solution: Check your internet connection and Mailtrap host/port');
    } else if (error.message.includes('Invalid login') || error.message.includes('Authentication')) {
      console.error('💡 Solution: Verify your Mailtrap username and password are correct');
    } else {
      console.error('💡 Check the error message above for details');
    }
    
    process.exit(1);
  }
}

testEmail().catch(console.error);

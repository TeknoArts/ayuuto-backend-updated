/**
 * Test script to send OTP email
 * Run with: node test-otp-email.js your-email@gmail.com
 */

require('dotenv').config();
const { sendPasswordResetEmail } = require('./app/services/emailService');

async function testOTPEmail() {
  const email = process.argv[2] || 'technoarts104@gmail.com';
  const testOTP = '12345';

  console.log('🧪 Testing OTP Email Sending...\n');
  console.log(`📧 Sending OTP email to: ${email}`);
  console.log(`   OTP Code: ${testOTP}\n`);

  try {
    await sendPasswordResetEmail(email, testOTP);
    console.log('\n✅ SUCCESS! OTP email sent successfully!');
    console.log('\n📬 Next steps:');
    console.log('1. Check your email inbox:', email);
    console.log('2. Check spam/junk folder');
    console.log('3. Look for email with subject: "Your Ayuuto Password Reset OTP"');
    console.log('4. The OTP should be displayed prominently in the email\n');
  } catch (error) {
    console.error('\n❌ ERROR: Failed to send OTP email');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('not configured')) {
      console.error('💡 Solution: Configure SendGrid, Gmail, or Mailtrap in .env file');
    } else if (error.message.includes('Sender')) {
      console.error('💡 Solution: Verify your sender email in SendGrid dashboard');
      console.error('   Go to: https://app.sendgrid.com/settings/sender_auth');
    } else {
      console.error('💡 Check the error message above for details');
    }
    
    process.exit(1);
  }
}

testOTPEmail().catch(console.error);

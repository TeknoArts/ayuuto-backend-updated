/**
 * Extract Email Configuration for Deployment
 * 
 * This script reads your .env file and shows what email variables
 * you need to add to your production environment.
 */

require('dotenv').config();

console.log('📧 Email Configuration for Deployment');
console.log('='.repeat(60));
console.log('');

// Check SendGrid
if (process.env.SENDGRID_API_KEY) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const isPlaceholder = apiKey.includes('your_') || apiKey.includes('placeholder') || apiKey.length < 10;
  
  console.log('✅ SendGrid Configuration Found:');
  console.log(`   SENDGRID_API_KEY: ${isPlaceholder ? '⚠️  PLACEHOLDER (needs real value)' : '✅ Valid'}`);
  if (!isPlaceholder) {
    console.log(`   Value: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
  }
  console.log('');
  
  if (process.env.SENDGRID_FROM_EMAIL) {
    console.log(`   SENDGRID_FROM_EMAIL: ${process.env.SENDGRID_FROM_EMAIL}`);
  } else {
    console.log(`   SENDGRID_FROM_EMAIL: ⚠️  Not set (will use default: technoarts104@gmail.com)`);
  }
  console.log('');
} else {
  console.log('❌ SENDGRID_API_KEY: Not found in .env');
  console.log('');
}

// Check Gmail
if (process.env.GMAIL_USER) {
  const isPlaceholder = process.env.GMAIL_USER.includes('your-email') || process.env.GMAIL_USER.includes('placeholder');
  console.log('✅ Gmail Configuration Found:');
  console.log(`   GMAIL_USER: ${isPlaceholder ? '⚠️  PLACEHOLDER' : process.env.GMAIL_USER}`);
  if (process.env.GMAIL_APP_PASSWORD) {
    const pwdPlaceholder = process.env.GMAIL_APP_PASSWORD.includes('your_') || process.env.GMAIL_APP_PASSWORD.includes('placeholder');
    console.log(`   GMAIL_APP_PASSWORD: ${pwdPlaceholder ? '⚠️  PLACEHOLDER' : '✅ Set'}`);
  } else {
    console.log(`   GMAIL_APP_PASSWORD: ❌ Not set`);
  }
  console.log('');
} else {
  console.log('❌ Gmail Configuration: Not found in .env');
  console.log('');
}

// Check Mailtrap
if (process.env.MAILTRAP_USER) {
  console.log('✅ Mailtrap Configuration Found:');
  console.log(`   MAILTRAP_HOST: ${process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io'}`);
  console.log(`   MAILTRAP_PORT: ${process.env.MAILTRAP_PORT || '2525'}`);
  console.log(`   MAILTRAP_USER: ${process.env.MAILTRAP_USER}`);
  console.log(`   MAILTRAP_PASS: ${process.env.MAILTRAP_PASS ? '✅ Set' : '❌ Not set'}`);
  console.log('');
} else {
  console.log('❌ Mailtrap Configuration: Not found in .env');
  console.log('');
}

// Generate deployment variables
console.log('📋 Variables to Add to Production:');
console.log('='.repeat(60));
console.log('');

if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.includes('your_') && process.env.SENDGRID_API_KEY.length > 10) {
  console.log('1. SENDGRID_API_KEY');
  console.log(`   Value: ${process.env.SENDGRID_API_KEY}`);
  console.log('');
  
  if (process.env.SENDGRID_FROM_EMAIL) {
    console.log('2. SENDGRID_FROM_EMAIL');
    console.log(`   Value: ${process.env.SENDGRID_FROM_EMAIL}`);
    console.log('');
  } else {
    console.log('2. SENDGRID_FROM_EMAIL (optional)');
    console.log('   Value: technoarts104@gmail.com (or your verified email)');
    console.log('');
  }
} else if (process.env.GMAIL_USER && !process.env.GMAIL_USER.includes('your-email') && process.env.GMAIL_APP_PASSWORD && !process.env.GMAIL_APP_PASSWORD.includes('your_')) {
  console.log('1. GMAIL_USER');
  console.log(`   Value: ${process.env.GMAIL_USER}`);
  console.log('');
  console.log('2. GMAIL_APP_PASSWORD');
  console.log(`   Value: ${process.env.GMAIL_APP_PASSWORD}`);
  console.log('');
} else if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
  console.log('1. MAILTRAP_HOST');
  console.log(`   Value: ${process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io'}`);
  console.log('');
  console.log('2. MAILTRAP_PORT');
  console.log(`   Value: ${process.env.MAILTRAP_PORT || '2525'}`);
  console.log('');
  console.log('3. MAILTRAP_USER');
  console.log(`   Value: ${process.env.MAILTRAP_USER}`);
  console.log('');
  console.log('4. MAILTRAP_PASS');
  console.log(`   Value: ${process.env.MAILTRAP_PASS}`);
  console.log('');
} else {
  console.log('⚠️  No valid email configuration found in .env file!');
  console.log('');
  console.log('Please set up one of these in your .env file:');
  console.log('   - SENDGRID_API_KEY (recommended for production)');
  console.log('   - GMAIL_USER and GMAIL_APP_PASSWORD');
  console.log('   - MAILTRAP_USER and MAILTRAP_PASS');
  console.log('');
}

console.log('📝 Instructions:');
console.log('   1. Go to your hosting dashboard (e.g. DigitalOcean) → Environment Variables');
console.log('   2. Add each variable above');
console.log('   3. Copy the Key and Value from above');
console.log('   4. Redeploy your application');
console.log('');

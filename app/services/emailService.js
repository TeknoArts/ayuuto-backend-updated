const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create reusable transporter object for SMTP services (Mailtrap, Gmail)
const createSMTPTransporter = () => {
  // Check if Gmail is configured
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('📧 Using Gmail SMTP for email delivery');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  
  // Fallback to Mailtrap (for testing or real emails)
  if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
    const mailtrapHost = process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io';
    const isRealEmail = mailtrapHost === 'smtp.mailtrap.io';
    
    if (isRealEmail) {
      console.log('📧 Using Mailtrap Email Testing (sends REAL emails)');
    } else {
      console.log('📧 Using Mailtrap Sandbox (testing only - emails NOT sent to users)');
    }
    
    return nodemailer.createTransport({
      host: mailtrapHost,
      port: parseInt(process.env.MAILTRAP_PORT || '2525'),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  return null;
};

/**
 * Send email using SendGrid API (preferred for production)
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} [options.text] - Plain text email body (optional)
 * @returns {Promise<Object>} - Promise that resolves with email info
 */
const sendEmailViaSendGrid = async ({ to, subject, html, text }) => {
  // Use verified sender email - change to noreply@ayuuto.com after verification
  const senderEmail = process.env.SENDGRID_FROM_EMAIL || 'technoarts104@gmail.com';
  
  const msg = {
    to,
    from: senderEmail, // Use verified sender email
    subject,
    text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    html,
  };

  console.log(`📧 [SendGrid] Sending email to: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   From: ${msg.from}`);

  try {
    const response = await sgMail.send(msg);

    console.log(`✅ [SendGrid] Email sent successfully!`);
    console.log(`   Status Code: ${response[0].statusCode}`);
    console.log(`   Message ID: ${response[0].headers['x-message-id'] || 'N/A'}`);
    console.log(`   Recipient: ${to}`);

    return response;
  } catch (error) {
    // Enhanced error handling for SendGrid errors
    console.error(`❌ [SendGrid] Error sending email to ${to}:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Error Code: ${error.code || 'N/A'}`);
    
    // Check error code (SendGrid uses error.code for status codes)
    const statusCode = error.code || error.response?.statusCode;
    
    if (error.response) {
      const { body } = error.response;
      console.error(`   Status Code: ${statusCode}`);
      if (body) {
        console.error(`   Response Body:`, JSON.stringify(body, null, 2));
      }
    }
    
    // Provide helpful error messages based on status code
    if (statusCode === 401 || error.code === 401) {
      const errorMsg = `SendGrid Authentication Error (401): Invalid or missing API key.\n\n` +
        `To fix this:\n` +
        `1. Go to: https://app.sendgrid.com/settings/api_keys\n` +
        `2. Create a new API key with "Full Access" or "Mail Send" permissions\n` +
        `3. Copy the API key (you'll only see it once!)\n` +
        `4. Update your .env file: SENDGRID_API_KEY=your_actual_api_key_here\n` +
        `5. Restart your backend server\n\n` +
        `Current .env value: ${process.env.SENDGRID_API_KEY ? 'Set (but invalid)' : 'NOT SET'}`;
      throw new Error(errorMsg);
    } else if (statusCode === 403 || error.code === 403 || error.message.includes('Forbidden')) {
      const errorMsg = `SendGrid Forbidden Error: The sender email "${senderEmail}" is not verified in SendGrid.\n\n` +
        `To fix this:\n` +
        `1. Go to: https://app.sendgrid.com/settings/sender_auth\n` +
        `2. Click "Verify a Single Sender"\n` +
        `3. Enter: ${senderEmail}\n` +
        `4. Fill in all required fields\n` +
        `5. Verify the email address\n` +
        `6. Wait for SendGrid approval\n\n` +
        `Alternatively, verify your domain "ayuuto.com" for better deliverability.`;
      throw new Error(errorMsg);
    } else if (statusCode === 400 || error.code === 400) {
      const errors = error.response?.body?.errors || [];
      const errorDetails = errors.map(e => `- ${e.field || 'Unknown'}: ${e.message || 'Unknown error'}`).join('\n');
      throw new Error(`SendGrid Validation Error:\n${errorDetails || error.message}`);
    }
    
    // Re-throw with original error if we can't provide better context
    throw error;
  }
};

/**
 * Send email using SMTP (Nodemailer - for Mailtrap/Gmail)
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} [options.text] - Plain text email body (optional)
 * @returns {Promise<Object>} - Promise that resolves with email info
 */
const sendEmailViaSMTP = async ({ to, subject, html, text }) => {
  const transporter = createSMTPTransporter();
  
  if (!transporter) {
    throw new Error('No SMTP service configured');
  }

  // Use verified sender email - change to noreply@ayuuto.com after verification
  const senderEmail = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || 'technoarts104@gmail.com';
  
  const mailOptions = {
    from: senderEmail, // Use verified sender email
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
  };

  console.log(`📧 [SMTP] Sending email to: ${to}`);
  console.log(`   Subject: ${subject}`);

  const info = await transporter.sendMail(mailOptions);

  console.log(`✅ [SMTP] Email sent successfully!`);
  console.log(`   Message ID: ${info.messageId}`);
  console.log(`   Response: ${info.response}`);

  return info;
};

/**
 * Send email - automatically chooses best available service
 * Priority: SendGrid > Gmail > Mailtrap
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} [options.text] - Plain text email body (optional)
 * @returns {Promise<Object>} - Promise that resolves with email info
 */
exports.sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Priority 1: SendGrid (best for production)
    // Only use SendGrid if API key is set AND not a placeholder
    if (process.env.SENDGRID_API_KEY && 
        process.env.SENDGRID_API_KEY !== 'your_sendgrid_api_key_here' &&
        process.env.SENDGRID_API_KEY.trim().length > 10) {
      try {
        return await sendEmailViaSendGrid({ to, subject, html, text });
      } catch (sendGridError) {
        // If SendGrid fails (401, etc.), fall back to other services
        console.warn('⚠️ [Email] SendGrid failed, falling back to alternative email service...');
        console.warn(`   Error: ${sendGridError.message}`);
      }
    }

    // Priority 2: Gmail SMTP
    if (process.env.GMAIL_USER && 
        process.env.GMAIL_APP_PASSWORD &&
        process.env.GMAIL_USER !== 'your-email@gmail.com' &&
        process.env.GMAIL_APP_PASSWORD !== 'your_16_character_app_password') {
      return await sendEmailViaSMTP({ to, subject, html, text });
    }

    // Priority 3: Mailtrap (for testing)
    if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
      return await sendEmailViaSMTP({ to, subject, html, text });
    }

    // No email service configured
    console.error('❌ Email service not configured.');
    console.error('   For SendGrid: Set SENDGRID_API_KEY in .env (currently invalid/placeholder)');
    console.error('   For Gmail: Set GMAIL_USER and GMAIL_APP_PASSWORD in .env (currently placeholder)');
    console.error('   For Mailtrap: Set MAILTRAP_USER and MAILTRAP_PASS in .env');
    throw new Error('Email service not configured. Please set up Gmail SMTP or SendGrid in .env file.');
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

/**
 * Send password reset email with OTP
 * @param {string} email - User email address
 * @param {string} otp - 5-digit OTP code
 * @returns {Promise<Object>} - Promise that resolves with email info
 */
exports.sendPasswordResetEmail = async (email, otp) => {
  const subject = 'Your Ayuuto Password Reset OTP';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #FFD700;
          letter-spacing: 2px;
          margin-bottom: 10px;
        }
        .tagline {
          font-size: 12px;
          color: #666;
          letter-spacing: 1px;
        }
        h1 {
          color: #1b1b3d;
          font-size: 24px;
          margin-bottom: 20px;
        }
        p {
          color: #555;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .reset-button {
          display: inline-block;
          background-color: #4CAF50;
          color: #ffffff;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        .reset-button:hover {
          background-color: #45a049;
        }
        .reset-link {
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
          margin: 20px 0;
          word-break: break-all;
          font-family: monospace;
          font-size: 12px;
          color: #333;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 12px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning-text {
          color: #856404;
          font-size: 14px;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AYUUTO</div>
          <div class="tagline">ORGANIZE WITH TRUST, CELEBRATE TOGETHER.</div>
        </div>
        
        <h1>Reset Your Password</h1>
        
        <p>Hello,</p>
        
        <p>We received a request to reset your password for your Ayuuto account. If you didn't make this request, you can safely ignore this email.</p>
        
        <p><strong>Your password reset OTP code is:</strong></p>
        
        <div style="background-color: #f0f7ff; border: 3px solid #4CAF50; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
          <p style="margin: 0 0 15px 0; font-size: 16px; color: #666; font-weight: bold;">Enter this code in the app:</p>
          <p style="margin: 0; font-size: 48px; font-weight: bold; color: #1b1b3d; letter-spacing: 8px; font-family: monospace;">${otp}</p>
        </div>
        
        <p style="margin-top: 20px;"><strong>Instructions:</strong></p>
        <ol style="color: #555; font-size: 14px; line-height: 1.8;">
          <li>Open the Ayuuto app on your device</li>
          <li>Enter the 5-digit OTP code shown above</li>
          <li>After verification, you'll be able to create a new password</li>
        </ol>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Important:</strong> This OTP will expire in 10 minutes. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
        
        <div style="background-color: #e3f2fd; border-left: 4px solid #2196F3; padding: 12px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #1565C0; font-size: 14px;">
            <strong>🔒 Security:</strong> Never share this OTP with anyone. Ayuuto staff will never ask for your OTP.
          </p>
        </div>
        
        <p>If you continue to have problems, please contact our support team.</p>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Ayuuto. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return exports.sendEmail({
    to: email,
    subject,
    html,
  });
};

/**
 * Send welcome email
 * @param {string} email - User email address
 * @param {string} name - User name
 * @returns {Promise<Object>} - Promise that resolves with email info
 */
exports.sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to Ayuuto!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Ayuuto</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #FFD700;
          letter-spacing: 2px;
          margin-bottom: 10px;
        }
        .tagline {
          font-size: 12px;
          color: #666;
          letter-spacing: 1px;
        }
        h1 {
          color: #1b1b3d;
          font-size: 24px;
          margin-bottom: 20px;
        }
        p {
          color: #555;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AYUUTO</div>
          <div class="tagline">ORGANIZE WITH TRUST, CELEBRATE TOGETHER.</div>
        </div>
        
        <h1>Welcome to Ayuuto, ${name}!</h1>
        
        <p>Thank you for joining Ayuuto! We're excited to have you on board.</p>
        
        <p>With Ayuuto, you can:</p>
        <ul>
          <li>Create and manage savings groups</li>
          <li>Track payments and collections</li>
          <li>Stay organized with automated reminders</li>
          <li>Build trust within your community</li>
        </ul>
        
        <p>Get started by creating your first group and invite your friends to join!</p>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Ayuuto. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return exports.sendEmail({
    to: email,
    subject,
    html,
  });
};

/**
 * Send group invitation email
 * @param {string} participantEmail - Participant email address
 * @param {string} participantName - Participant name
 * @param {string} groupName - Group name
 * @param {string} adminName - Admin/creator name who added them
 * @returns {Promise<Object>} - Promise that resolves with email info
 */
exports.sendGroupInvitationEmail = async (participantEmail, participantName, groupName, adminName, groupId = null, shareCode = null) => {
  const subject = `You've been added to ${groupName} on Ayuuto`;
  
  // Generate view group URL using shareCode
  // View Group button in emails must point to the public web view (DigitalOcean).
  // Priority: VIEW_GROUP_BASE_URL > BACKEND_URL > FRONTEND_URL > DigitalOcean default
  const DIGITALOCEAN_VIEW_URL = 'http://104.248.117.205';
  const viewGroupBaseUrl = process.env.VIEW_GROUP_BASE_URL || process.env.BACKEND_URL || process.env.FRONTEND_URL || DIGITALOCEAN_VIEW_URL;
  
  const localPort = process.env.PORT || 5001;
  
  // Legacy baseUrl for fallbacks - prioritize BACKEND_URL for production
  let baseUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL;
  
  // Auto-detect Railway URL (check multiple ways Railway exposes it)
  if (!baseUrl) {
    // Check for Railway environment variables
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN || 
                          process.env.RAILWAY_STATIC_URL ||
                          process.env.RAILWAY_TUNNEL_URL;
    
    if (railwayDomain) {
      // Railway provides domain, ensure it has https://
      baseUrl = railwayDomain.startsWith('http') ? railwayDomain : `https://${railwayDomain}`;
      console.log(`[Email] ✅ Auto-detected Railway URL: ${baseUrl}`);
    } else if (process.env.RAILWAY_ENVIRONMENT) {
      // We're on Railway but no domain set - use known Railway URL
      // This is a fallback - ideally BACKEND_URL should be set
      baseUrl = 'https://web-production-40b9d.up.railway.app';
      console.log(`[Email] ⚠️  Using default Railway URL (set BACKEND_URL in Railway for reliability): ${baseUrl}`);
    }
  }
  
  // Also check for other hosting platforms
  if (!baseUrl) {
    const host = process.env.RENDER_EXTERNAL_URL || 
                 process.env.HEROKU_APP_NAME;
    if (host) {
      baseUrl = host.startsWith('http') ? host : `https://${host}`;
      console.log(`[Email] Auto-detected production URL from platform: ${baseUrl}`);
    }
  }
  
  // Final check: if we're on Railway (detected by environment) but no URL, use default
  if (!baseUrl && (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME)) {
    baseUrl = 'https://web-production-40b9d.up.railway.app';
    console.log(`[Email] ⚠️  WARNING: No BACKEND_URL set! Using default Railway URL: ${baseUrl}`);
    console.log(`[Email] 💡 Set BACKEND_URL=https://web-production-40b9d.up.railway.app in Railway Variables for reliability`);
  }
  
  // If baseUrl contains localhost, this is a configuration error in production
  if (baseUrl && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[Email] ⚠️  ERROR: Base URL contains localhost in production: ${baseUrl}. Set BACKEND_URL to your production domain!`);
    } else {
      // Development: replace localhost with network IP
      const localIP = process.env.LOCAL_SERVER_IP || '192.168.18.126';
      console.warn(`[Email] ⚠️  Base URL contains localhost, replacing with network IP: ${baseUrl}`);
      baseUrl = baseUrl.replace(/localhost|127\.0\.0\.1/g, localIP);
    }
  }
  
  // If baseUrl contains port 3000 (common frontend port), replace with backend port
  if (baseUrl && baseUrl.includes(':3000')) {
    console.warn(`[Email] ⚠️  Base URL contains port 3000 (frontend), replacing with backend port ${localPort}: ${baseUrl}`);
    baseUrl = baseUrl.replace(/:3000/g, `:${localPort}`);
  }
  
  // Development fallback: use local network IP (ONLY if not on Railway)
  if (!baseUrl && !process.env.RAILWAY_ENVIRONMENT && !process.env.RAILWAY_SERVICE_NAME) {
    const localIP = process.env.LOCAL_SERVER_IP || '192.168.18.126';
    baseUrl = `http://${localIP}:${localPort}`;
    console.log(`[Email] Using development URL: ${baseUrl}`);
  }
  
  // Safety check: NEVER use local IP in emails if we're on Railway
  if (baseUrl && (baseUrl.includes('192.168.') || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME) {
      console.error(`[Email] ❌ ERROR: Local IP detected on Railway! Overriding with Railway URL.`);
      baseUrl = 'https://web-production-40b9d.up.railway.app';
    }
  }
  
  // Generate view group URL - always use DigitalOcean URL for View Group button
  let viewGroupUrl;
  const urlBase = viewGroupBaseUrl.replace(/\/$/, '');
  if (shareCode) {
    viewGroupUrl = `${urlBase}/view/${shareCode}`;
  } else if (groupId) {
    viewGroupUrl = `${urlBase}/view-group/${groupId}`;
  } else {
    viewGroupUrl = urlBase;
  }
  
  // Log for debugging
  console.log(`[Email] Sending group notification email to: ${participantEmail}`);
  console.log(`[Email] Group ID: ${groupId}, ShareCode: ${shareCode ? 'provided' : 'missing'}`);
  console.log(`[Email] Generated view group URL: ${viewGroupUrl}`);
  console.log(`[Email] View group base URL used: ${viewGroupBaseUrl}`);
  
  // Ensure URL is valid (not '#' and doesn't contain localhost)
  if (!viewGroupUrl || viewGroupUrl === '#' || viewGroupUrl.includes('localhost') || viewGroupUrl.includes('127.0.0.1')) {
    console.error(`[Email] ❌ ERROR: Invalid view group URL generated: ${viewGroupUrl}`);
    viewGroupUrl = shareCode ? `${urlBase}/view/${shareCode}` : urlBase;
    console.log(`[Email] Using fallback URL: ${viewGroupUrl}`);
  }
  
  // Final validation - ensure URL is a valid HTTP/HTTPS URL
  if (!viewGroupUrl.startsWith('http://') && !viewGroupUrl.startsWith('https://')) {
    console.error(`[Email] ❌ ERROR: URL doesn't start with http:// or https://: ${viewGroupUrl}`);
    viewGroupUrl = shareCode ? `${urlBase}/view/${shareCode}` : urlBase;
  }
  
  // Log final URL for debugging
  console.log(`[Email] ✅ Final view group URL (DigitalOcean): ${viewGroupUrl}`);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Group Invitation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #FFD700;
          letter-spacing: 2px;
          margin-bottom: 10px;
        }
        .tagline {
          font-size: 12px;
          color: #666;
          letter-spacing: 1px;
        }
        h1 {
          color: #1b1b3d;
          font-size: 24px;
          margin-bottom: 20px;
        }
        p {
          color: #555;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .group-info {
          background-color: #f0f7ff;
          border-left: 4px solid #4CAF50;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .group-name {
          font-size: 20px;
          font-weight: bold;
          color: #1b1b3d;
          margin-bottom: 10px;
        }
        .admin-info {
          color: #666;
          font-size: 14px;
        }
        .cta-button {
          display: inline-block;
          background-color: #4CAF50;
          color: #ffffff;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AYUUTO</div>
          <div class="tagline">ORGANIZE WITH TRUST, CELEBRATE TOGETHER.</div>
        </div>
        
        <h1>You've been added to a group!</h1>
        
        <p>Hello ${participantName},</p>
        
        <p><strong>${adminName}</strong> has added you to a savings group on Ayuuto.</p>
        
        <div class="group-info">
          <div class="group-name">${groupName}</div>
          <div class="admin-info">Added by: ${adminName}</div>
        </div>
        
        <p>You can now:</p>
        <ul style="color: #555; font-size: 16px; line-height: 1.8;">
          <li>View group details and participant information</li>
          <li>Track payments and collections</li>
          <li>Stay updated on group activities</li>
        </ul>
        
        <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; width: 100%; max-width: 300px;">
            <tr>
              <td align="center" style="background-color: #4CAF50; border-radius: 8px; padding: 0;">
                <a href="${viewGroupUrl}" target="_blank" style="display: block; color: #ffffff !important; text-decoration: none !important; background-color: #4CAF50; padding: 18px 36px; border-radius: 8px; font-weight: bold; font-size: 18px; text-align: center; border: none; width: 100%; -webkit-text-size-adjust: none; mso-hide: all;">View Group</a>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Mobile-friendly fallback button -->
        <div style="text-align: center; margin-top: 15px;">
          <a href="${viewGroupUrl}" style="display: inline-block; color: #4CAF50; text-decoration: underline; font-size: 16px; padding: 10px;">Tap here to view group</a>
        </div>
        
        <p style="color: #999; font-size: 14px; margin-top: 20px; text-align: center;">
          Click the button above to view the group details.<br>
          If you have the Ayuuto app installed, it will open automatically.
        </p>
        
        <p style="color: #666; font-size: 12px; margin-top: 20px; text-align: center;">
          Or copy this link: <a href="${viewGroupUrl}" style="color: #4CAF50; word-break: break-all; text-decoration: underline;">${viewGroupUrl}</a>
        </p>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Ayuuto. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return exports.sendEmail({
    to: participantEmail,
    subject,
    html,
  });
};

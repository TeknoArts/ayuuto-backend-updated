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
    
    if (error.response) {
      const { statusCode, body } = error.response;
      console.error(`   Status Code: ${statusCode}`);
      console.error(`   Response Body:`, JSON.stringify(body, null, 2));
      
      // Provide helpful error messages based on status code
      if (statusCode === 403 || error.message.includes('Forbidden')) {
        const errorMsg = `SendGrid Forbidden Error: The sender email "noreply@ayuuto.com" is not verified in SendGrid.\n\n` +
          `To fix this:\n` +
          `1. Go to: https://app.sendgrid.com/settings/sender_auth\n` +
          `2. Click "Verify a Single Sender"\n` +
          `3. Enter: noreply@ayuuto.com\n` +
          `4. Fill in all required fields\n` +
          `5. Verify the email address\n` +
          `6. Wait for SendGrid approval\n\n` +
          `Alternatively, verify your domain "ayuuto.com" for better deliverability.`;
        throw new Error(errorMsg);
      } else if (statusCode === 401) {
        throw new Error(`SendGrid Authentication Error: Invalid API key. Check your SENDGRID_API_KEY in .env file.`);
      } else if (statusCode === 400) {
        const errors = body?.errors || [];
        const errorDetails = errors.map(e => `- ${e.field}: ${e.message}`).join('\n');
        throw new Error(`SendGrid Validation Error:\n${errorDetails}`);
      }
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
    if (process.env.SENDGRID_API_KEY) {
      return await sendEmailViaSendGrid({ to, subject, html, text });
    }

    // Priority 2: Gmail SMTP
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      return await sendEmailViaSMTP({ to, subject, html, text });
    }

    // Priority 3: Mailtrap (for testing)
    if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
      return await sendEmailViaSMTP({ to, subject, html, text });
    }

    // No email service configured
    console.error('❌ Email service not configured.');
    console.error('   For SendGrid: Set SENDGRID_API_KEY in .env');
    console.error('   For Gmail: Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    console.error('   For Mailtrap: Set MAILTRAP_USER and MAILTRAP_PASS in .env');
    throw new Error('Email service not configured');
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
exports.sendGroupInvitationEmail = async (participantEmail, participantName, groupName, adminName) => {
  const subject = `You've been added to ${groupName} on Ayuuto`;
  
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
        
        <p style="text-align: center; margin-top: 30px;">
          <a href="#" class="cta-button" style="color: #ffffff; text-decoration: none;">Open Ayuuto App</a>
        </p>
        
        <p style="color: #999; font-size: 14px; margin-top: 20px;">
          If you don't have the Ayuuto app installed, download it from your app store to get started.
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

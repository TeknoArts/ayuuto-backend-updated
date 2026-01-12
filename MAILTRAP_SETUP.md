# Mailtrap Setup Guide

This guide will help you set up Mailtrap for email testing in the Ayuuto backend.

## What is Mailtrap?

Mailtrap is an email testing service that captures all emails sent by your application in a safe testing environment. It's perfect for development and testing without sending real emails to users.

## Setup Steps

### 1. Create a Mailtrap Account

1. Go to [https://mailtrap.io](https://mailtrap.io)
2. Sign up for a free account (no credit card required)
3. Verify your email address

### 2. Get Your Mailtrap Credentials

1. After logging in, go to **Email Testing** → **Inboxes**
2. Click on your default inbox (or create a new one)
3. Select **SMTP Settings** tab
4. Choose **Nodemailer** from the dropdown
5. You'll see your credentials:
   - **Host**: `sandbox.smtp.mailtrap.io`
   - **Port**: `2525`
   - **Username**: (your Mailtrap username)
   - **Password**: (your Mailtrap password)

### 3. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Mailtrap credentials:
   ```env
   MAILTRAP_HOST=sandbox.smtp.mailtrap.io
   MAILTRAP_PORT=2525
   MAILTRAP_USER=your_mailtrap_username_here
   MAILTRAP_PASS=your_mailtrap_password_here
   EMAIL_FROM=noreply@ayuuto.com
   FRONTEND_URL=http://localhost:3000
   ```

3. Replace `your_mailtrap_username_here` and `your_mailtrap_password_here` with your actual Mailtrap credentials.

### 4. Test Email Sending

After starting your backend server, you can test email sending by:

1. **Password Reset Flow**: 
   - Use the forgot password endpoint: `POST /api/auth/forgot-password`
   - Send `{ "email": "test@example.com" }`
   - Check your Mailtrap inbox to see the password reset email

2. **Registration Flow**:
   - Register a new user: `POST /api/auth/register`
   - Check your Mailtrap inbox to see the welcome email

### 5. View Emails in Mailtrap

1. Go to your Mailtrap inbox
2. You'll see all emails sent by your application
3. Click on any email to view its content, HTML, and headers
4. You can also check the email in different email clients (Gmail, Outlook, etc.)

## Email Templates

The following email templates are available:

- **Password Reset Email**: Sent when a user requests a password reset
- **Welcome Email**: Sent when a new user registers

## Production Setup

When you're ready to go to production, you'll need to:

1. Replace Mailtrap with a production email service (SendGrid, AWS SES, Mailgun, etc.)
2. Update the SMTP configuration in `app/services/emailService.js`
3. Update your `.env` file with production credentials

## Troubleshooting

### Emails not appearing in Mailtrap

1. **Check credentials**: Make sure `MAILTRAP_USER` and `MAILTRAP_PASS` are correct
2. **Check server logs**: Look for email sending errors in your console
3. **Verify .env file**: Ensure the `.env` file is in the `ayuuto-backend` directory
4. **Restart server**: After changing `.env`, restart your backend server

### Connection errors

- Make sure you're using the correct host: `sandbox.smtp.mailtrap.io`
- Verify the port is `2525` (not `587` or `465`)
- Check that your firewall allows outbound connections on port 2525

## Additional Resources

- [Mailtrap Documentation](https://mailtrap.io/docs/)
- [Nodemailer Documentation](https://nodemailer.com/about/)

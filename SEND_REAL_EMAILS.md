# How to Send Real Emails to Users

## Current Email Service Priority

Your system automatically chooses the best email service in this order:

1. **SendGrid** (if `SENDGRID_API_KEY` is set) ✅ **Sends to real emails**
2. **Gmail SMTP** (if `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set) ✅ **Sends to real emails**
3. **Mailtrap Sandbox** (if `MAILTRAP_USER` and `MAILTRAP_PASS` are set) ❌ **Testing only - doesn't send to real emails**

## Important: Mailtrap Sandbox vs Real Emails

### Mailtrap Sandbox (Current Default)
- **Host**: `sandbox.smtp.mailtrap.io`
- **Purpose**: Testing only
- **Behavior**: Captures emails in Mailtrap inbox, **does NOT send to real users**
- **Use Case**: Development and testing

### Mailtrap Email Testing (Sends Real Emails)
- **Host**: `smtp.mailtrap.io` (different from sandbox)
- **Purpose**: Send real emails to users
- **Behavior**: Actually delivers emails to recipient inboxes
- **Requires**: Mailtrap paid plan or Email Testing feature enabled

## Current Setup

Based on your `.env` file, you have:
- ✅ **SendGrid API Key**: Configured
- This means **emails are already being sent to real users via SendGrid!**

## How to Check Which Service is Being Used

When you send an email, check the backend logs:

```
📧 [SendGrid] Sending email to: user@example.com
   Subject: Your Ayuuto Password Reset OTP
   From: noreply@ayuuto.com
✅ [SendGrid] Email sent successfully!
```

If you see `[SendGrid]`, emails are going to real users.

If you see `[SMTP] Using Mailtrap SMTP`, emails are being captured in Mailtrap (testing only).

## Option 1: Use SendGrid (Recommended - Already Configured)

**Status**: ✅ Already set up and working

Your SendGrid API key is configured, so emails are **already being sent to real users**.

**To verify**:
1. Request a password reset from the app
2. Check the backend logs - should show `[SendGrid]`
3. Check the recipient's email inbox (and spam folder)

**Note**: Make sure `noreply@ayuuto.com` is verified in SendGrid:
- Go to: https://app.sendgrid.com/settings/sender_auth
- Verify the sender email

## Option 2: Use Mailtrap for Real Emails

If you want to use Mailtrap to send real emails (instead of SendGrid):

### Step 1: Get Mailtrap Email Testing Credentials

1. Go to: https://mailtrap.io/
2. Sign in to your account
3. Go to **Email Testing** → **SMTP Settings**
4. Select **SMTP** (not Sandbox)
5. Copy the SMTP credentials:
   - Host: `smtp.mailtrap.io` (NOT sandbox.smtp.mailtrap.io)
   - Port: `2525` or `587`
   - Username: (your Email Testing username)
   - Password: (your Email Testing password)

### Step 2: Update .env File

```bash
# Comment out SendGrid to use Mailtrap instead
# SENDGRID_API_KEY=SG.xxx

# Add Mailtrap Email Testing credentials
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your_email_testing_username
MAILTRAP_PASS=your_email_testing_password
```

### Step 3: Restart Backend Server

```bash
cd ayuuto-backend
npm start
```

**Note**: Mailtrap Email Testing has limits on free plans. SendGrid is better for production.

## Option 3: Use Gmail SMTP

If you want to use Gmail to send real emails:

### Step 1: Enable Gmail App Password

1. Go to: https://myaccount.google.com/
2. Enable 2-Step Verification
3. Go to: https://myaccount.google.com/apppasswords
4. Create an app password for "Mail"
5. Copy the 16-character password

### Step 2: Update .env File

```bash
# Comment out SendGrid
# SENDGRID_API_KEY=SG.xxx

# Add Gmail credentials
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
```

### Step 3: Restart Backend Server

```bash
cd ayuuto-backend
npm start
```

**Note**: Gmail has daily sending limits (500 emails/day for free accounts).

## Which Service Should You Use?

### For Production (Real Users):
- ✅ **SendGrid** (Recommended) - Already configured, best for production
- ✅ **Gmail SMTP** - Good for small scale, free tier available
- ⚠️ **Mailtrap Email Testing** - Limited on free plan, better for testing

### For Testing/Development:
- ✅ **Mailtrap Sandbox** - Perfect for testing, doesn't send real emails

## Quick Check: Are Emails Going to Real Users?

Run this command to see which service is active:

```bash
cd ayuuto-backend
node -e "require('dotenv').config(); console.log('SendGrid:', process.env.SENDGRID_API_KEY ? '✅ ACTIVE (sends real emails)' : '❌ Not set'); console.log('Gmail:', process.env.GMAIL_USER ? '✅ Set (sends real emails)' : '❌ Not set'); console.log('Mailtrap:', process.env.MAILTRAP_USER ? '⚠️ Set (sandbox - testing only)' : '❌ Not set');"
```

## Summary

**You're already sending real emails!** Your SendGrid API key is configured, so all emails are being delivered to real user inboxes via SendGrid.

If you want to switch to Mailtrap for real emails:
1. Get Mailtrap Email Testing credentials (not Sandbox)
2. Update `.env` with `smtp.mailtrap.io` (not sandbox)
3. Comment out `SENDGRID_API_KEY`
4. Restart server

But **SendGrid is recommended** for production use.

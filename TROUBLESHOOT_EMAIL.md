# Troubleshooting Email Not Received

If you didn't receive the password reset email, follow these steps:

## Step 1: Check Mailtrap Configuration

The email service requires Mailtrap credentials in your `.env` file.

### Quick Check

1. Open `ayuuto-backend/.env` file
2. Verify these variables exist:
   ```env
   MAILTRAP_HOST=sandbox.smtp.mailtrap.io
   MAILTRAP_PORT=2525
   MAILTRAP_USER=your_username_here
   MAILTRAP_PASS=your_password_here
   EMAIL_FROM=noreply@ayuuto.com
   ```

### If Missing, Add Them:

1. **Get Mailtrap Credentials:**
   - Go to https://mailtrap.io
   - Sign in (or create free account)
   - Navigate to: **Email Testing** → **Inboxes**
   - Click on your inbox
   - Go to **SMTP Settings** tab
   - Select **Nodemailer** from dropdown
   - Copy your **Username** and **Password**

2. **Add to .env file:**
   ```bash
   cd ayuuto-backend
   # Edit .env file and add:
   MAILTRAP_HOST=sandbox.smtp.mailtrap.io
   MAILTRAP_PORT=2525
   MAILTRAP_USER=paste_your_username_here
   MAILTRAP_PASS=paste_your_password_here
   EMAIL_FROM=noreply@ayuuto.com
   FRONTEND_URL=http://localhost:3000
   ```

3. **Restart your backend server** after adding credentials

## Step 2: Check Backend Logs

When you request a password reset, check your backend console for:

### ✅ Success Messages:
```
📧 Sending email to: user@example.com
   Subject: Reset Your Ayuuto Password
✅ Email sent successfully!
   Message ID: <message-id>
   Response: 250 OK
[AUTH] Password reset email sent to: user@example.com
```

### ❌ Error Messages:
```
❌ Mailtrap credentials not configured. Please set MAILTRAP_USER and MAILTRAP_PASS in .env file
```
**Solution:** Add Mailtrap credentials to `.env` file

```
❌ Error sending email: [error details]
[AUTH] Error sending password reset email: [error]
```
**Solution:** Check the error message for specific issues

## Step 3: Check Mailtrap Inbox

**Important:** Emails sent via Mailtrap don't go to your real inbox. They go to your Mailtrap inbox!

1. Go to https://mailtrap.io
2. Sign in to your account
3. Navigate to: **Email Testing** → **Inboxes**
4. Click on your inbox
5. You should see the password reset email there

## Step 4: Verify Backend is Running

Make sure your backend server is running:

```bash
cd ayuuto-backend
npm start
```

You should see:
```
Server is running on http://0.0.0.0:5001
Connected to MongoDB
```

## Step 5: Test Email Sending

Test if email sending works:

```bash
# Using curl
curl -X POST http://localhost:5001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

Then check:
1. Backend console for success/error messages
2. Mailtrap inbox for the email

## Common Issues

### Issue 1: "Email service not configured"
**Cause:** Missing `MAILTRAP_USER` or `MAILTRAP_PASS` in `.env`
**Solution:** Add Mailtrap credentials to `.env` and restart server

### Issue 2: "Connection timeout" or "ECONNREFUSED"
**Cause:** Can't connect to Mailtrap SMTP server
**Solution:** 
- Check internet connection
- Verify `MAILTRAP_HOST` is `sandbox.smtp.mailtrap.io`
- Verify `MAILTRAP_PORT` is `2525`
- Check firewall settings

### Issue 3: "Invalid login" or "Authentication failed"
**Cause:** Wrong Mailtrap username or password
**Solution:** 
- Double-check credentials in Mailtrap dashboard
- Make sure you copied the correct username/password
- Verify no extra spaces in `.env` file

### Issue 4: Email not in Mailtrap inbox
**Cause:** 
- Email sending failed silently
- Wrong Mailtrap inbox selected
- Email was deleted/archived

**Solution:**
- Check backend logs for errors
- Verify you're looking at the correct Mailtrap inbox
- Check if email is in "Spam" or "Archived" section

### Issue 5: User not found
**Cause:** The email address doesn't exist in the database
**Solution:** 
- The system still returns success (for security)
- But no email is sent if user doesn't exist
- Verify the email is registered in your database

## Quick Test Script

Create a test file to verify email configuration:

```bash
# Create test-email.js in ayuuto-backend
node test-email.js
```

This will test if your Mailtrap configuration is working.

## Still Not Working?

1. **Check backend console** - Look for error messages
2. **Verify .env file** - Make sure credentials are correct
3. **Restart backend** - After changing .env, restart is required
4. **Check Mailtrap dashboard** - Verify your account is active
5. **Test with curl** - Use the test command above

## Need Help?

If you're still having issues:
1. Share the backend console output
2. Share the error message (if any)
3. Confirm Mailtrap credentials are set in `.env`

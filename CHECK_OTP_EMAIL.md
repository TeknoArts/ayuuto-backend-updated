# Troubleshooting: OTP Email Not Received

The email service is working and emails are being sent successfully. Here's how to find your OTP:

## ✅ Email Service Status

- **SendGrid**: ✅ Active and sending emails
- **Test Result**: ✅ Email sent successfully (Status 202)
- **Message ID**: Check SendGrid Activity feed

## Where to Check for OTP Email

### 1. Check Your Email Inbox

**Email Address**: The email you entered in the "Forgot Password" screen

**Subject Line**: "Your Ayuuto Password Reset OTP"

**What to Look For**:
- Large 5-digit number (e.g., `12345`)
- Highlighted in a green box
- Should be very prominent in the email

### 2. Check Spam/Junk Folder

**Important**: Emails from new/unverified senders often go to spam initially.

1. Open your email (technoarts104@gmail.com or the email you used)
2. Check the **Spam** or **Junk** folder
3. Look for emails from `technoarts104@gmail.com` or `noreply@ayuuto.com`
4. If found, mark as "Not Spam"

### 3. Check SendGrid Activity Feed

This shows exactly what happened to your email:

1. Go to https://app.sendgrid.com/activity
2. You should see all sent emails
3. Check the status:
   - ✅ **Delivered** = Email was delivered (check spam folder)
   - ⚠️ **Bounced** = Email address issue
   - 🚫 **Blocked** = Sender not verified (most common issue)
   - 📧 **Processed** = Email is being processed

### 4. Verify Sender Email in SendGrid

**Most Common Issue**: Sender email not verified

1. Go to https://app.sendgrid.com/
2. Navigate to **Settings** → **Sender Authentication**
3. Check if `technoarts104@gmail.com` is verified
4. If not verified:
   - Click **Verify a Single Sender**
   - Enter `technoarts104@gmail.com`
   - Fill in all required fields
   - Check your email and click verification link
   - Wait for approval

## Test OTP Email Sending

Run this to test:

```bash
cd ayuuto-backend
node test-otp-email.js technoarts104@gmail.com
```

This will:
- Send a test OTP email
- Show you the Message ID
- Confirm if email was sent

## Common Issues

### Issue 1: Email in Spam
**Solution**: Check spam folder and mark as "Not Spam"

### Issue 2: Sender Not Verified
**Solution**: Verify sender email in SendGrid dashboard

### Issue 3: Wrong Email Address
**Solution**: Make sure you're checking the email you entered in the app

### Issue 4: Email Delayed
**Solution**: Wait a few minutes, emails can take 1-2 minutes to arrive

### Issue 5: Daily Limit Reached
**Solution**: Free tier is 100 emails/day, check SendGrid dashboard

## Quick Checklist

- [ ] Check email inbox
- [ ] Check spam/junk folder
- [ ] Verify sender email in SendGrid
- [ ] Check SendGrid Activity feed
- [ ] Verify you're checking the correct email address
- [ ] Wait 1-2 minutes for email delivery

## Still Not Working?

1. **Check SendGrid Activity Feed** - This shows the exact status
2. **Verify Sender Email** - Most common issue
3. **Test with Different Email** - Try a different email provider
4. **Check Backend Logs** - Look for `[AUTH] Password reset OTP sent to:` message

## Next Steps

After you receive the OTP:
1. Open the Ayuuto app
2. Go to "Verify OTP" screen
3. Enter the 5-digit OTP from email
4. After verification, you'll be able to change your password

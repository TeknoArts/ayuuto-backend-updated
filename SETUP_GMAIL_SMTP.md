# Setup Gmail SMTP for Real Email Delivery

This guide will help you configure Gmail SMTP to send emails to real Gmail addresses.

## Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Sign in with your Gmail account
3. Under "Signing in to Google", click **2-Step Verification**
4. Follow the prompts to enable 2-factor authentication
5. **Important:** You must complete this step before creating an app password

## Step 2: Create an App Password

1. Go to https://myaccount.google.com/apppasswords
   - Or navigate: Google Account → Security → 2-Step Verification → App passwords
2. You may be asked to sign in again
3. Under "Select app", choose **Mail**
4. Under "Select device", choose **Other (Custom name)**
5. Enter a name like "Ayuuto Backend" or "Node.js App"
6. Click **Generate**
7. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)
   - Remove spaces when using it (should be: `abcdefghijklmnop`)

## Step 3: Update Your .env File

Open `ayuuto-backend/.env` and add your Gmail credentials:

```env
# Gmail SMTP Configuration (for sending to real email addresses)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop

# Email Configuration
EMAIL_FROM=your-email@gmail.com
```

**Important:**
- Use your full Gmail address for `GMAIL_USER`
- Use the 16-character app password (no spaces) for `GMAIL_APP_PASSWORD`
- Use the same email for `EMAIL_FROM` (or a different one if you prefer)

## Step 4: Keep Mailtrap (Optional)

You can keep Mailtrap credentials for testing. The system will use Gmail if configured, otherwise fall back to Mailtrap:

```env
# Gmail (production - sends to real emails)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

# Mailtrap (testing - captures emails)
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=f63724bf531f97
MAILTRAP_PASS=f4e5080403b63c
```

## Step 5: Restart Your Backend

After updating `.env`, restart your backend server:

```bash
cd ayuuto-backend
npm start
```

## Step 6: Test Email Sending

Run the test script:

```bash
cd ayuuto-backend
node test-email.js your-real-email@gmail.com
```

You should see:
```
✅ SUCCESS! Email sent successfully!
```

Then check your Gmail inbox (and spam folder) for the email.

## Troubleshooting

### Error: "Invalid login" or "Authentication failed"
- Make sure you're using the **app password**, not your regular Gmail password
- Verify 2-factor authentication is enabled
- Check that the app password has no spaces

### Error: "Less secure app access"
- Gmail no longer supports "less secure apps"
- You **must** use an app password (not your regular password)
- Make sure 2-factor authentication is enabled

### Email goes to spam
- This is normal for new email senders
- Gmail may mark emails as spam initially
- Check your spam folder
- Over time, as you send more legitimate emails, deliverability improves

### Daily sending limits
- Gmail free accounts: 500 emails per day
- If you need more, consider SendGrid or AWS SES

## Switching Between Gmail and Mailtrap

### Use Gmail (send to real emails):
- Set `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `.env`
- Emails will be sent to real Gmail addresses

### Use Mailtrap (testing only):
- Remove or comment out `GMAIL_USER` and `GMAIL_APP_PASSWORD`
- Keep `MAILTRAP_USER` and `MAILTRAP_PASS`
- Emails will be captured in Mailtrap inbox

### Priority:
- If Gmail is configured, it will be used
- If Gmail is not configured, Mailtrap will be used
- If neither is configured, email sending will fail

## Security Notes

- **Never commit `.env` to git** - it contains sensitive credentials
- **App passwords are safer** than using your main Gmail password
- **Each app should have its own app password**
- **You can revoke app passwords** anytime from Google Account settings

## Production Recommendations

For production, consider:
- **SendGrid** - Free tier: 100 emails/day, easy setup
- **AWS SES** - Very low cost, highly scalable
- **Mailgun** - Free tier: 5,000 emails/month
- **Gmail** - Good for small scale, but has daily limits

Gmail is fine for development and small-scale production, but for larger scale, a dedicated email service is recommended.

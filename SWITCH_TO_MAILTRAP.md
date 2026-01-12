# Switch Back to Mailtrap for Testing

## Why Emails Aren't in Mailtrap

SendGrid is currently active, so emails are being sent to **real email addresses** instead of Mailtrap. The system uses this priority:
1. **SendGrid** (if configured) → Sends to real emails
2. **Gmail** (if configured) → Sends to real emails  
3. **Mailtrap** (if configured) → Captures emails for testing

## Quick Fix: Disable SendGrid Temporarily

To see emails in Mailtrap, temporarily disable SendGrid:

### Option 1: Comment Out SendGrid (Recommended)

Open `ayuuto-backend/.env` and comment out the SendGrid line:

```env
# Temporarily disable SendGrid to use Mailtrap for testing
# SENDGRID_API_KEY=SG.your_key_here

# Mailtrap will be used instead
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=f63724bf531f97
MAILTRAP_PASS=f4e5080403b63c
```

### Option 2: Remove SendGrid Line

Simply delete or comment out the `SENDGRID_API_KEY` line in `.env`.

## After Disabling SendGrid

1. **Restart your backend:**
   ```bash
   cd ayuuto-backend
   npm start
   ```

2. **You should see:**
   ```
   📧 Using Mailtrap SMTP for email testing
   ```

3. **Test email sending:**
   ```bash
   node test-email.js test@example.com
   ```

4. **Check Mailtrap:**
   - Go to https://mailtrap.io
   - Navigate to: Email Testing → Inboxes
   - You should see the email there!

## Re-enable SendGrid Later

When you want to send to real emails again, just uncomment the `SENDGRID_API_KEY` line in `.env` and restart the backend.

## Quick Command to Switch

You can quickly comment/uncomment SendGrid:

```bash
# Disable SendGrid (use Mailtrap)
cd ayuuto-backend
sed -i '' 's/^SENDGRID_API_KEY=/#SENDGRID_API_KEY=/' .env

# Re-enable SendGrid (use SendGrid)
sed -i '' 's/^#SENDGRID_API_KEY=/SENDGRID_API_KEY=/' .env
```

Then restart your backend server.

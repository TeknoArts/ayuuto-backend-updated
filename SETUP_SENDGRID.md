# Setup SendGrid for Email Delivery

SendGrid is a professional email delivery service perfect for production. It offers:
- **Free tier**: 100 emails/day forever
- **Reliable delivery**: High deliverability rates
- **Easy setup**: Simple API integration
- **Scalable**: Grows with your needs

## Step 1: Create SendGrid Account

1. Go to https://signup.sendgrid.com/
2. Sign up for a free account (no credit card required)
3. Verify your email address
4. Complete the account setup

## Step 2: Create API Key

1. After logging in, go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Choose **Full Access** (or **Restricted Access** with Mail Send permissions)
4. Give it a name like "Ayuuto Backend"
5. Click **Create & View**
6. **Copy the API key immediately** - you won't be able to see it again!
   - It will look like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 3: Verify Sender Identity (Required for Production)

SendGrid requires you to verify your sender email address:

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Email**: `noreply@ayuuto.com` (or your preferred email)
   - **From Name**: `Ayuuto`
   - **Reply To**: (same as from email)
   - **Address**: Your business address
   - **City, State, Zip**: Your location
   - **Country**: Your country
4. Click **Create**
5. **Check your email** and click the verification link
6. Wait for approval (usually instant, but can take a few minutes)

**Note**: For testing, you can use your personal email address. For production, consider setting up domain authentication.

## Step 4: Update Your .env File

Open `ayuuto-backend/.env` and add:

```env
# SendGrid Configuration (for production email delivery)
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@ayuuto.com

# Email Configuration
EMAIL_FROM=noreply@ayuuto.com
FRONTEND_URL=http://localhost:3000
```

**Important:**
- Replace `SG.your_api_key_here` with your actual API key from Step 2
- Replace `noreply@ayuuto.com` with the email you verified in Step 3
- Make sure `SENDGRID_FROM_EMAIL` matches your verified sender email

## Step 5: Restart Your Backend

After updating `.env`, restart your backend server:

```bash
cd ayuuto-backend
npm start
```

You should see:
```
📧 Using SendGrid API for email delivery
```

## Step 6: Test Email Sending

Run the test script:

```bash
cd ayuuto-backend
node test-email.js your-email@gmail.com
```

You should see:
```
✅ [SendGrid] Email sent successfully!
```

Then check your email inbox (and spam folder) for the email.

## Email Service Priority

The system automatically chooses the best available service:

1. **SendGrid** (if `SENDGRID_API_KEY` is set) - **Best for production**
2. **Gmail** (if `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set)
3. **Mailtrap** (if `MAILTRAP_USER` and `MAILTRAP_PASS` are set) - For testing only

## Troubleshooting

### Error: "Forbidden" or "401 Unauthorized"
- **Cause**: Invalid API key
- **Solution**: 
  - Verify the API key is correct (starts with `SG.`)
  - Make sure there are no extra spaces
  - Regenerate the API key if needed

### Error: "The from address does not match a verified Sender Identity"
- **Cause**: Email address not verified
- **Solution**: 
  - Go to Settings → Sender Authentication
  - Verify the email address you're using in `SENDGRID_FROM_EMAIL`
  - Make sure `EMAIL_FROM` matches the verified email

### Email goes to spam
- **Cause**: New sender reputation
- **Solution**: 
  - This is normal for new accounts
  - Check spam folder initially
  - As you send more legitimate emails, deliverability improves
  - Consider setting up domain authentication for better deliverability

### Daily sending limits
- **Free tier**: 100 emails/day
- **Paid plans**: Start at $19.95/month for 50,000 emails
- Check your usage in SendGrid dashboard

## Switching Between Services

### Use SendGrid (Production):
```env
SENDGRID_API_KEY=SG.your_key_here
SENDGRID_FROM_EMAIL=noreply@ayuuto.com
```

### Use Gmail (Development):
```env
# Comment out or remove SENDGRID_API_KEY
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_app_password
```

### Use Mailtrap (Testing):
```env
# Comment out or remove SENDGRID_API_KEY and Gmail
MAILTRAP_USER=your_username
MAILTRAP_PASS=your_password
```

## Production Best Practices

1. **Domain Authentication**: Set up SPF, DKIM, and DMARC for your domain
2. **Monitor Deliverability**: Check SendGrid dashboard for bounce/spam rates
3. **Rate Limiting**: Implement rate limiting to avoid hitting daily limits
4. **Error Handling**: Log email failures and retry logic
5. **Unsubscribe Links**: Include unsubscribe links in marketing emails (not required for transactional)

## SendGrid Dashboard

Monitor your email sending:
- **Activity**: See all sent emails
- **Stats**: View delivery rates, opens, clicks
- **Suppressions**: Manage bounces and spam reports
- **API Keys**: Manage and rotate keys

## Cost

- **Free**: 100 emails/day forever
- **Essentials**: $19.95/month - 50,000 emails
- **Pro**: $89.95/month - 100,000 emails
- **Premier**: Custom pricing

For most apps, the free tier is sufficient for development and early production.

## Security

- **Never commit API keys to git** - keep them in `.env`
- **Rotate API keys** periodically
- **Use restricted API keys** with only Mail Send permissions
- **Monitor API key usage** in SendGrid dashboard

# Fix Mailtrap Invalid Credentials Error

You're getting `535 5.7.0 Invalid credentials` which means your Mailtrap username or password is incorrect.

## Step-by-Step Fix

### 1. Get Fresh Credentials from Mailtrap

1. **Go to Mailtrap:**
   - Visit https://mailtrap.io
   - Sign in to your account

2. **Navigate to SMTP Settings:**
   - Click **Email Testing** in the left menu
   - Click **Inboxes**
   - Click on your inbox (usually "My Inbox" or "Default")
   - Click the **SMTP Settings** tab

3. **Select Nodemailer:**
   - In the "Integrations" dropdown, select **Nodemailer**
   - You'll see credentials like this:
     ```
     Host: sandbox.smtp.mailtrap.io
     Port: 2525
     Username: abc123def456
     Password: xyz789uvw012
     ```

4. **Copy the credentials carefully:**
   - Copy the **Username** (it's usually a long alphanumeric string)
   - Copy the **Password** (also a long alphanumeric string)
   - Make sure you copy the ENTIRE string with no spaces

### 2. Update Your .env File

Open `ayuuto-backend/.env` and update these lines:

```env
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=paste_your_username_here
MAILTRAP_PASS=paste_your_password_here
EMAIL_FROM=noreply@ayuuto.com
```

**Important:**
- No quotes around the values
- No spaces before or after the `=`
- Make sure the username and password are on the same line as the variable name
- Don't add any extra characters

**Example of CORRECT format:**
```env
MAILTRAP_USER=abc123def456ghi789
MAILTRAP_PASS=xyz789uvw012rst345
```

**Example of WRONG format:**
```env
MAILTRAP_USER="abc123def456ghi789"  ❌ No quotes
MAILTRAP_USER = abc123def456ghi789  ❌ Spaces around =
MAILTRAP_USER= abc123def456ghi789   ❌ Space after =
```

### 3. Verify Your .env File

After updating, your `.env` should look like this:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ayuuto

# JWT Secret
JWT_SECRET=your_jwt_secret

# Server
PORT=5001
HOST=0.0.0.0

# Mailtrap Configuration
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your_actual_username_from_mailtrap
MAILTRAP_PASS=your_actual_password_from_mailtrap
EMAIL_FROM=noreply@ayuuto.com
FRONTEND_URL=http://localhost:3000
```

### 4. Restart Your Backend

After saving the `.env` file, **restart your backend server**:

```bash
# Stop the current server (Ctrl+C)
# Then start it again:
cd ayuuto-backend
npm start
```

### 5. Test Again

Run the test script:

```bash
cd ayuuto-backend
node test-email.js test@example.com
```

You should see:
```
✅ SUCCESS! Email sent successfully!
```

## Common Mistakes

### Mistake 1: Using Wrong Inbox
- Make sure you're using credentials from the **SMTP Settings** tab
- Not from "API" or "POP3" settings

### Mistake 2: Copying with Extra Spaces
- When copying from Mailtrap, make sure there are no leading/trailing spaces
- The password might be very long - copy the entire string

### Mistake 3: Using Old Credentials
- Mailtrap credentials can change if you regenerate them
- Always use the current credentials from the dashboard

### Mistake 4: Wrong Environment File
- Make sure you're editing `ayuuto-backend/.env`
- Not `.env.example` or a different file

### Mistake 5: Not Restarting Server
- Changes to `.env` only take effect after restarting the server
- Always restart after updating credentials

## Still Not Working?

### Check 1: Verify Credentials Format
```bash
cd ayuuto-backend
node -e "require('dotenv').config(); console.log('User:', process.env.MAILTRAP_USER); console.log('Pass:', process.env.MAILTRAP_PASS ? 'SET' : 'NOT SET');"
```

This should show your username and confirm password is set.

### Check 2: Test Connection Manually
You can test the SMTP connection directly:

```bash
# Install telnet if needed (macOS: already installed)
telnet sandbox.smtp.mailtrap.io 2525
```

### Check 3: Verify Mailtrap Account
- Make sure your Mailtrap account is active
- Free accounts have limits but should work for testing
- Check if you've hit any rate limits

### Check 4: Try Different Inbox
- Create a new inbox in Mailtrap
- Get new credentials from the new inbox
- Update `.env` with new credentials

## Need More Help?

If you're still having issues:
1. Double-check you copied the credentials exactly from Mailtrap
2. Make sure there are no extra spaces or quotes in `.env`
3. Verify the backend server was restarted after updating `.env`
4. Try creating a new Mailtrap inbox and using those credentials

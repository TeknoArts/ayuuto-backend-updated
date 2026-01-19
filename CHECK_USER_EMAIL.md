# Check User Email Registration

If you're not receiving OTP emails, the account might be registered with a different email address.

## How to Check Registered Email

### Option 1: Check Backend Logs

When you request a password reset, check the backend terminal logs:

```
[AUTH] Forgot password request received
[AUTH] Email from request: your-email@gmail.com
[AUTH] Normalized email for lookup: your-email@gmail.com
[AUTH] User lookup result: ✅ Found
[AUTH] User found in database:
   - User ID: 507f1f77bcf86cd799439011
   - User Name: Your Name
   - User Email (from DB): registered-email@gmail.com  ← This is the actual registered email
   - Email match: ✅ Match
```

**Important**: The OTP is sent to the **email from database** (the email the account was registered with), not necessarily the email you entered.

### Option 2: Check Database Directly

If you have MongoDB access:

```bash
# Connect to MongoDB
mongosh

# Find user by email (case-insensitive)
use your-database-name
db.users.findOne({ email: "your-email@gmail.com" })

# Or find all users
db.users.find({}, { email: 1, name: 1 })
```

### Option 3: Check Registration Email

Check the email you used when you first signed up. The OTP will be sent to that email address.

## Common Issues

### Issue 1: Email Typo During Registration
- You registered with: `technoarts104@gmail.com`
- You're requesting reset with: `technoarts104@gmial.com` (typo)
- **Solution**: Use the exact email you registered with

### Issue 2: Different Email Address
- You registered with: `personal@gmail.com`
- You're requesting reset with: `work@gmail.com`
- **Solution**: Use the email you registered with

### Issue 3: Case Sensitivity
- You registered with: `JohnDoe@gmail.com`
- You're requesting reset with: `johndoe@gmail.com`
- **Solution**: The system normalizes emails, so this should work, but check logs to confirm

### Issue 4: Email Not Registered
- The email you're using was never registered
- **Solution**: Check if you have an account, or register first

## How the System Works

1. **You enter email**: `your-email@gmail.com`
2. **System normalizes**: Converts to lowercase and trims
3. **System looks up**: Searches database for that email
4. **If found**: Generates OTP and sends to **registered email** (from database)
5. **If not found**: Returns success message (for security, doesn't reveal if email exists)

## Important Notes

- The OTP is **always sent to the email stored in the database** (the email you registered with)
- If you enter a different email than what's registered, you won't receive the OTP
- The system logs will show both the email you entered and the email from the database
- Check the backend logs to see which email the OTP was sent to

## Next Steps

1. Check backend logs when you request password reset
2. Look for the line: `User Email (from DB): ...`
3. That's the email the OTP was sent to
4. Check that email's inbox (and spam folder)

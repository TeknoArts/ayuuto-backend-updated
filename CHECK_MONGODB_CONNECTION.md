# Check MongoDB Connection - Troubleshooting Guide

## Current MongoDB Configuration

Your server is configured to connect to MongoDB. Let's check if it's connected properly.

## How to Check MongoDB Connection

### Step 1: Check Railway Logs

1. **Go to Railway Dashboard:**
   - https://railway.app
   - Open your project
   - Click on your service

2. **Check Logs Tab:**
   - Look for: `Connected to MongoDB`
   - Or error: `MongoDB connection error:`

### Step 2: Check Environment Variables

1. **Railway Dashboard → Your Service → Variables**
2. **Verify `MONGODB_URI` is set:**
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ayuuto?retryWrites=true&w=majority
   ```

### Step 3: Test MongoDB Connection

The server should log one of these on startup:

**✅ Success:**
```
Connected to MongoDB
```

**❌ Error:**
```
MongoDB connection error: [error message]
```

## Common MongoDB Connection Errors

### Error 1: "MONGODB_URI not set"
**Symptom:** Server crashes immediately
**Solution:**
1. Railway Dashboard → Variables
2. Add `MONGODB_URI` environment variable
3. Value: Your MongoDB Atlas connection string

### Error 2: "Authentication failed"
**Symptom:** `MongoDB connection error: Authentication failed`
**Solution:**
1. Check MongoDB Atlas → Database Access
2. Verify username and password
3. Make sure password doesn't have special characters (or URL-encode them)
4. Update `MONGODB_URI` with correct credentials

### Error 3: "IP not whitelisted"
**Symptom:** `MongoDB connection error: IP not whitelisted`
**Solution:**
1. MongoDB Atlas → Network Access
2. Add IP: `0.0.0.0/0` (allows all IPs)
3. Or add Railway's IP addresses

### Error 4: "Connection timeout"
**Symptom:** `MongoDB connection error: Connection timeout`
**Solution:**
1. Check MongoDB Atlas cluster is running
2. Verify connection string format
3. Check network connectivity

## MongoDB Connection String Format

Your `MONGODB_URI` should look like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ayuuto?retryWrites=true&w=majority
```

**Important:**
- Replace `username` with your MongoDB username
- Replace `password` with your MongoDB password (URL-encode special characters)
- Replace `cluster0.xxxxx` with your cluster name
- `/ayuuto` is the database name

## How to Get MongoDB Connection String

1. **Go to MongoDB Atlas:**
   - https://www.mongodb.com/cloud/atlas
   - Login to your account

2. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Add `/ayuuto` at the end (before `?`)

3. **Add to Railway:**
   - Railway Dashboard → Service → Variables
   - Key: `MONGODB_URI`
   - Value: Paste the connection string

## Check Current Configuration

### In Railway:
1. Railway Dashboard → Service → Variables
2. Look for `MONGODB_URI`
3. Verify it's set correctly

### In Server Code:
The server checks for MongoDB connection in `server.js`:
```javascript
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';
```

If `MONGODB_URI` is not set, it defaults to local MongoDB (which won't work on Railway).

## Quick Test

### Test 1: Check Railway Logs
Look for these messages:
- ✅ `Connected to MongoDB` = Working!
- ❌ `MongoDB connection error:` = Problem!

### Test 2: Check Environment Variable
Railway Dashboard → Variables → `MONGODB_URI`
- ✅ Set = Good
- ❌ Not set = Add it!

### Test 3: Test MongoDB Atlas
1. MongoDB Atlas → Network Access
2. Check if `0.0.0.0/0` is whitelisted
3. If not, add it

## Fix Steps

1. **Check Railway Logs:**
   - Look for MongoDB connection messages
   - Note any error messages

2. **Verify MONGODB_URI:**
   - Railway Dashboard → Variables
   - Check if `MONGODB_URI` exists
   - Verify the connection string is correct

3. **Check MongoDB Atlas:**
   - Network Access → Add `0.0.0.0/0`
   - Database Access → Verify user credentials

4. **Redeploy:**
   - After fixing, redeploy in Railway
   - Check logs again

## Expected Behavior

**On Server Start:**
```
Connected to MongoDB
Server is running on port 5001
```

**If MongoDB Fails:**
```
MongoDB connection error: [error details]
```

The server will exit if MongoDB connection fails (by design).

## Next Steps

1. ✅ Check Railway logs for MongoDB connection status
2. ✅ Verify `MONGODB_URI` environment variable is set
3. ✅ Check MongoDB Atlas IP whitelist
4. ✅ Test connection string format
5. ✅ Redeploy if needed

---

**Share what you see in Railway logs** and I can help fix the specific MongoDB connection issue!

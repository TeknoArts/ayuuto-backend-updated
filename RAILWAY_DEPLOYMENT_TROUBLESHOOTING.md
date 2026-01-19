# Railway Deployment Troubleshooting

## Current Status
Based on your Railway dashboard:
- ✅ Service is **Online** (green dot)
- ❌ Recent deployments are **failing**
- ⚠️ One successful deployment 4 minutes ago, but latest failed 3 minutes ago

## How to Check Deployment Logs

1. **In Railway Dashboard:**
   - Click on your service (the "web" card)
   - Go to the **"Deployments"** tab
   - Click on the **failed deployment** (most recent one)
   - Scroll through the **build logs** to find the error

2. **Common Error Locations:**
   - Look for red error messages
   - Check the end of the build log
   - Look for "npm error" or "Error:" messages

## Common Deployment Issues

### 1. Missing Environment Variables
**Symptoms:** App starts but crashes immediately
**Solution:** Check that all required env vars are set:
- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV=production`
- `PORT` (optional, defaults to 5001)

### 2. MongoDB Connection Failed
**Symptoms:** "MongoDB connection error" in logs
**Solution:**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for all IPs)
- Verify database credentials

### 3. Port Configuration
**Symptoms:** "EADDRINUSE" or port binding errors
**Solution:**
- Railway sets `PORT` automatically - don't hardcode it
- Make sure your code uses `process.env.PORT || 5001`

### 4. Missing Dependencies
**Symptoms:** "Cannot find module" errors
**Solution:**
- All dependencies should be in `package.json`
- Check that `npm install` completed successfully

### 5. Build Command Issues
**Symptoms:** Build fails during npm install
**Solution:**
- Check `nixpacks.toml` configuration
- Verify `package.json` is valid JSON

## Quick Fixes to Try

### Fix 1: Check Environment Variables
1. Go to Railway Dashboard → Your Service → Variables
2. Verify these are set:
   ```
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your_secret_32_chars_min
   NODE_ENV=production
   ```

### Fix 2: Verify Server Code
Make sure `server.js` uses:
```javascript
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';
```

### Fix 3: Check Build Configuration
Verify `nixpacks.toml`:
```toml
[phases.install]
cmds = ["npm install"]

[start]
cmd = "npm start"
```

### Fix 4: Manual Redeploy
1. In Railway Dashboard → Your Service
2. Click "..." menu → "Redeploy"
3. Watch the build logs in real-time

## What to Share for Help

If deployments keep failing, share:
1. **The exact error message** from the build logs
2. **Last 20-30 lines** of the deployment log
3. **Which step failed** (build, install, or start)

## Next Steps

1. **Click on the failed deployment** in Railway
2. **Copy the error message** from the logs
3. **Share it with me** and I'll help fix it

---

**Note:** Even though deployments are failing, your service shows as "Online", which means a previous deployment succeeded. The failures might be from recent code changes.

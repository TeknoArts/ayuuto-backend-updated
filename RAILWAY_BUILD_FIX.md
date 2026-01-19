# Railway Build Fix Guide

## Common Build Errors and Solutions

### Error: "Failed to build an image"

This usually happens due to one of these reasons:

## ✅ Solution 1: Check Railway Settings

1. **Go to Railway Dashboard** → Your Project → Settings
2. **Check Build Settings:**
   - **Build Command:** Leave empty or set to `npm install`
   - **Start Command:** `npm start`
   - **Root Directory:** `/` (or leave empty)

## ✅ Solution 2: Verify package.json

Make sure your `package.json` has:
- ✅ `engines` field specifying Node version
- ✅ `start` script: `"start": "node server.js"`
- ✅ All dependencies listed

## ✅ Solution 3: Check for Missing Files

Railway needs these files:
- ✅ `server.js` (main entry point)
- ✅ `package.json` (with all dependencies)
- ✅ `package-lock.json` (for consistent installs)

## ✅ Solution 4: Firebase Service Account

If you're using Firebase, you need to set the service account as an environment variable:

1. **In Railway Dashboard** → Variables
2. **Add variable:**
   - **Key:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Paste the entire JSON content from `config/firebase-service-account.json`
   - **Format:** Single line JSON (remove all line breaks)

**OR** if the file is in your repo, make sure it's not in `.gitignore`

## ✅ Solution 5: Check Build Logs

1. **In Railway Dashboard** → Your Service → Deployments
2. **Click on the failed deployment**
3. **Check the build logs** for specific errors

Common errors you might see:
- `Module not found` → Missing dependency
- `Cannot find module` → Missing file
- `EACCES` → Permission issue
- `ENOENT` → File not found

## ✅ Solution 6: Manual Build Test

Test the build locally:

```bash
cd ayuuto-backend
npm install
npm start
```

If this works locally, the issue is likely with Railway configuration.

## ✅ Solution 7: Update Railway Configuration

I've added these files to help:
- `railway.json` - Railway-specific configuration
- `.nvmrc` - Node version specification
- Updated `package.json` with `engines` field

**After adding these files:**
1. Commit and push to GitHub
2. Railway will automatically redeploy

## ✅ Solution 8: Check Environment Variables

Make sure all required environment variables are set in Railway:
- `MONGODB_URI`
- `JWT_SECRET`
- `PORT` (optional, defaults to 5001)
- `NODE_ENV=production`

## 🔍 Debugging Steps

1. **Check Railway Build Logs:**
   - Go to Railway Dashboard
   - Click on your service
   - Click on the failed deployment
   - Scroll through the build logs
   - Look for error messages

2. **Common Error Messages:**
   - `npm ERR!` → Dependency installation issue
   - `Cannot find module` → Missing file or dependency
   - `EACCES` → Permission issue
   - `ENOENT` → File not found

3. **Test Locally:**
   ```bash
   npm install
   npm start
   ```

## 📝 Next Steps

1. **Check the build logs** in Railway dashboard
2. **Share the specific error message** from the logs
3. **Verify all files are committed** to GitHub
4. **Check environment variables** are set correctly

## 🚀 Quick Fix Checklist

- [ ] `package.json` has `engines` field
- [ ] `package.json` has `start` script
- [ ] `server.js` exists in root directory
- [ ] All dependencies are in `package.json`
- [ ] `railway.json` is committed (if using)
- [ ] `.nvmrc` is committed (if using)
- [ ] Environment variables are set in Railway
- [ ] Firebase service account is set as env variable (if using Firebase)

---

**If you're still having issues, please share:**
1. The exact error message from Railway build logs
2. The last few lines of the build log
3. Any specific module/file that's missing

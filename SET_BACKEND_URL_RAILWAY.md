# Set BACKEND_URL in Railway

## Why This Is Important

The `BACKEND_URL` environment variable ensures that:
- ✅ Email links always use the Railway URL (not local IP)
- ✅ Share links work from anywhere
- ✅ Deep links in emails work correctly
- ✅ No "connection refused" errors

## Current Railway URL

Your Railway URL is: **`https://web-production-40b9d.up.railway.app`**

## How to Set BACKEND_URL in Railway

### Step 1: Open Railway Dashboard
1. Go to https://railway.app
2. Log in to your account
3. Open your project

### Step 2: Navigate to Variables
1. Click on your **service** (the backend service)
2. Click on the **"Variables"** tab
3. Or go to: **Settings → Variables**

### Step 3: Add BACKEND_URL
1. Click **"+ New Variable"** or **"Add Variable"**
2. **Variable Name:** `BACKEND_URL`
3. **Value:** `https://web-production-40b9d.up.railway.app`
4. Click **"Add"** or **"Save"**

### Step 4: Verify
1. The variable should appear in the list
2. Railway will automatically redeploy (or you can manually redeploy)
3. Check logs to confirm it's being used

## Expected Logs

After setting `BACKEND_URL`, you should see in Railway logs:
```
[Email] ✅ Using BACKEND_URL: https://web-production-40b9d.up.railway.app
```

Instead of:
```
[Email] ⚠️  WARNING: No BACKEND_URL set! Using default Railway URL
```

## Alternative: Auto-Detection

The code will **auto-detect** Railway URL even without `BACKEND_URL` set, but:
- ⚠️ It's less reliable
- ⚠️ May not work if Railway environment variables change
- ✅ **Best practice:** Set `BACKEND_URL` explicitly

## Test After Setting

1. **Create a new group** with a participant
2. **Check the email** - the "View Group" button should link to:
   ```
   https://web-production-40b9d.up.railway.app/view/SHARE_CODE
   ```
3. **Click the link** - should open the group view (not connection refused)

## Troubleshooting

### Still seeing local IP?
1. Check Railway Variables → `BACKEND_URL` is set correctly
2. Check Railway logs for URL detection messages
3. Redeploy the service after adding the variable

### Connection refused error?
1. Verify `BACKEND_URL` is set in Railway
2. Check that the URL is correct (no typos)
3. Make sure Railway service is running (green dot)

---

**Quick Add:**
```
Variable: BACKEND_URL
Value: https://web-production-40b9d.up.railway.app
```

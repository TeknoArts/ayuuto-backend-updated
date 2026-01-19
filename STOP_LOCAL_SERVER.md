# Stop Local Server and Use Railway

## ✅ Yes, you can disconnect your local server!

Since your backend is now running on Railway, you can stop your local server.

## How to Stop Local Server

### If running with `npm start` or `node server.js`:
1. Go to the terminal where the server is running
2. Press `Ctrl + C` (or `Cmd + C` on Mac)
3. The server will stop

### If running with `nodemon`:
1. Go to the terminal where nodemon is running
2. Press `Ctrl + C` (or `Cmd + C` on Mac)
3. The server will stop

### If running in background or with PM2:
```bash
# Check if PM2 is running
pm2 list

# Stop the server
pm2 stop ayuuto-backend

# Or delete it
pm2 delete ayuuto-backend
```

## ⚠️ Important: Update Mobile App First!

**Before stopping your local server, make sure to:**

1. **Get your Railway URL:**
   - Go to Railway Dashboard
   - Copy your service URL (e.g., `https://your-app.up.railway.app`)

2. **Update Mobile App Configuration:**
   - Update `ayuuto-mobile/utils/api.ts`
   - Update `ayuuto-mobile/utils/auth.ts`
   - Change from local IP to Railway URL

3. **Test the Railway server:**
   - Make sure Railway server is working
   - Test API endpoints
   - Verify mobile app can connect

## Update Mobile App to Use Railway

### Step 1: Update `ayuuto-mobile/utils/api.ts`

Change from:
```typescript
const IS_PHYSICAL_DEVICE = true;
const PHYSICAL_DEVICE_IP = '192.168.18.126';
```

To:
```typescript
const PRODUCTION_API_URL = 'https://your-railway-url.up.railway.app/api';
const IS_PRODUCTION = true; // Use Railway server

const getApiBaseUrl = () => {
  if (IS_PRODUCTION) {
    return PRODUCTION_API_URL;
  }
  // ... existing local development code
};
```

### Step 2: Update `ayuuto-mobile/utils/auth.ts`

Same changes as above.

### Step 3: Test Mobile App

1. Restart your mobile app
2. Test login/register
3. Test API calls
4. Verify everything works with Railway

## Benefits of Using Railway

✅ **Always available** - Server runs 24/7  
✅ **Accessible from anywhere** - No need for same network  
✅ **HTTPS enabled** - Secure connections  
✅ **Auto-deploys** - Push to GitHub = auto deploy  
✅ **No local server needed** - Free up your computer  

## When to Keep Local Server Running

You might want to keep local server for:
- **Development** - Testing new features locally
- **Debugging** - Easier to debug locally
- **Offline development** - When internet is down

## Quick Switch Between Local and Production

You can easily switch between local and production:

```typescript
// In api.ts and auth.ts
const USE_PRODUCTION = true; // Set to false for local development

const getApiBaseUrl = () => {
  if (USE_PRODUCTION) {
    return 'https://your-railway-url.up.railway.app/api';
  }
  // Local development
  return `http://${PHYSICAL_DEVICE_IP}:5001/api`;
};
```

## Summary

1. ✅ Get your Railway URL
2. ✅ Update mobile app to use Railway URL
3. ✅ Test mobile app with Railway
4. ✅ Stop local server (Ctrl+C)
5. ✅ Enjoy always-on server! 🎉

---

**Note:** Your local server is only needed for local development. Once Railway is working, you can stop it anytime!

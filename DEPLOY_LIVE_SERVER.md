# 🚀 Deploy Ayuuto Backend to Live Server

This guide will help you deploy your backend server so it's accessible from anywhere.

## 🎯 Recommended Options (Easiest to Hardest)

### 1. **Railway** ⭐ (Easiest - Recommended)
- **Cost:** Free tier available, then $5/month
- **Setup Time:** 5 minutes
- **Best For:** Quick deployment, automatic HTTPS, zero config

### 2. **Render** ⭐ (Very Easy)
- **Cost:** Free tier available, then $7/month
- **Setup Time:** 5-10 minutes
- **Best For:** Free tier, easy setup

### 3. **DigitalOcean App Platform** (Easy)
- **Cost:** $5/month minimum
- **Setup Time:** 10-15 minutes
- **Best For:** More control, good documentation

### 4. **Heroku** (Easy but limited)
- **Cost:** $7/month (no free tier anymore)
- **Setup Time:** 10 minutes
- **Best For:** Familiar platform

---

## 🚂 Option 1: Railway (Recommended - Easiest)

### Step 1: Sign Up
1. Go to https://railway.app
2. Sign up with GitHub (recommended)

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `ayuuto-backend-updated` repository
4. Railway will auto-detect Node.js

### Step 3: Set Up MongoDB Atlas (Free Cloud Database)
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free account)
3. Create a new cluster (Free tier - M0)
4. Wait for cluster to be created (~3-5 minutes)
5. Click "Connect" → "Connect your application"
6. Copy the connection string (looks like):
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<password>` with your database password
8. Add `/ayuuto` at the end:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ayuuto?retryWrites=true&w=majority
   ```

### Step 4: Configure Environment Variables in Railway
1. In Railway project, go to "Variables" tab
2. Add these variables:

```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ayuuto?retryWrites=true&w=majority

# Server
PORT=5001
NODE_ENV=production
HOST=0.0.0.0

# JWT Secret (generate a random string, at least 32 characters)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long

# Email Service (Choose ONE option)

# Option A: SendGrid (Recommended)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Option B: Gmail SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
EMAIL_FROM=your_email@gmail.com

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your_firebase_project_id
# For Firebase Service Account, see Step 5 below
```

### Step 5: Set Up Firebase Service Account
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. In Railway, add environment variable:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Copy the entire JSON content and paste it (as a single line, or use Railway's JSON editor)

### Step 6: Configure Build Settings
Railway auto-detects, but verify:
- **Build Command:** `npm install` (or leave empty)
- **Start Command:** `npm start`
- **Root Directory:** `/` (or leave empty)

### Step 7: Deploy
1. Railway will automatically deploy when you push to GitHub
2. Or click "Deploy" button
3. Wait 2-3 minutes for deployment

### Step 8: Get Your Live URL
1. After deployment, Railway gives you a URL like:
   ```
   https://ayuuto-backend-production.up.railway.app
   ```
2. Copy this URL - this is your production API URL!

### Step 9: Update Mobile App
Update `ayuuto-mobile/utils/api.ts`:
```typescript
// Add production URL support
const PRODUCTION_API_URL = 'https://ayuuto-backend-production.up.railway.app/api';
const IS_PRODUCTION = true; // Set to true for production

const getApiBaseUrl = () => {
  if (IS_PRODUCTION) {
    return PRODUCTION_API_URL;
  }
  // ... rest of your existing code
};
```

---

## 🎨 Option 2: Render (Free Tier Available)

### Step 1: Sign Up
1. Go to https://render.com
2. Sign up with GitHub

### Step 2: Create New Web Service
1. Click "New" → "Web Service"
2. Connect your `ayuuto-backend-updated` repository
3. Configure:
   - **Name:** `ayuuto-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or Starter $7/month)

### Step 3: Set Environment Variables
Same as Railway (see Step 4 above)

### Step 4: Deploy
1. Click "Create Web Service"
2. Wait 5-10 minutes for first deployment
3. Get your URL: `https://ayuuto-backend.onrender.com`

---

## 🌊 Option 3: DigitalOcean App Platform

See `DEPLOY_TO_DIGITALOCEAN.md` for detailed instructions.

**Quick Steps:**
1. Push code to GitHub
2. Go to https://cloud.digitalocean.com/apps
3. Create App → Connect GitHub repo
4. Configure environment variables
5. Deploy

---

## 📱 Update Mobile App for Production

### Option A: Environment-Based Configuration

Update `ayuuto-mobile/utils/api.ts`:

```typescript
// Production configuration
const PRODUCTION_API_URL = 'https://your-backend-url.com/api';
const IS_PRODUCTION = __DEV__ ? false : true; // Auto-detect production in release builds

const getApiBaseUrl = () => {
  // Use production URL in release builds
  if (IS_PRODUCTION || process.env.EXPO_PUBLIC_USE_PRODUCTION === 'true') {
    return PRODUCTION_API_URL;
  }
  
  // Development URLs (existing code)
  if (Platform.OS === 'web') {
    return `http://localhost:${BACKEND_PORT}/api`;
  } else if (Platform.OS === 'ios') {
    return IS_PHYSICAL_DEVICE
      ? `http://${PHYSICAL_DEVICE_IP}:${BACKEND_PORT}/api`
      : `http://localhost:${BACKEND_PORT}/api`;
  } else if (Platform.OS === 'android') {
    return IS_PHYSICAL_DEVICE
      ? `http://${PHYSICAL_DEVICE_IP}:${BACKEND_PORT}/api`
      : `http://10.0.2.2:${BACKEND_PORT}/api`;
  }
  return `http://localhost:${BACKEND_PORT}/api`;
};
```

### Option B: Build-Time Configuration

Create `ayuuto-mobile/.env.production`:
```
EXPO_PUBLIC_API_URL=https://your-backend-url.com/api
```

Then in `api.ts`:
```typescript
const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-backend-url.com/api';
```

---

## ✅ Post-Deployment Checklist

### Test Your Live Server
```bash
# Test root endpoint
curl https://your-backend-url.com/

# Test API health
curl https://your-backend-url.com/api/auth/health
```

### Update Email Links
Make sure email service uses production URL:
- Update `FRONTEND_URL` or `BACKEND_URL` env variable to your production URL
- Test email invitations

### Security Checklist
- [ ] Use strong `JWT_SECRET` (32+ characters)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] HTTPS enabled (automatic on Railway/Render)
- [ ] CORS configured (currently allows all origins - consider restricting in production)
- [ ] Environment variables secured (not in code)

### Mobile App Testing
- [ ] Test login/register
- [ ] Test group creation
- [ ] Test share links
- [ ] Test email invitations
- [ ] Test push notifications

---

## 🔄 Updating Your Deployment

### Railway/Render
Just push to GitHub - auto-deploys!

```bash
cd ayuuto-backend
git add .
git commit -m "Update: description of changes"
git push
```

### Manual Deploy
1. Push to GitHub
2. Platform auto-detects and redeploys
3. Check deployment logs

---

## 🐛 Troubleshooting

### Server Won't Start
- Check environment variables are set correctly
- Check MongoDB connection string
- Check logs in Railway/Render dashboard

### MongoDB Connection Failed
- Verify IP whitelist in MongoDB Atlas (add `0.0.0.0/0` for all IPs)
- Check connection string format
- Verify username/password

### Email Not Sending
- Verify SendGrid API key
- Check sender email is verified in SendGrid
- Check email service logs

### Mobile App Can't Connect
- Verify production URL is correct
- Check CORS settings
- Test URL in browser first
- Check network connectivity

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **Railway** | $5 credit/month | $5/month | Easiest setup |
| **Render** | Free (with limits) | $7/month | Free tier users |
| **DigitalOcean** | No | $5/month | More control |
| **Heroku** | No | $7/month | Familiar platform |

---

## 🎯 Recommended Setup

**For Quick Start:**
1. Use **Railway** (easiest)
2. MongoDB Atlas (free tier)
3. SendGrid for emails (free tier: 100 emails/day)

**Total Cost:** $0-5/month

---

## 📞 Need Help?

1. Check platform logs (Railway/Render dashboard)
2. Test endpoints with `curl` or Postman
3. Check MongoDB Atlas connection
4. Verify environment variables

---

## 🚀 Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Update mobile app to use production URL
3. ✅ Test email invitations
4. ✅ Set up monitoring (optional)
5. ✅ Configure custom domain (optional)

---

**Your backend is now live and accessible from anywhere! 🎉**

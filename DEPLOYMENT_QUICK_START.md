# Quick Start: Deploy to DigitalOcean App Platform

## ⚡ Fastest Method (5-10 minutes)

### Step 1: Push Code to GitHub
```bash
cd ayuuto-backend
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/yourusername/ayuuto-backend.git
git push -u origin main
```

### Step 2: Set Up MongoDB Atlas (Free)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account → Create cluster (Free tier)
3. Database Access → Create user (save password)
4. Network Access → Add IP: `0.0.0.0/0`
5. Connect → Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/ayuuto?retryWrites=true&w=majority
   ```

### Step 3: Deploy to DigitalOcean
1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub → Select `ayuuto-backend` repo
4. Configure:
   - **Build Command:** `npm install`
   - **Run Command:** `npm start`
   - **HTTP Port:** `5001`
5. Add Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ayuuto?retryWrites=true&w=majority
   JWT_SECRET=your_very_long_random_secret_key_here_min_32_chars
   PORT=5001
   NODE_ENV=production
   SENDGRID_API_KEY=your_sendgrid_key
   SENDGRID_FROM_EMAIL=noreply@ayuuto.com
   ```
6. Click "Create Resources"
7. Wait 3-5 minutes for deployment
8. Copy your app URL: `https://ayuuto-backend-xxxxx.ondigitalocean.app`

### Step 4: Update Mobile App
In `ayuuto-mobile/utils/api.ts`, update:
```typescript
const PRODUCTION_API_URL = 'https://ayuuto-backend-xxxxx.ondigitalocean.app/api';
```

## ✅ Done!

Your backend is now live! Test it:
```bash
curl https://ayuuto-backend-xxxxx.ondigitalocean.app/api/health
```

---

## 🔧 Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/ayuuto` |
| `JWT_SECRET` | Secret for JWT tokens | `your_super_secret_key_min_32_chars` |
| `PORT` | Server port | `5001` |
| `NODE_ENV` | Environment | `production` |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.xxxxx` |
| `SENDGRID_FROM_EMAIL` | Verified sender email | `noreply@ayuuto.com` |

---

## 📝 Notes

- **Free MongoDB Atlas:** 512MB storage (perfect for testing)
- **DigitalOcean App Platform:** $5/month minimum
- **SSL/HTTPS:** Automatically included
- **Auto-deploy:** Push to GitHub = auto deploy

For detailed instructions, see `DEPLOY_TO_DIGITALOCEAN.md`

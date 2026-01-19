# Deploy Ayuuto Backend to DigitalOcean

This guide covers deploying the Ayuuto backend to DigitalOcean using two methods:
1. **DigitalOcean App Platform** (Recommended - Easiest)
2. **DigitalOcean Droplet** (More control, requires server management)

---

## Prerequisites

- DigitalOcean account (sign up at https://www.digitalocean.com)
- MongoDB database (MongoDB Atlas recommended for cloud database)
- GitHub account (for App Platform deployment)
- Domain name (optional, but recommended)

---

## Method 1: DigitalOcean App Platform (Recommended)

### Step 1: Prepare Your Code

1. **Ensure your code is in a Git repository:**
   ```bash
   cd ayuuto-backend
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub:**
   - Create a new repository on GitHub
   - Push your code:
     ```bash
     git remote add origin https://github.com/yourusername/ayuuto-backend.git
     git branch -M main
     git push -u origin main
     ```

### Step 2: Set Up MongoDB Atlas (Cloud Database)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster (Free tier available)
4. Create a database user:
   - Go to "Database Access"
   - Add new database user
   - Save the username and password
5. Whitelist IP addresses:
   - Go to "Network Access"
   - Add IP address: `0.0.0.0/0` (allows all IPs) or specific DigitalOcean IPs
6. Get connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (replace `<password>` with your password)

### Step 3: Create App on DigitalOcean App Platform

1. **Log in to DigitalOcean:**
   - Go to https://cloud.digitalocean.com
   - Navigate to "App Platform"

2. **Create New App:**
   - Click "Create App"
   - Connect your GitHub account
   - Select your `ayuuto-backend` repository
   - Choose the branch (usually `main`)

3. **Configure App:**
   - **Name:** `ayuuto-backend` (or your preferred name)
   - **Type:** Web Service
   - **Source Directory:** Leave empty (or `ayuuto-backend` if repo is in subfolder)
   - **Build Command:** `npm install`
   - **Run Command:** `npm start`
   - **HTTP Port:** `5001` (or your PORT from .env)

4. **Environment Variables:**
   Add these in the App Platform settings:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ayuuto?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=5001
   NODE_ENV=production
   
   # Email Configuration (choose one)
   # Option 1: SendGrid
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=noreply@ayuuto.com
   
   # Option 2: Gmail SMTP
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM=your_email@gmail.com
   
   # Firebase (for push notifications)
   FIREBASE_PROJECT_ID=your_firebase_project_id
   # Upload firebase-service-account.json content as FIREBASE_SERVICE_ACCOUNT
   ```

5. **Firebase Service Account:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate new private key
   - Copy the JSON content
   - In DigitalOcean, add environment variable:
     - Key: `FIREBASE_SERVICE_ACCOUNT`
     - Value: (paste entire JSON as a single line, or use base64 encoding)

6. **Review and Deploy:**
   - Review your configuration
   - Click "Create Resources"
   - DigitalOcean will build and deploy your app

7. **Get Your App URL:**
   - After deployment, you'll get a URL like: `https://ayuuto-backend-xxxxx.ondigitalocean.app`
   - This is your production API URL

### Step 4: Update Mobile App API URL

Update your mobile app's API configuration to use the production URL:

**File: `ayuuto-mobile/utils/api.ts`**
```typescript
// For production, set IS_PHYSICAL_DEVICE = true
// and update PHYSICAL_DEVICE_IP to your DigitalOcean app URL
const PRODUCTION_API_URL = 'https://ayuuto-backend-xxxxx.ondigitalocean.app/api';
```

---

## Method 2: DigitalOcean Droplet (VPS)

### Step 1: Create a Droplet

1. **Create Droplet:**
   - Go to DigitalOcean → Droplets → Create Droplet
   - Choose Ubuntu 22.04 LTS
   - Select plan: Basic ($6/month minimum for 1GB RAM)
   - Choose datacenter region
   - Add SSH keys (recommended) or use password
   - Create droplet

2. **Note Your Droplet IP:**
   - Copy the IP address (e.g., `123.45.67.89`)

### Step 2: Connect to Your Droplet

```bash
ssh root@your_droplet_ip
```

### Step 3: Set Up Server

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Git
apt install -y git

# Install Nginx (for reverse proxy)
apt install -y nginx

# Install Certbot (for SSL)
apt install -y certbot python3-certbot-nginx
```

### Step 4: Clone and Set Up Your App

```bash
# Create app directory
mkdir -p /var/www
cd /var/www

# Clone your repository
git clone https://github.com/yourusername/ayuuto-backend.git
cd ayuuto-backend

# Install dependencies
npm install --production

# Create .env file
nano .env
```

**Add to .env:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ayuuto?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
PORT=5001
NODE_ENV=production
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@ayuuto.com
# ... other environment variables
```

### Step 5: Set Up Firebase Service Account

```bash
# Create config directory
mkdir -p /var/www/ayuuto-backend/config

# Upload firebase-service-account.json
# Use scp from your local machine:
# scp config/firebase-service-account.json root@your_droplet_ip:/var/www/ayuuto-backend/config/
```

### Step 6: Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/ayuuto-backend
```

**Add this configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com api.ayuuto.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/ayuuto-backend /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### Step 7: Set Up SSL with Let's Encrypt

```bash
# Get SSL certificate
certbot --nginx -d your-domain.com -d api.ayuuto.com

# Certbot will automatically configure SSL
```

### Step 8: Start Your App with PM2

```bash
cd /var/www/ayuuto-backend

# Start app with PM2
pm2 start server.js --name ayuuto-backend

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

### Step 9: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### Step 10: Update Mobile App

Update your mobile app to use the production URL:
- If using domain: `https://api.ayuuto.com/api`
- If using IP: `http://your_droplet_ip/api` (not recommended for production)

---

## Post-Deployment Checklist

### ✅ Security

- [ ] Change default passwords
- [ ] Use strong JWT_SECRET (at least 32 characters)
- [ ] Enable MongoDB authentication
- [ ] Restrict MongoDB IP whitelist to DigitalOcean IPs
- [ ] Use HTTPS (SSL certificate)
- [ ] Review CORS settings (restrict origins in production)
- [ ] Set NODE_ENV=production

### ✅ Monitoring

- [ ] Set up DigitalOcean monitoring/alerts
- [ ] Configure PM2 monitoring (if using Droplet)
- [ ] Set up log aggregation
- [ ] Monitor MongoDB Atlas metrics

### ✅ Backup

- [ ] Enable MongoDB Atlas backups
- [ ] Set up automated backups
- [ ] Test restore process

### ✅ Testing

- [ ] Test API endpoints
- [ ] Test authentication flow
- [ ] Test email sending
- [ ] Test push notifications
- [ ] Test scheduled notifications (cron jobs)

---

## Updating Your Deployment

### App Platform:
- Push changes to GitHub
- DigitalOcean automatically rebuilds and deploys

### Droplet:
```bash
ssh root@your_droplet_ip
cd /var/www/ayuuto-backend
git pull
npm install --production
pm2 restart ayuuto-backend
```

---

## Troubleshooting

### Check Logs

**App Platform:**
- Go to App Platform → Your App → Runtime Logs

**Droplet:**
```bash
# PM2 logs
pm2 logs ayuuto-backend

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Common Issues

1. **App won't start:**
   - Check environment variables
   - Check MongoDB connection string
   - Check PORT configuration

2. **502 Bad Gateway:**
   - Check if app is running: `pm2 list`
   - Check app logs: `pm2 logs`
   - Check Nginx configuration

3. **MongoDB connection failed:**
   - Verify IP whitelist in MongoDB Atlas
   - Check connection string format
   - Verify database user credentials

4. **Email not sending:**
   - Verify SendGrid API key
   - Check sender email verification
   - Review email service logs

---

## Cost Estimation

### App Platform:
- **Basic Plan:** $5/month (512MB RAM, 1GB storage)
- **Professional Plan:** $12/month (1GB RAM, 1GB storage) - Recommended

### Droplet:
- **Basic Droplet:** $6/month (1GB RAM, 1 vCPU, 25GB storage)
- **Plus MongoDB Atlas:** Free tier available

### MongoDB Atlas:
- **Free Tier:** 512MB storage (perfect for development/small apps)
- **M10:** $57/month (10GB storage, production-ready)

---

## Support Resources

- DigitalOcean Docs: https://docs.digitalocean.com
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- Node.js Deployment: https://nodejs.org/en/docs/guides/nodejs-docker-webapp/

---

## Next Steps

After deployment:
1. Update mobile app API URL to production
2. Test all features in production
3. Set up monitoring and alerts
4. Configure domain name (optional but recommended)
5. Set up CI/CD for automated deployments

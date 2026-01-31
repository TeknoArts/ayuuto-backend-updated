# 🚀 Deploy Ayuuto Backend to DigitalOcean Droplet

Complete guide for deploying your backend to a DigitalOcean Droplet (VPS).

---

## 📋 Prerequisites

- DigitalOcean account (sign up at https://www.digitalocean.com)
- GitHub account with repository access
- MongoDB Atlas account (for cloud database)
- Domain name (optional but recommended)

---

## Step 1: Create DigitalOcean Droplet

1. **Go to DigitalOcean Dashboard:**
   - Visit: https://cloud.digitalocean.com
   - Click "Create" → "Droplets"

2. **Configure Droplet:**
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic ($6/month - 1GB RAM, 1 vCPU, 25GB storage)
   - **Datacenter:** Choose closest to your users
   - **Authentication:** SSH keys (recommended) or password
   - **Hostname:** `ayuuto-backend` (optional)

3. **Create Droplet:**
   - Click "Create Droplet"
   - Wait 1-2 minutes for provisioning
   - **Note your Droplet IP address** (e.g., `123.45.67.89`)

---

## Step 2: Connect to Your Droplet

### Option A: Using SSH Key (Recommended)

```bash
ssh root@your_droplet_ip
```

### Option B: Using Password

```bash
ssh root@your_droplet_ip
# Enter password when prompted
```

---

## Step 3: Run Deployment Script

### Quick Deploy (Automated)

1. **Upload deployment script:**
   ```bash
   # From your local machine
   scp deploy-droplet.sh root@your_droplet_ip:/root/
   ```

2. **Make script executable and run:**
   ```bash
   # On the Droplet
   chmod +x /root/deploy-droplet.sh
   /root/deploy-droplet.sh
   ```

### Manual Deploy (Step-by-Step)

Follow the manual steps below if you prefer more control.

---

## Step 4: Manual Setup (Alternative)

### 4.1 Update System

```bash
apt update && apt upgrade -y
```

### 4.2 Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Should show v20.x.x
```

### 4.3 Install PM2

```bash
npm install -g pm2
pm2 --version
```

### 4.4 Install Git

```bash
apt install -y git
```

### 4.5 Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 4.6 Clone Repository

```bash
mkdir -p /var/www
cd /var/www
git clone git@github.com:TeknoArts/ayuuto-backend-updated.git ayuuto-backend
cd ayuuto-backend
```

**If using HTTPS instead of SSH:**
```bash
git clone https://github.com/TeknoArts/ayuuto-backend-updated.git ayuuto-backend
```

### 4.7 Install Dependencies

```bash
cd /var/www/ayuuto-backend
npm install --production
```

### 4.8 Create Environment File

```bash
nano /var/www/ayuuto-backend/.env
```

**Add these variables:**

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ayuuto?retryWrites=true&w=majority

# JWT Secret (use a strong random string, at least 32 characters)
JWT_SECRET=your_super_secret_jwt_key_change_this_to_random_string

# Server Configuration
PORT=5001
NODE_ENV=production
HOST=0.0.0.0

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
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### 4.9 Upload Firebase Service Account

```bash
# From your local machine
scp config/firebase-service-account.json root@your_droplet_ip:/var/www/ayuuto-backend/config/
```

Or create the file manually on the server:

```bash
mkdir -p /var/www/ayuuto-backend/config
nano /var/www/ayuuto-backend/config/firebase-service-account.json
# Paste your Firebase service account JSON
```

### 4.10 Create PM2 Ecosystem File

```bash
nano /var/www/ayuuto-backend/ecosystem.config.js
```

**Add:**

```javascript
module.exports = {
  apps: [{
    name: 'ayuuto-backend',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: '/var/log/pm2/ayuuto-backend-error.log',
    out_file: '/var/log/pm2/ayuuto-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

### 4.11 Start Application with PM2

```bash
cd /var/www/ayuuto-backend
mkdir -p /var/log/pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
# Follow the instructions it provides
```

### 4.12 Configure Nginx

```bash
nano /etc/nginx/sites-available/ayuuto-backend
```

**Add:**

```nginx
server {
    listen 80;
    server_name your-domain.com api.ayuuto.com;  # Replace with your domain or _ for all

    client_max_body_size 10M;

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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Enable site:**

```bash
ln -s /etc/nginx/sites-available/ayuuto-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 4.13 Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## Step 5: Set Up SSL (HTTPS)

### 5.1 Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 5.2 Get SSL Certificate

**If you have a domain:**

```bash
certbot --nginx -d your-domain.com -d api.ayuuto.com
```

**Follow the prompts:**
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

**If you don't have a domain yet:**
- You can skip SSL for now
- Access via HTTP: `http://your_droplet_ip`
- Set up SSL later when you have a domain

---

## Step 6: Update MongoDB Atlas IP Whitelist

1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Add your Droplet IP: `your_droplet_ip/32`
4. Or add `0.0.0.0/0` to allow all IPs (less secure)

---

## Step 7: Test Your Deployment

### Check PM2 Status

```bash
pm2 list
pm2 logs ayuuto-backend
```

### Test API Endpoint

```bash
# From your local machine or browser
curl http://your_droplet_ip/api/health
# Should return: {"success":true,"message":"Ayuuto Backend API is running"}
```

### Check Nginx Status

```bash
systemctl status nginx
tail -f /var/log/nginx/error.log
```

---

## Step 8: Update Mobile App

Update your mobile app's API URL:

**File: `ayuuto-mobile/utils/api.ts`**

```typescript
const PRODUCTION_API_URL = 'https://your-domain.com/api';
// Or if no domain: 'http://your_droplet_ip/api'
```

---

## 🔄 Updating Your Deployment

When you push changes to GitHub:

```bash
ssh root@your_droplet_ip
cd /var/www/ayuuto-backend
git pull
npm install --production
pm2 restart ayuuto-backend
pm2 logs ayuuto-backend  # Check logs
```

---

## 📊 Monitoring & Management

### PM2 Commands

```bash
pm2 list                    # List all apps
pm2 logs ayuuto-backend     # View logs
pm2 restart ayuuto-backend  # Restart app
pm2 stop ayuuto-backend     # Stop app
pm2 delete ayuuto-backend   # Remove app
pm2 monit                   # Monitor resources
```

### Nginx Commands

```bash
systemctl status nginx      # Check status
systemctl restart nginx     # Restart
nginx -t                    # Test configuration
tail -f /var/log/nginx/access.log   # Access logs
tail -f /var/log/nginx/error.log    # Error logs
```

### System Resources

```bash
htop                        # CPU/Memory usage
df -h                       # Disk usage
free -h                     # Memory usage
```

---

## 🔒 Security Checklist

- [ ] Change default root password
- [ ] Use SSH keys instead of passwords
- [ ] Set up firewall (UFW)
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable MongoDB authentication
- [ ] Restrict MongoDB IP whitelist
- [ ] Set up SSL certificate (HTTPS)
- [ ] Keep system updated: `apt update && apt upgrade`
- [ ] Review CORS settings in production
- [ ] Set NODE_ENV=production

---

## 🐛 Troubleshooting

### App Won't Start

```bash
# Check PM2 logs
pm2 logs ayuuto-backend --lines 50

# Check if port is in use
netstat -tulpn | grep 5001

# Check environment variables
cd /var/www/ayuuto-backend
cat .env
```

### 502 Bad Gateway

```bash
# Check if app is running
pm2 list

# Check Nginx error logs
tail -f /var/log/nginx/error.log

# Test Nginx config
nginx -t

# Restart services
pm2 restart ayuuto-backend
systemctl restart nginx
```

### MongoDB Connection Failed

```bash
# Check MongoDB URI in .env
cat /var/www/ayuuto-backend/.env | grep MONGODB_URI

# Test connection from server
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.error(e))"
```

### Port Already in Use

```bash
# Find what's using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>
```

---

## 💰 Cost Estimation

- **Droplet:** $6/month (Basic - 1GB RAM)
- **MongoDB Atlas:** Free tier available
- **Domain:** ~$10-15/year (optional)
- **Total:** ~$6-7/month

---

## 📚 Useful Resources

- DigitalOcean Docs: https://docs.digitalocean.com
- PM2 Docs: https://pm2.keymetrics.io/docs
- Nginx Docs: https://nginx.org/en/docs/
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas

---

## ✅ Post-Deployment Checklist

- [ ] App is running: `pm2 list`
- [ ] API responds: `curl http://your_droplet_ip/api/health`
- [ ] Nginx is running: `systemctl status nginx`
- [ ] SSL certificate installed (if using domain)
- [ ] MongoDB connection working
- [ ] Mobile app updated with new API URL
- [ ] Firewall configured
- [ ] Monitoring set up

---

**Your backend is now live! 🎉**

#!/bin/bash

# DigitalOcean Droplet Deployment Script for Ayuuto Backend
# Run this script on your Droplet after initial setup

set -e

echo "🚀 Starting Ayuuto Backend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/ayuuto-backend"
REPO_URL="git@github.com:TeknoArts/ayuuto-backend-updated.git"
APP_NAME="ayuuto-backend"
PORT=5001

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Step 1: Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Step 2: Install Node.js
echo -e "${YELLOW}📦 Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo "Node.js already installed: $(node --version)"
fi

# Step 3: Install PM2
echo -e "${YELLOW}📦 Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 already installed"
fi

# Step 4: Install Git
echo -e "${YELLOW}📦 Installing Git...${NC}"
apt install -y git

# Step 5: Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
else
    echo "Nginx already installed"
fi

# Step 6: Create app directory
echo -e "${YELLOW}📁 Creating app directory...${NC}"
mkdir -p /var/www
cd /var/www

# Step 7: Clone or update repository
if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}📥 Updating existing repository...${NC}"
    cd $APP_DIR
    git pull
else
    echo -e "${YELLOW}📥 Cloning repository...${NC}"
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Step 8: Install dependencies
echo -e "${YELLOW}📦 Installing npm dependencies...${NC}"
npm install --production

# Step 9: Check for .env file
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating template...${NC}"
    cat > $APP_DIR/.env << EOF
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ayuuto?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here_change_this

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
EOF
    echo -e "${RED}⚠️  Please edit $APP_DIR/.env with your actual values!${NC}"
    echo -e "${YELLOW}Press Enter to continue after editing .env file...${NC}"
    read
fi

# Step 10: Create PM2 ecosystem file
echo -e "${YELLOW}⚙️  Creating PM2 ecosystem file...${NC}"
cat > $APP_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: '/var/log/pm2/$APP_NAME-error.log',
    out_file: '/var/log/pm2/$APP_NAME-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

# Step 11: Create PM2 log directory
mkdir -p /var/log/pm2

# Step 12: Start/restart app with PM2
echo -e "${YELLOW}🚀 Starting application with PM2...${NC}"
cd $APP_DIR
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Step 13: Setup PM2 startup
echo -e "${YELLOW}⚙️  Setting up PM2 startup script...${NC}"
pm2 startup systemd -u root --hp /root | grep -v "PM2" | bash || true

# Step 14: Create Nginx configuration
echo -e "${YELLOW}⚙️  Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/$APP_NAME << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;  # Replace with your domain name

    # Increase body size limit for file uploads
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX_CONFIG

# Enable site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Step 15: Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw reload

# Step 16: Display status
echo -e "\n${GREEN}✅ Deployment completed!${NC}\n"
echo -e "${GREEN}📊 Application Status:${NC}"
pm2 list
echo ""
echo -e "${GREEN}📝 Next Steps:${NC}"
echo "1. Edit .env file: nano $APP_DIR/.env"
echo "2. Restart app: pm2 restart $APP_NAME"
echo "3. Check logs: pm2 logs $APP_NAME"
echo "4. Set up SSL: certbot --nginx -d your-domain.com"
echo ""
echo -e "${GREEN}🌐 Your app should be accessible at:${NC}"
echo "   http://$(curl -s ifconfig.me)"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo "   - Update MongoDB Atlas IP whitelist with your Droplet IP"
echo "   - Configure your domain DNS to point to this Droplet"
echo "   - Set up SSL certificate with Certbot"

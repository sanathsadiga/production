# MMCL Production - Complete Deployment Guide

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Server Deployment Setup](#server-deployment-setup)
3. [Database Migration Strategy](#database-migration-strategy)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Monitoring & Maintenance](#monitoring--maintenance)

## Local Development Setup

### Step 1: Install Dependencies

```bash
# Install Node.js 18+
node --version  # Should be v18 or higher

# Install MySQL
mysql --version  # Should be 8.0+

# Clone the project
cd mmcl-production

# Install all dependencies
npm run install:all
```

### Step 2: Database Setup

```bash
cd database

# Execute schema (creates tables)
mysql -u root -p < schema.sql
# Enter password when prompted

# Load master data (users, publications, etc)
mysql -u root -p mmcl_production < seed_data.sql

# Verify setup
mysql -u root -p -e "USE mmcl_production; SHOW TABLES;"
```

### Step 3: Backend Setup

```bash
cd backend

# Create .env file
cp .env.example .env

# Edit .env
nano .env
# Update DB credentials if needed

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start in development mode
npm run dev
# Should see: ✅ Server running on http://localhost:5000
```

### Step 4: Frontend Setup

```bash
cd ../frontend

# Create .env file
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm start
# Should open http://localhost:3000 in browser
```

### Step 5: Test Login

Visit `http://localhost:3000` and login with:
- User: `user1@mmcl.com` / `user123`
- Admin: `admin1@mmcl.com` / `admin123`

## Server Deployment Setup

### Prerequisites
- Ubuntu 20.04+ server
- Root or sudo access
- 4GB RAM minimum
- 20GB disk space minimum

### Step 1: Server Initial Setup

```bash
# SSH into server
ssh user@production.projectdesigners.cloud

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt-get install -y mysql-server

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Enable UFW firewall
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

### Step 2: MySQL Database Setup

```bash
# Connect to MySQL
sudo mysql

# Inside MySQL:
CREATE DATABASE mmcl_production;
CREATE USER 'mmcl_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON mmcl_production.* TO 'mmcl_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Verify connection
mysql -u mmcl_user -p -e "USE mmcl_production; SHOW TABLES;"
```

### Step 3: Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/www/mmcl-production
sudo chown -R $USER:$USER /var/www/mmcl-production
cd /var/www/mmcl-production

# Clone from GitHub
git clone <your-repo-url> .

# Setup database
mysql -u mmcl_user -p mmcl_production < database/schema.sql
mysql -u mmcl_user -p mmcl_production < database/seed_data.sql

# Setup backend
cd backend
cp .env.example .env
# Edit .env with production values
nano .env
# Set: DB_USER=mmcl_user, DB_PASSWORD, NODE_ENV=production

npm install --production
npm run build

# Start with PM2
pm2 start dist/index.js --name mmcl-backend --instances 2 --exec-mode cluster
pm2 save
pm2 startup

# Setup frontend
cd ../frontend
npm install --production
npm run build

# Copy build to web directory
sudo mkdir -p /var/www/mmcl-frontend
sudo cp -r build/* /var/www/mmcl-frontend/
sudo chown -R www-data:www-data /var/www/mmcl-frontend
```

### Step 4: Nginx Configuration

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/mmcl

# Paste this:
```

```nginx
upstream mmcl_backend {
  server 127.0.0.1:5000;
  keepalive 32;
}

server {
  listen 80;
  server_name production.projectdesigners.cloud;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name production.projectdesigners.cloud;
  root /var/www/mmcl-frontend;

  ssl_certificate /etc/letsencrypt/live/production.projectdesigners.cloud/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/production.projectdesigners.cloud/privkey.pem;

  # Performance settings
  gzip on;
  gzip_types text/plain text/css text/javascript application/json application/javascript;
  client_max_body_size 10M;

  # API proxy
  location /api/ {
    proxy_pass http://mmcl_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Frontend
  location / {
    try_files $uri /index.html;
  }

  # Cache static assets
  location ~* \.(js|css|png|jpg|gif|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mmcl /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Step 5: SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d production.projectdesigners.cloud
# Choose email and agree to terms

# Test auto-renewal
sudo certbot renew --dry-run

# Setup auto-renewal (cron)
sudo certbot renew --quiet
```

## Database Migration Strategy

### Schema Changes

Never modify hardcoded users in constants.ts manually. Instead:

```bash
# 1. Update database/seed_data.sql
nano database/seed_data.sql

# 2. Re-run migration
mysql -u mmcl_user -p mmcl_production < database/seed_data.sql

# 3. Restart backend
pm2 restart mmcl-backend
```

### Adding New Master Data

```sql
-- Example: Add new publication
INSERT INTO publications (name, code) VALUES ('New Publication', 'NP');

-- Update constants.ts with the new data
```

### Backup Strategy

```bash
# Daily backup script
# /usr/local/bin/backup-mmcl.sh

#!/bin/bash
BACKUP_DIR="/backups/mmcl"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mysqldump -u mmcl_user -p$DB_PASS mmcl_production | gzip > $BACKUP_DIR/mmcl_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete

# Make executable
chmod +x /usr/local/bin/backup-mmcl.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-mmcl.sh") | crontab -
```

## CI/CD Pipeline

### GitHub Actions Setup

1. Go to Repository Settings > Secrets and add:
   - `SERVER_HOST`: production.projectdesigners.cloud
   - `SERVER_USER`: deployment_user
   - `SERVER_SSH_KEY`: (private SSH key)

2. Generate SSH key on server:
```bash
# On server
ssh-keygen -t rsa -b 4096 -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys

# Copy private key content
cat ~/.ssh/deploy_key

# Paste into GitHub secret: SERVER_SSH_KEY
```

3. Commits to `main` branch automatically:
   - Build backend & frontend
   - Run tests
   - Deploy to server
   - Restart services

### Manual Deployment

```bash
# On local machine
git push origin main

# GitHub Actions will automatically:
# 1. Build backend
# 2. Build frontend  
# 3. Deploy via SSH
# 4. Restart services on server

# Check deployment status
# Go to Actions tab in GitHub
```

## Monitoring & Maintenance

### Check Services

```bash
# Check backend status
pm2 status

# View backend logs
pm2 logs mmcl-backend --lines 50

# Check Nginx status
sudo systemctl status nginx

# Check MySQL status
sudo systemctl status mysql

# Monitor system resources
htop
```

### Common Issues & Solutions

**Backend not responding:**
```bash
# Check if process is running
pm2 status

# Restart if needed
pm2 restart mmcl-backend

# View error logs
pm2 logs mmcl-backend --err
```

**Database connection error:**
```bash
# Test connection
mysql -u mmcl_user -p -e "SELECT 1;"

# Check MySQL service
sudo systemctl restart mysql
```

**High memory usage:**
```bash
# Restart backend
pm2 restart mmcl-backend

# Reduce instances if needed
pm2 start dist/index.js --name mmcl-backend --instances 1
pm2 save
```

### Performance Optimization

```bash
# Enable MySQL query caching
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Add:
# query_cache_size = 32M
# query_cache_type = 1

sudo systemctl restart mysql

# Optimize Nginx
# Already configured with gzip and caching
```

### Security Updates

```bash
# Monthly security updates
sudo apt-get update
sudo apt-get upgrade -y

# Update Node packages
cd /var/www/mmcl-production
npm update --production
npm run build
pm2 restart mmcl-backend
```

## Final Verification

✅ Access https://production.projectdesigners.cloud
✅ Login with admin1@mmcl.com / admin123
✅ Submit a test record as user1@mmcl.com / user123
✅ View analytics in admin dashboard
✅ Check SSL certificate (green lock)
✅ Database backups running
✅ PM2 auto-start configured
✅ GitHub Actions deploying successfully

---

**Success!** Your MMCL Production application is now live.

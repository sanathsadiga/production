# MMCL Production Dashboard Application

Complete full-stack application for MMCL Production with User and Admin dashboards.

## Project Structure

```
mmcl-production/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React context (Auth)
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── styles/          # CSS files
│   │   ├── App.tsx
│   │   └── index.tsx
│   └── package.json
│
├── backend/                  # Express.js backend API
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── constants.ts     # Hardcoded master data
│   │   ├── db.ts            # Database configuration
│   │   └── index.ts         # Server entry point
│   ├── tsconfig.json
│   └── package.json
│
├── database/                 # Database scripts
│   ├── schema.sql           # Database schema
│   ├── seed_data.sql        # Master data & users
│   └── migrate.sh           # Migration script
│
├── docs/                     # Documentation
└── .github/
    └── workflows/
        └── deploy.yml       # GitHub Actions CI/CD
```

## Features

### User Dashboard
- ✅ Welcome message in navbar
- ✅ Hardcoded login (8 users)
- ✅ Production form with fields:
  - Publication (dropdown)
  - PO Number
  - Color & B/W Pages
  - Machine (dropdown)
  - LPRS Time
  - Page Start/End Time
  - Downtime Reason & Duration
  - Newsprint Type & Plate Consumption
  - Remarks (100 char limit)
- ✅ Mobile responsive design

### Admin Dashboard
- ✅ Welcome message in navbar
- ✅ Hardcoded login (3 admins)
- ✅ User name displayed in top right
- ✅ Data filters:
  - Date range (default: Feb 1 - today)
  - Location filter
  - Publication filter
- ✅ Analytics Charts:
  - PO Distribution (Bar Chart)
  - Machine Usage (Pie Chart)
  - LPRS Trend (Line Chart)
  - Newsprint Consumption (Bar Chart)
- ✅ Mobile responsive design

## Tech Stack

- **Frontend**: React 18, TypeScript, Recharts, Axios, React Router
- **Backend**: Express.js, TypeScript, MySQL2
- **Database**: MySQL
- **Deployment**: GitHub Actions, Nginx, PM2
- **Domain**: production.projectdesigners.cloud

## Installation & Setup

### Prerequisites
- Node.js 18+
- MySQL 8+
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd mmcl-production
```

### 2. Database Setup
```bash
# Execute database schema
mysql -u root -p < database/schema.sql

# Load seed data
mysql -u root -p mmcl_production < database/seed_data.sql

# Or run migration script
cd database
chmod +x migrate.sh
./migrate.sh
```

### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Build TypeScript
npm run build

# Start development server
npm run dev

# Production
npm start
```

**Backend runs on**: `http://localhost:5000`

### 4. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env

# Edit .env with API URL
nano .env

# Start development server
npm start

# Build for production
npm run build
```

**Frontend runs on**: `http://localhost:3000`

## Hardcoded Users

### Regular Users (8 users)
```
user1@mmcl.com / user123
user2@mmcl.com / user123
user3@mmcl.com / user123
user4@mmcl.com / user123
user5@mmcl.com / user123
user6@mmcl.com / user123
user7@mmcl.com / user123
user8@mmcl.com / user123
```

### Admin Users (3 admins)
```
admin1@mmcl.com / admin123
admin2@mmcl.com / admin123
admin3@mmcl.com / admin123
```

## Hardcoded Master Data

### Publications
- Vijaya Karnataka
- Lavalavk
- VK Money
- Karnataka Prabha
- Sanjevani

### Machines
- Machine 1, Machine 2, Machine 3, Machine 4

### Downtime Reasons
- Mechanical Failure
- Paper Jams
- Ink Issues
- Maintenance
- Electrical Issue
- Cleaning

### Newsprint Types
- Standard Newsprint
- Premium Newsprint
- Imported Newsprint

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout
- `GET /api/auth/user/:id` - Get user details

### Master Data
- `GET /api/master/publications` - Get all publications
- `GET /api/master/machines` - Get all machines
- `GET /api/master/downtime-reasons` - Get downtime reasons
- `GET /api/master/newsprint-types` - Get newsprint types
- `GET /api/master/locations` - Get all locations

### Production Records
- `POST /api/production/records` - Create new record
- `GET /api/production/records/:user_id` - Get user records
- `GET /api/production/admin/records` - Get filtered records (admin)
- `GET /api/production/analytics/po/:publication_id` - PO analytics
- `GET /api/production/analytics/machine/:publication_id` - Machine analytics
- `GET /api/production/analytics/lprs/:publication_id` - LPRS analytics
- `GET /api/production/analytics/newsprint/:publication_id` - Newsprint analytics

## Server Deployment

### Prerequisites
- Ubuntu server with root access
- Nginx installed
- PM2 installed globally
- MySQL server running
- Node.js 18+ installed

### 1. Server SSH Key Setup
```bash
# Generate SSH key on local machine
ssh-keygen -t rsa -b 4096 -f ~/.ssh/mmcl_server

# Add public key to server
cat ~/.ssh/mmcl_server.pub | ssh user@production.projectdesigners.cloud 'cat >> ~/.ssh/authorized_keys'

# Add to GitHub Secrets
# Settings > Secrets > New repository secret
# SERVER_SSH_KEY = content of ~/.ssh/mmcl_server
# SERVER_HOST = production.projectdesigners.cloud
# SERVER_USER = your_server_user
```

### 2. Server Configuration
```bash
# SSH into server
ssh -i ~/.ssh/mmcl_server user@production.projectdesigners.cloud

# Create application directory
sudo mkdir -p /var/www/mmcl-production
sudo chown -R $USER:$USER /var/www/mmcl-production
cd /var/www/mmcl-production

# Clone repository
git clone <repo-url> .

# Setup MySQL database
mysql -u root -p < database/schema.sql
mysql -u root -p mmcl_production < database/seed_data.sql

# Install PM2 globally
npm install -g pm2

# Install backend dependencies
cd backend
npm install --production
npm run build

# Start backend with PM2
pm2 start dist/index.js --name mmcl-backend
pm2 save
pm2 startup

# Install frontend dependencies
cd ../frontend
npm install --production
npm run build

# Create web directory
sudo mkdir -p /var/www/mmcl-production-frontend
sudo chown -R www-data:www-data /var/www/mmcl-production-frontend
sudo cp -r build/* /var/www/mmcl-production-frontend/
```

### 3. Nginx Configuration
```bash
# Create nginx config
sudo nano /etc/nginx/sites-available/mmcl-production

# Add this configuration:
```

```nginx
# Backend API server
upstream mmcl_backend {
  server 127.0.0.1:5000;
}

# Frontend server
server {
  listen 80;
  server_name production.projectdesigners.cloud;
  
  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name production.projectdesigners.cloud;
  
  # SSL certificates (use Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/production.projectdesigners.cloud/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/production.projectdesigners.cloud/privkey.pem;
  
  # Security headers
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  
  # API routes
  location /api/ {
    proxy_pass http://mmcl_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  
  # Frontend
  location / {
    root /var/www/mmcl-production-frontend;
    try_files $uri $uri/ /index.html;
    expires 1h;
    add_header Cache-Control "public, immutable";
  }
  
  # Static assets caching
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    root /var/www/mmcl-production-frontend;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/mmcl-production /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt (optional)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d production.projectdesigners.cloud
```

### 4. Setup Environment Variables
```bash
# Create backend .env
sudo nano /var/www/mmcl-production/backend/.env

# Add:
DB_HOST=localhost
DB_USER=mmcl_user
DB_PASSWORD=secure_password
DB_NAME=mmcl_production
DB_PORT=3306
SERVER_PORT=5000
NODE_ENV=production
```

### 5. GitHub Actions Setup
Add these secrets to GitHub repository:
- `SERVER_HOST`: production.projectdesigners.cloud
- `SERVER_USER`: your_server_username
- `SERVER_SSH_KEY`: Your private SSH key

## Development Commands

```bash
# Install all dependencies
npm run install:all

# Run frontend (development)
npm run dev:frontend

# Run backend (development)
npm run dev:backend

# Build frontend
npm run build:frontend

# Build backend
npm run build:backend

# Start backend (production)
npm run prod:backend
```

## Database Backup & Recovery

```bash
# Backup database
mysqldump -u root -p mmcl_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
mysql -u root -p mmcl_production < backup_20240203_120000.sql
```

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running: `sudo systemctl status mysql`
- Check credentials in `.env`
- Verify database exists: `mysql -u root -p -e "SHOW DATABASES;"`

### Backend Not Starting
- Check logs: `cd backend && npm run dev`
- Verify port 5000 is not in use: `lsof -i :5000`
- Check TypeScript compilation: `npm run build`

### Frontend Build Issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `npm cache clean --force`
- Check React version compatibility

### Nginx 404 Errors
- Check nginx config: `sudo nginx -t`
- Verify frontend build exists: `ls /var/www/mmcl-production-frontend`
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

## Production Checklist

- [ ] Database backups configured
- [ ] SSL certificates installed
- [ ] Nginx SSL redirect configured
- [ ] PM2 process manager setup
- [ ] GitHub Actions secrets configured
- [ ] Environment variables set
- [ ] Domain DNS configured
- [ ] Monitoring & logging setup (optional)

## Support & Documentation

For detailed API documentation, visit `/api/health` endpoint after deployment.

## License

Proprietary - MMCL Production

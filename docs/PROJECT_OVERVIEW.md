# MMCL Production - Project Overview

## 📋 Project Summary

**MMCL Production Dashboard** is a complete full-stack web application designed for managing production records and analytics. It features two main dashboards:

1. **User Dashboard** - For data entry (8 hardcoded users)
2. **Admin Dashboard** - For analytics and reporting (3 hardcoded admins)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│         http://localhost:3000 or https://domain.com         │
├─────────────────────────────────────────────────────────────┤
│                    Nginx Reverse Proxy                      │
├─────────────────────────────────────────────────────────────┤
│                  Backend API (Express.js)                   │
│         http://localhost:5000 or https://api.domain.com     │
├─────────────────────────────────────────────────────────────┤
│              Database (MySQL 8.0+)                          │
│         localhost:3306 (mmcl_production)                    │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
mmcl-production/
├── frontend/                          # React Application
│   ├── public/
│   │   └── index.html                # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx            # Navigation components
│   │   │   └── ProtectedRoute.tsx    # Route protection
│   │   ├── context/
│   │   │   └── AuthContext.tsx       # Authentication state
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx         # Login interface
│   │   │   ├── UserDashboard.tsx     # Production form
│   │   │   └── AdminDashboard.tsx    # Analytics dashboard
│   │   ├── services/
│   │   │   └── api.ts                # API client
│   │   ├── styles/
│   │   │   ├── navbar.css
│   │   │   ├── login.css
│   │   │   ├── user-dashboard.css
│   │   │   └── admin-dashboard.css
│   │   ├── App.tsx                   # Main component
│   │   └── index.tsx                 # Entry point
│   ├── package.json
│   └── .env.example
│
├── backend/                           # Express.js API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts               # Auth endpoints
│   │   │   ├── master.ts             # Master data endpoints
│   │   │   └── production.ts         # Production endpoints
│   │   ├── constants.ts              # Hardcoded master data
│   │   ├── db.ts                     # Database connection
│   │   └── index.ts                  # Server entry point
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
├── database/                          # Database Setup
│   ├── schema.sql                    # Database schema
│   ├── seed_data.sql                 # Master data & users
│   └── migrate.sh                    # Migration script
│
├── docs/                              # Documentation
│   ├── DEPLOYMENT.md                 # Server deployment guide
│   └── API_TESTING.md                # API test examples
│
├── .github/
│   ├── copilot-instructions.md       # Project checklist
│   └── workflows/
│       └── deploy.yml                # CI/CD workflow
│
├── README.md                          # Main documentation
├── quick-start.sh                     # Quick setup script
├── .gitignore
└── .env.example
```

## 🚀 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend Framework | React | 18.2.0 |
| Frontend Language | TypeScript | 5.3.3 |
| UI Charts | Recharts | 5.2.0 |
| HTTP Client | Axios | 1.6.2 |
| Routing | React Router | 6.18.0 |
| Backend Framework | Express.js | 4.18.2 |
| Backend Language | TypeScript | 5.3.3 |
| Database | MySQL | 8.0+ |
| Database Driver | mysql2 | 3.6.5 |
| Process Manager | PM2 | latest |
| Web Server | Nginx | latest |
| Deployment | GitHub Actions | - |

## 👥 User Roles

### Regular Users (8 total)
```
1. user1@mmcl.com / user123 - Rajesh Kumar (Bangalore)
2. user2@mmcl.com / user123 - Priya Singh (Bangalore)
3. user3@mmcl.com / user123 - Amit Patel (Mysore)
4. user4@mmcl.com / user123 - Sneha Desai (Mysore)
5. user5@mmcl.com / user123 - Vikram Rao (Hyderabad)
6. user6@mmcl.com / user123 - Anjali Gupta (Bangalore)
7. user7@mmcl.com / user123 - Sanjay Sharma (Bengaluru)
8. user8@mmcl.com / user123 - Meera Nair (Kochi)
```

### Admin Users (3 total)
```
1. admin1@mmcl.com / admin123 - Admin User 1 (Bangalore)
2. admin2@mmcl.com / admin123 - Admin User 2 (Head Office)
3. admin3@mmcl.com / admin123 - Admin User 3 (Corporate)
```

## 📊 Database Schema

### Tables
1. **users** - User and admin accounts (8 + 3 hardcoded)
2. **publications** - Hardcoded publication list (5 items)
3. **machines** - Hardcoded machine list (4 items)
4. **downtime_reasons** - Hardcoded downtime reasons (6 items)
5. **newsprint_types** - Hardcoded newsprint types (3 items)
6. **production_records** - Main data table for daily production
7. **locations** - Unique locations from users

### Key Fields in production_records
- `po_number` - Integer, no decimals
- `color_pages` - Pages in color
- `bw_pages` - Black & white pages
- `lprs_time` - Time format (HH:MM:SS)
- `page_start_time` - Start time (24h format)
- `page_end_time` - End time (24h format)
- `downtime_duration` - Machine downtime (HH:MM:SS)
- `plate_consumption` - Plates used
- `remarks` - Max 100 characters

## 📱 Features by Dashboard

### User Dashboard
| Feature | Details |
|---------|---------|
| Welcome Message | Shows user name in navbar |
| Production Form | 11 input fields |
| Publications | Dropdown with 5 hardcoded items |
| PO Field | Number field, no decimals |
| Pages | Separate fields for color & B/W |
| Machine | Dropdown with 4 options |
| LPRS Time | Time input (HH:MM:SS) |
| Page Timings | Start & end time (24h format) |
| Downtime | Reason dropdown + duration |
| Newsprint | Type dropdown + plate consumption |
| Remarks | Text area (100 char max) |
| Validation | Required field checks |
| Success Message | Confirmation after submit |

### Admin Dashboard
| Feature | Details |
|---------|---------|
| Welcome Message | Shows admin name in navbar |
| Date Range Filter | Default: Feb 1 - today |
| Location Filter | Dynamic from user locations |
| Publication Filter | Hardcoded 5 options |
| PO Chart | Bar chart showing distribution |
| Machine Chart | Pie chart showing usage |
| LPRS Chart | Line chart (last 7 days) |
| Newsprint Chart | Bar chart with consumption |
| Responsive | Mobile-friendly charts |

## 🔐 Authentication Flow

```
User Input
    ↓
Login Page
    ↓
Hardcoded User Verification
    ↓
Context Storage (localStorage)
    ↓
Protected Route Check
    ↓
Dashboard Access (User or Admin)
    ↓
Logout → Clear Session
```

## 🔗 API Endpoints

### Authentication (3)
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Clear session
- `GET /api/auth/user/:id` - Get user profile

### Master Data (5)
- `GET /api/master/publications`
- `GET /api/master/machines`
- `GET /api/master/downtime-reasons`
- `GET /api/master/newsprint-types`
- `GET /api/master/locations`

### Production Records (7)
- `POST /api/production/records` - Create record
- `GET /api/production/records/:user_id` - User records
- `GET /api/production/admin/records` - Filtered records
- `GET /api/production/analytics/po/:publication_id`
- `GET /api/production/analytics/machine/:publication_id`
- `GET /api/production/analytics/lprs/:publication_id`
- `GET /api/production/analytics/newsprint/:publication_id`

## 🎨 Responsive Design

- **Desktop**: Full layout with all features
- **Tablet**: Adjusted grid layout
- **Mobile**: Single column, touch-friendly buttons
- **Breakpoints**: 1000px, 768px, 480px

## 🌐 Deployment Targets

### Development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Database: `localhost:3306`

### Production
- Frontend: `https://production.projectdesigners.cloud`
- Backend: `https://production.projectdesigners.cloud/api`
- Database: Private MySQL server
- SSL: Let's Encrypt certificates

## 📦 Dependencies Summary

### Frontend
- React (UI framework)
- TypeScript (type safety)
- Recharts (data visualization)
- Axios (HTTP client)
- React Router (routing)

### Backend
- Express.js (web framework)
- TypeScript (type safety)
- MySQL2 (database driver)
- CORS (cross-origin support)
- Body Parser (request parsing)

### DevOps
- PM2 (process management)
- Nginx (web server)
- GitHub Actions (CI/CD)
- Let's Encrypt (SSL certificates)

## ⚙️ Configuration Files

### .env (Backend)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=mmcl_production
DB_PORT=3306
SERVER_PORT=5000
NODE_ENV=development
```

### .env (Frontend)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 📋 Development Workflow

1. **Setup**: `npm run install:all`
2. **Database**: `cd database && bash migrate.sh`
3. **Backend**: `npm run dev:backend`
4. **Frontend**: `npm run dev:frontend`
5. **Test**: Login with test credentials
6. **Build**: `npm run build:backend` & `npm run build:frontend`
7. **Deploy**: Push to main branch (GitHub Actions)

## 🐛 Debugging

### Frontend Issues
- Check browser console (F12)
- Verify API URL in .env
- Check network tab for API calls
- Review React error boundaries

### Backend Issues
- Check server logs: `npm run dev:backend`
- Verify database connection
- Check request headers
- Review TypeScript compilation

### Database Issues
- Test MySQL: `mysql -u root -p -e "SELECT 1;"`
- Check schema: `SHOW TABLES;`
- Verify user permissions
- Check data: `SELECT * FROM users;`

## 📊 Performance Considerations

- Database indexes on frequently queried columns
- Nginx gzip compression enabled
- Frontend build optimization
- API response caching where applicable
- Connection pooling for database

## 🔒 Security Features

- Password validation (hardcoded for now)
- CORS enabled for trusted domains
- SQL injection protection (parameterized queries)
- XSS protection in React
- HTTPS/SSL in production
- Protected routes (role-based access)

## 📞 Support & Maintenance

- Check logs regularly
- Monitor system resources
- Update dependencies monthly
- Backup database daily
- Test disaster recovery plan

---

**For detailed setup instructions, see README.md**
**For server deployment, see docs/DEPLOYMENT.md**
**For API testing, see docs/API_TESTING.md**

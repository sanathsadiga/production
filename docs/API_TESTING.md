# API Testing Guide

This document provides cURL examples for testing all MMCL Production API endpoints.

## Base URL
- **Development**: http://localhost:5000/api
- **Production**: https://production.projectdesigners.cloud/api

## Authentication Endpoints

### 1. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@mmcl.com",
    "password": "user123"
  }'
```

### 2. Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout
```

### 3. Get User Details
```bash
curl -X GET http://localhost:5000/api/auth/user/1
```

## Master Data Endpoints

### 4. Get All Publications
```bash
curl -X GET http://localhost:5000/api/master/publications
```

### 5. Get All Machines
```bash
curl -X GET http://localhost:5000/api/master/machines
```

### 6. Get Downtime Reasons
```bash
curl -X GET http://localhost:5000/api/master/downtime-reasons
```

### 7. Get Newsprint Types
```bash
curl -X GET http://localhost:5000/api/master/newsprint-types
```

### 8. Get All Locations
```bash
curl -X GET http://localhost:5000/api/master/locations
```

## Production Records Endpoints

### 9. Create Production Record
```bash
curl -X POST http://localhost:5000/api/production/records \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "publication_id": 1,
    "po_number": 1001,
    "color_pages": 50,
    "bw_pages": 100,
    "machine_id": 1,
    "lprs_time": "00:15:30",
    "page_start_time": "09:00:00",
    "page_end_time": "17:30:00",
    "downtime_reason_id": 1,
    "downtime_duration": "00:30:00",
    "newsprint_id": 1,
    "plate_consumption": 25,
    "remarks": "Production completed successfully",
    "record_date": "2026-02-03"
  }'
```

### 10. Get User Records
```bash
curl -X GET "http://localhost:5000/api/production/records/1?start_date=2026-02-01&end_date=2026-02-03"
```

### 11. Get Admin Records (Filtered)
```bash
curl -X GET "http://localhost:5000/api/production/admin/records?start_date=2026-02-01&end_date=2026-02-03&location=Bangalore&publication_id=1"
```

## Analytics Endpoints

### 12. Get PO Analytics
```bash
curl -X GET "http://localhost:5000/api/production/analytics/po/1?start_date=2026-02-01&end_date=2026-02-03&location=Bangalore"
```

### 13. Get Machine Analytics
```bash
curl -X GET "http://localhost:5000/api/production/analytics/machine/1?start_date=2026-02-01&end_date=2026-02-03"
```

### 14. Get LPRS Analytics
```bash
curl -X GET "http://localhost:5000/api/production/analytics/lprs/1?start_date=2026-02-01&end_date=2026-02-03"
```

### 15. Get Newsprint Analytics
```bash
curl -X GET "http://localhost:5000/api/production/analytics/newsprint/1?start_date=2026-02-01&end_date=2026-02-03"
```

## Testing with Postman

1. Import the API endpoints into Postman
2. Set environment variable: `{{base_url}}` = http://localhost:5000/api
3. Create collection with all endpoints
4. Test each endpoint with valid data
5. Verify response status codes and data structure

## Expected Response Examples

### Success Response (Login)
```json
{
  "id": 1,
  "email": "user1@mmcl.com",
  "name": "Rajesh Kumar",
  "phone_number": "9876543210",
  "location": "Bangalore",
  "location_code": "BNG001",
  "role": "user"
}
```

### Error Response (Invalid Login)
```json
{
  "error": "Invalid email or password"
}
```

### Success Response (Create Record)
```json
{
  "message": "Production record created successfully",
  "id": 15
}
```

### Success Response (Get Records)
```json
[
  {
    "id": 1,
    "user_id": 1,
    "publication_id": 1,
    "po_number": 1001,
    "color_pages": 50,
    "bw_pages": 100,
    "machine_id": 1,
    "lprs_time": "00:15:30",
    "page_start_time": "09:00:00",
    "page_end_time": "17:30:00",
    "downtime_reason_id": 1,
    "downtime_duration": "00:30:00",
    "newsprint_id": 1,
    "plate_consumption": 25,
    "remarks": "Production completed successfully",
    "record_date": "2026-02-03",
    "created_at": "2026-02-03T10:30:00Z"
  }
]
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 401 | Unauthorized - Invalid credentials |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

## Testing Workflow

1. **Test Authentication**
   - Login with user1@mmcl.com
   - Verify user details returned
   - Logout

2. **Test Master Data**
   - Get all publications, machines, etc.
   - Verify data matches hardcoded values

3. **Test Production Records**
   - Create new record as user 1
   - Retrieve records with filters
   - Test date range filtering

4. **Test Analytics**
   - Request analytics by publication
   - Apply location filter
   - Verify chart data structure

## Troubleshooting

### 401 Unauthorized
- Check email and password credentials
- Verify user exists in hardcoded list

### 404 Not Found
- Verify endpoint URL spelling
- Check HTTP method (GET vs POST)
- Verify resource ID exists

### 500 Internal Server Error
- Check backend logs: `npm run dev:backend`
- Verify MySQL connection
- Check request JSON formatting

---

For more information, see README.md

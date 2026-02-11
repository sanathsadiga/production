# Fix: Production Login Authentication Failure

## Problem
Users cannot login on production server with message "Invalid credentials", even though credentials are correct.

## Root Cause
The seed data stored user passwords with an `@` symbol (e.g., `Mmcl@1502`), but users are trying to login with passwords without the `@` symbol (e.g., `Mmcl1502`).

### Password Mismatch Examples:
- **Database has**: `Mmcl@1502` 
- **User enters**: `Mmcl1502` ❌
- Expected: `Mmcl1502` ✅

## Solution

### Step 1: Connect to Production Database
```bash
mysql -h localhost -u mmcl_user -p mmcl_production
```

### Step 2: Run the Password Fix
Execute this SQL to update all user passwords:

```sql
UPDATE users SET password = 'Mmcl1502' WHERE email = 'alvin.pinto@timosofindia.com';
UPDATE users SET password = 'Mmcl1503' WHERE email = 'sanjay.k@timesofindia.com';
UPDATE users SET password = 'Mmcl1505' WHERE email = 'shivaprasad.n@timesofindia.com';
UPDATE users SET password = 'Mmcl1506' WHERE email = 'gururaj.r@timesofindia.com';
UPDATE users SET password = 'Mmcl1507' WHERE email = 'hiremath.s@timeofindia.com';
UPDATE users SET password = 'Mmcl1508' WHERE email = 'narappa.gowdru@timesofindia.com';
UPDATE users SET password = 'Mmcl1509' WHERE email = 'raghavendraorao.inamdar@timesofindia.com';
UPDATE users SET password = 'Mmcl1511' WHERE email = 'shiddappa.kashibadiger@timesofindia.com';
UPDATE users SET password = 'Mmcl1501' WHERE email = 'vinay.gh@timesofindia.com';
UPDATE users SET password = 'user123' WHERE email = 'user@gmail.com';
```

### Step 3: Verify the Fix
```sql
SELECT email, password FROM users WHERE role = 'user';
```

Output should show passwords without `@` symbols:
```
alvin.pinto@timosofindia.com | Mmcl1502
sanjay.k@timesofindia.com | Mmcl1503
shivaprasad.n@timesofindia.com | Mmcl1505
... (etc)
```

### Step 4: Test Login
Now users should be able to login with credentials like:
- Email: `alvin.pinto@timosofindia.com`
- Password: `Mmcl1502`

## Alternative: Run SQL Script
If you have direct server access, run the fix script:

```bash
mysql -h localhost -u mmcl_user -p mmcl_production < /path/to/database/fix_passwords.sql
```

## Updated Seed Data
The main `seed_data.sql` has been updated with correct passwords (without `@` symbols). Future deployments will not have this issue.

## User Credentials Reference
After fix, the passwords for each user are:

| Email | Password |
|-------|----------|
| alvin.pinto@timosofindia.com | Mmcl1502 |
| sanjay.k@timesofindia.com | Mmcl1503 |
| shivaprasad.n@timesofindia.com | Mmcl1505 |
| gururaj.r@timesofindia.com | Mmcl1506 |
| hiremath.s@timeofindia.com | Mmcl1507 |
| narappa.gowdru@timesofindia.com | Mmcl1508 |
| raghavendraorao.inamdar@timesofindia.com | Mmcl1509 |
| shiddappa.kashibadiger@timesofindia.com | Mmcl1511 |
| vinay.gh@timesofindia.com | Mmcl1501 |
| user@gmail.com | user123 |

**Admin Credentials** (already correct):
| Email | Password |
|-------|----------|
| deepak.saluja@timesofindia.com | Admin@123 |
| girish.k@timesofindia.com | Admin@123 |
| lokesh.vgowda@timesofindia.com | admin123 |

## Prevention
- The seed data script has been corrected
- All new deployments will use the correct passwords
- Consider implementing password hashing in the future for security

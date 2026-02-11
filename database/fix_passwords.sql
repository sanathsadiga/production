-- MMCL Production Database - Fix User Passwords
-- This script updates passwords to match the expected format without @ symbol

USE mmcl_production;

-- Update all user passwords to remove @ symbol and match user codes
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

-- Verify the updates
SELECT email, password FROM users WHERE role = 'user';

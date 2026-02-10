USE mmcl_production;

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS=0;

-- ============================================
-- TRUNCATE ALL TABLES (removes data, keeps structure)
-- ============================================
TRUNCATE TABLE downtime_entries;
TRUNCATE TABLE production_records;
TRUNCATE TABLE users;
TRUNCATE TABLE downtime_reasons;
TRUNCATE TABLE newsprint_types;
TRUNCATE TABLE machines;
TRUNCATE TABLE publications;

-- Reset AUTO_INCREMENT for all tables
ALTER TABLE publications AUTO_INCREMENT = 1;
ALTER TABLE machines AUTO_INCREMENT = 1;
ALTER TABLE newsprint_types AUTO_INCREMENT = 1;
ALTER TABLE downtime_reasons AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;

-- ============================================
-- INSERT PUBLICATIONS (70 records)
-- ============================================
INSERT INTO publications (name, code, publication_type, location, created_at) VALUES
-- OSP Publications - Mangalore
('MNG UTHARA DESAM', '1502', 'OSP', 'Mangalore', NOW()),
('SAMYUKTA KARNATAKA - MANGALORE', '1502', 'OSP', 'Mangalore', NOW()),
('MADHYAMA BIMBA - MANGALORE', '1502', 'OSP', 'Mangalore', NOW()),
('TULUNADU VARTHE - MANGALORE', '1502', 'OSP', 'Mangalore', NOW()),
('VIVEKA SAMPADA - MANGALORE', '1502', 'OSP', 'Mangalore', NOW()),
-- OSP Publications - Bellary
('MNG DIGANTHA MUDRANA', '1502', 'OSP', 'Bellary', NOW()),
('MNG MADHUBAN GRAPHICS', '1502', 'OSP', 'Bellary', NOW()),
('TIMES OF BEDRA', '1502', 'OSP', 'Bellary', NOW()),
('TULUNADA BOLPU', '1502', 'OSP', 'Bellary', NOW()),
('HBL JANAMADHYAMA', '1503', 'OSP', 'Bellary', NOW()),
('HBL SIRSI SAMACHAR', '1503', 'OSP', 'Bellary', NOW()),
('HBL TATVA NISHTA', '1503', 'OSP', 'Bellary', NOW()),
('THE NEWS TRAIL', '1503', 'OSP', 'Bellary', NOW()),
-- OSP Publications - Mysore
('RAJYADHARMA - MYSORE', '1505', 'OSP', 'Mysore', NOW()),
('HELLO MYSORE - MYSORE', '1505', 'OSP', 'Mysore', NOW()),
('PRATHINIDHI - MYSORE', '1505', 'OSP', 'Mysore', NOW()),
('MYS KANNADIGARA PRAJANUDI', '1505', 'OSP', 'Mysore', NOW()),
('MYS VISHWADHUTHA', '1505', 'OSP', 'Mysore', NOW()),
('MYS MYSORE VIJAYA', '1505', 'OSP', 'Mysore', NOW()),
-- OSP Publications - Bagalkot
('SAMYUKTHA KARNATAKA - BAGALKOT', '1506', 'OSP', 'Bagalkot', NOW()),
-- OSP Publications - Shimoga
('GVT HAMPI TIMES', '1507', 'OSP', 'Shimoga', NOW()),
('GVT LOKA DWANI', '1507', 'OSP', 'Shimoga', NOW()),
('ECHHARIKE - SHIMOGA', '1508', 'OSP', 'Shimoga', NOW()),
('KRANTHI DEEPA - SHIMOGA', '1508', 'OSP', 'Shimoga', NOW()),
('JANA HORATA - SHIMOGA', '1508', 'OSP', 'Shimoga', NOW()),
('JAI KARUNADU KALA - SHIMOGA', '1508', 'OSP', 'Shimoga', NOW()),
('KANNADA PRABHA - SHIMOGA', '1508', 'OSP', 'Shimoga', NOW()),
('SMG MALENADU MITRA', '1508', 'OSP', 'Shimoga', NOW()),
('SHIVAMOGGA TIMES - SHIMOGA', '1508', 'OSP', 'Shimoga', NOW()),
-- OSP Publications - Gulbarga
('SAMYUKTA KARNATAKA - GULBARGA', '1509', 'OSP', 'Gulbarga', NOW()),
('GLB MALLAMMANA NUDI', '1509', 'OSP', 'Gulbarga', NOW()),
('NISARGA SARATHYA DAILY NEWS - GLB', '1509', 'OSP', 'Gulbarga', NOW()),
('GLB SALAR DAILY', '1509', 'OSP', 'Gulbarga', NOW()),
('VAARTHA BHARATHI', '1509', 'OSP', 'Gulbarga', NOW()),
-- OSP Publications - Belagavi
('SAMYUKTA KARNATAKA - BELAGAVI', '1511', 'OSP', 'Belgaum', NOW()),
-- VK Publications - Bengaluru
('VK Student Edition', '1501', 'VK', 'Bengaluru', NOW()),
('Lavala VK', '1501', 'VK', 'Bengaluru', NOW()),
('BLG VKMINI SPLIT', '1501', 'VK', 'Bengaluru', NOW()),
('BELGAVI VKMINI', '1501', 'VK', 'Bengaluru', NOW()),
('HBL VKMINI SPLIT', '1501', 'VK', 'Bengaluru', NOW()),
('HUBLI VKMINI', '1501', 'VK', 'Bengaluru', NOW()),
('VK Main', '1501', 'VK', 'Bengaluru', NOW()),
('VKMNC', '1501', 'VK', 'Bengaluru', NOW()),
('MANGALORE VKMINI', '1501', 'VK', 'Bengaluru', NOW()),
('MNG VKMINI SPLIT', '1501', 'VK', 'Bengaluru', NOW()),
('MYSORE VKMINI', '1501', 'VK', 'Bengaluru', NOW()),
('MYSSPL', '1501', 'VK', 'Bengaluru', NOW()),
('VKGAN', '1501', 'VK', 'Bengaluru', NOW()),
('VK CTDMAIN', '1501', 'VK', 'Bengaluru', NOW()),
('CTD VKMINI SPLIT', '1501', 'VK', 'Bengaluru', NOW()),
-- NAMMA Publications
('Bengaluru Rural', '1501', 'NAMMA', 'Bengaluru', NOW()),
('Bengaluru City', '1501', 'NAMMA', 'Bengaluru', NOW()),
('Karwar', '1501', 'NAMMA', 'Karwar', NOW()),
('Belagavi Main', '1501', 'NAMMA', 'Belgaum', NOW()),
('Namma Chikkodi', '1501', 'NAMMA', 'Belgaum', NOW()),
('Namma Belagavi', '1501', 'NAMMA', 'Belgaum', NOW()),
('Namma Bailahongala', '1501', 'NAMMA', 'Belgaum', NOW()),
('Namma Haveri', '1501', 'NAMMA', 'Belgaum', NOW()),
('Namma Gadag', '1501', 'NAMMA', 'Belgaum', NOW()),
('Namma Mahanagara', '1501', 'NAMMA', 'Bengaluru', NOW()),
('Hubli Namma', '1501', 'NAMMA', 'Hubli', NOW()),
('Namma Kasaragod', '1501', 'NAMMA', 'Kasaragod', NOW()),
('Namma Puttur', '1501', 'NAMMA', 'Puttur', NOW()),
('Namma Mangalore', '1501', 'NAMMA', 'Mangalore', NOW()),
('Namma Udupi', '1501', 'NAMMA', 'Mangalore', NOW()),
('Namma Bantwala', '1501', 'NAMMA', 'Mangalore', NOW()),
('Namma Kundapur', '1501', 'NAMMA', 'Mangalore', NOW()),
('Namma Hassan', '1501', 'NAMMA', 'Hassan', NOW()),
('Namma Mysore', '1501', 'NAMMA', 'Mysore', NOW()),
('Namma Vijayanagara', '1501', 'NAMMA', 'Mysore', NOW());

-- ============================================
-- INSERT USERS (Regular Users - 8)
-- ============================================
INSERT INTO users (name, email, password, phone_number, location, location_code, role, created_at) VALUES
('Alwin Pinto', 'alvin.pinto@timosofindia.com', 'Mmcl1502', '9964023020', 'Mangalore', 'MNG1502', 'user', NOW()),
('Sanjay Kanekal', 'sanjay.k@timesofindia.com', 'Mmcl1503', '9341111918', 'Hubli', 'HBL1503', 'user', NOW()),
('Shivprasad', 'shivaprasad.n@timesofindia.com',  'Mmcl1505', '9876543212', 'Mysore', 'MYS1505', 'user', NOW()),
('Gururaj R', 'gururaj.r@timesofindia.com',  'Mmcl1506', '9483905222', 'Bagalkote', 'BKT1506', 'user', NOW()),
('Shiv Kumar hiremath', 'hiremath.s@timeofindia.com',  'Mmcl1507', '9341110974', 'Gangavati', 'GVT1507', 'user', NOW()),
('Narappa GP', 'narappa.gowdru@timesofindia.com',  'Mmcl1508', '9845238195', 'Shimoga', 'SMG1508', 'user', NOW()),
('Raghavendra', 'raghavendraorao.inamdar@timesofindia.com',  'Mmcl1509', '9341110885', 'Gulbarga', 'GLB1509', 'user', NOW()),
('Shiddappa', 'shiddappa.kashibadiger@timesofindia.com',  'Mmcl1511', '9739996689', 'Belgaum', 'BGM1511', 'user', NOW()),
('Vinay',  'vinay.gh@timesofindia.com', 'Mmcl1501', '9739948515', 'Bengaluru', 'BNG1501', 'user', NOW()),
('Generic User', 'user@gmail.com' , 'user123', '9000000000', '', 'GL0001', 'user', NOW());

-- ============================================
-- INSERT ADMINS (3)
-- ============================================
INSERT INTO users (name, email, password, phone_number, location, location_code, role, created_at) VALUES
('Deepak Saluja', 'deepak.saluja@timesofindia.com', 'Admin@123', '9999999991', 'Bengaluru', 'HO001', 'admin', NOW()),
('Girish Bhat', 'girish.k@timesofindia.com', 'Admin@123', '9999999992', 'Bengaluru', 'CORP001', 'admin', NOW()),
('Lokesh Gowda', 'lokesh.vgowda@timesofindia.com', 'admin123', '9999999993', 'Bengaluru', 'RO001', 'admin', NOW());

-- ============================================
-- INSERT MACHINES (matched to actual schema)
-- ============================================
INSERT INTO machines (name, code, created_at) VALUES
('City Line', 'M001', NOW()),
('High Line', 'M002', NOW()),
('Eco Line', 'M003', NOW()),
('web king', 'M004', NOW()),
('News line s30', 'M005', NOW());

-- ============================================
-- INSERT DOWNTIME REASONS
-- ============================================
INSERT INTO downtime_reasons (reason, name, code, category) VALUES
('Machine Breakdown', 'Machine Breakdown', 'DR001', 'mechanical'),
('Paper Jam', 'Paper Jam', 'DR002', 'material'),
('Ink Issue', 'Ink Issue', 'DR003', 'material'),
('Scheduled Maintenance', 'Scheduled Maintenance', 'DR004', 'maintenance'),
('Power Failure', 'Power Failure', 'DR005', 'electrical'),
('Operator Absence', 'Operator Absence', 'DR006', 'personnel');

-- ============================================
-- INSERT NEWSPRINT TYPES
-- ============================================
INSERT INTO newsprint_types (name, code, gsm, created_at) VALUES
('Ramdas', 'NP001', 45, NOW()),
('Shree Lakshmi Tulasi', 'NP002', 40, NOW()),
('Imported', 'NP003', 52, NOW());

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;

-- ============================================
-- VERIFY DATA INTEGRITY
-- ============================================
SELECT 'Data Seeding Complete' as status;
SELECT 'OSP Publications' as type, COUNT(*) as count FROM publications WHERE publication_type = 'OSP'
UNION ALL
SELECT 'VK Publications', COUNT(*) FROM publications WHERE publication_type = 'VK'
UNION ALL
SELECT 'NAMMA Publications', COUNT(*) FROM publications WHERE publication_type = 'NAMMA'
UNION ALL
SELECT 'Machines', COUNT(*) FROM machines
UNION ALL
SELECT 'Newsprint Types', COUNT(*) FROM newsprint_types
UNION ALL
SELECT 'Downtime Reasons', COUNT(*) FROM downtime_reasons
UNION ALL
SELECT 'Regular Users', COUNT(*) FROM users WHERE role = 'user'
UNION ALL
SELECT 'Admin Users', COUNT(*) FROM users WHERE role = 'admin';
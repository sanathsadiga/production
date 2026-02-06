-- MMCL Production Database - Insert Master Data
-- Version: 2.0.0

USE mmcl_production;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS=0;

-- Clear existing data (in order of dependencies)
DELETE FROM production_records;
DELETE FROM users;
DELETE FROM machines;
DELETE FROM downtime_reasons;
DELETE FROM newsprint_types;
DELETE FROM publications;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;

-- Insert Publications (Updated with actual publications and codes)
INSERT INTO publications (name, code) VALUES
('MNG UTHARA DESAM', '1502'),
('SAMYUKTA KARNATAKA - MANGALORE', '1502'),
('MADHYAMA BIMBA - MANGALORE', '1502'),
('TULUNADU VARTHE - MANGALORE', '1502'),
('VIVEKA SAMPADA - MANGALORE', '1502'),
('MNG DIGANTHA MUDRANA', '1502'),
('MNG MADHUBAN GRAPHICS', '1502'),
('TIMES OF BEDRA', '1502'),
('TULUNADA BOLPU', '1502'),
('HBL JANAMADHYAMA', '1503'),
('HBL SIRSI SAMACHAR', '1503'),
('HBL TATVA NISHTA', '1503'),
('THE NEWS TRAIL', '1503'),
('RAJYADHARMA - MYSORE', '1505'),
('HELLO MYSORE - MYSORE', '1505'),
('PRATHINIDHI - MYSORE', '1505'),
('MYS KANNADIGARA PRAJANUDI', '1505'),
('MYS VISHWADHUTHA', '1505'),
('MYS MYSORE VIJAYA', '1505'),
('SAMYUKTHA KARNATAKA - BAGALKOT', '1506'),
('GVT HAMPI TIMES', '1507'),
('GVT LOKA DWANI', '1507'),
('ECHHARIKE - SHIMOGA', '1508'),
('KRANTHI DEEPA - SHIMOGA', '1508'),
('JANA HORATA - SHIMOGA', '1508'),
('JAI KARUNADU KALA - SHIMOGA', '1508'),
('KANNADA PRABHA - SHIMOGA', '1508'),
('SMG MALENADU MITRA', '1508'),
('SHIVAMOGGA TIMES - SHIMOGA', '1508'),
('SAMYUKTA KARNATAKA - GULBARGA', '1509'),
('GLB MALLAMMANA NUDI', '1509'),
('NISARGA SARATHYA DAILY NEWS - GLB', '1509'),
('GLB SALAR DAILY', '1509'),
('VAARTHA BHARATHI', '1509'),
('SAMYUKTA KARNATAKA - BELAGAVI', '1511'),
('Bengaluru Rural', '1501'),
('Bengaluru city', '1501'),
('VK student Edition', '1501'),
('Lavala VK', '1501'),
('BLG VKMINI SPLIT', '1501'),
('Karwara', '1501'),
('Belagavi Main', '1501'),
('BELGAVI VKMINI', '1501'),
('Namma Chikkodi', '1501'),
('Namma Belagavi', '1501'),
('Namma BailaHongala', '1501'),
('Namma Haveri', '1501'),
('Namma Karawara', '1501'),
('Namma Gadag', '1501'),
('Namma Mahanagara', '1501'),
('Hubballi', '1501'),
('HBL VKMINI SPLIT', '1501'),
('HUBLI VKMINI', '1501'),
('Vk Main', '1501'),
('Namma Kasargod', '1501'),
('Namma Puttur', '1501'),
('Namma Mangalore', '1501'),
('Namma Udupi', '1501'),
('Vkmnc', '1501'),
('MANGALORE VKMINI', '1501'),
('MNG VKMINI SPLIT', '1501'),
('Namma Bantwala', '1501'),
('Namma Kundapur', '1501'),
('MYSORE', '1501'),
('Hassan', '1501'),
('MYSORE VKMINI', '1501'),
('MYSSPL', '1501'),
('VKGAN', '1501'),
('Namma Vijayanagara', '1501'),
('Namma Raichur', '1501'),
('Namma Bellary', '1501'),
('VK CTDMAIN', '1501'),
('Namma Chitradurga', '1501'),
('CTD VKMINI SPLIT', '1501');

-- Insert Machines (Hardcoded)
INSERT INTO machines (name, code) VALUES
('City Line', 'CL'),
('High Line', 'HL'),
('Eco Line', 'EL'),
('News line s30', 'NL');

-- Insert Downtime Reasons (Hardcoded)
INSERT INTO downtime_reasons (reason, code) VALUES
('Mechanical down time', 'MDT'),
('Electrical', 'EDT'),
('Ink Issues', 'IK'),
('Web brake', 'WB'),
('Reel change', 'RC'),
('Cleaning', 'CL');

-- Insert Newsprint Types (Hardcoded)
INSERT INTO newsprint_types (name, code) VALUES
('Ramdas', 'RMD'),
('Shree Lakshmi Tulasi', 'SLT'),
('Imported', 'IMP');

-- Insert 8 Hardcoded Users (Role: user)
INSERT INTO users (email, name, password, phone_number, location, location_code, role) VALUES
('alvin.pinto@timosofindia.com', 'Alwin Pinto', 'Mmcl@1502', '9964023020', 'Mangalore', 'MNG1502', 'user'),
('sanjay.k@timesofindia.com', 'Sanjay Kanekal', 'Mmcl@1503', '9341111918', 'Hubli', 'HBL1503', 'user'),
('shivaprasad.n@timesofindia.com', 'Shivprasad', 'Mmcl@1505', '9876543212', 'Mysore', 'MYS1505', 'user'),
('gururaj.r@timesofindia.com', 'Gururaj R', 'Mmcl@1506', '9483905222', 'Bagalkote', 'BKT1506', 'user'),
('hiremath.s@timeofindia.com', 'Shiv Kumar hiremath', 'Mmcl@1507', '9341110974', 'Gangavati', 'GVT1507', 'user'),
('narappa.gowdru@timesofindia.com', 'Narappa GP', 'Mmcl@1508', '9845238195', 'Shimoga', 'SMG1508', 'user'),
('raghavendraorao.inamdar@timesofindia.com', 'Raghavendra', 'Mmcl@1509', '9341110885', 'Gulbarga', 'GLB1509', 'user'),
('shiddappa.kashibadiger@timesofindia.com', 'Shiddappa', 'Mmcl@1511', '9739996689', 'Belgaum', 'BGM1511', 'user'),
('vinay.gh@timesofindia.com', 'Vinay', 'Mmcl@1501', '9739948515', 'Bengaluru', 'BNG1501', 'user'),
('user@gmail.com', 'Generic User', 'user@123', '9000000000', 'Generic Location', 'GL0001', 'user');

-- Insert 3 Hardcoded Admins (Role: admin)
INSERT INTO users (email, name, password, phone_number, location, location_code, role) VALUES
('deepak.saluja@timesofindia.com', 'deepak saluja', 'Admin@123', '9999999991', 'Banglore', 'HO001', 'admin'),
('girish.k@timesofindia.com', 'Girish Bhat', 'Admin@123', '9999999992', 'Banglore', 'CORP001', 'admin'),
('lokesh.vgowda@timesofindia.com', 'Lokesh', 'admin123', '9999999993', 'Banglore', 'RO001', 'admin');
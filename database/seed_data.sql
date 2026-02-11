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
-- Insert OSP Publications
INSERT INTO publications (name, code, publication_type) VALUES
('MNG UTHARA DESAM', '1502', 'OSP'),
('SAMYUKTA KARNATAKA - MANGALORE', '1502', 'OSP'),
('MADHYAMA BIMBA - MANGALORE', '1502', 'OSP'),
('TULUNADU VARTHE - MANGALORE', '1502', 'OSP'),
('VIVEKA SAMPADA - MANGALORE', '1502', 'OSP'),
('MNG DIGANTHA MUDRANA', '1502', 'OSP'),
('MNG MADHUBAN GRAPHICS', '1502', 'OSP'),
('TIMES OF BEDRA', '1502', 'OSP'),
('TULUNADA BOLPU', '1502', 'OSP'),
('HBL JANAMADHYAMA', '1503', 'OSP'),
('HBL SIRSI SAMACHAR', '1503', 'OSP'),
('HBL TATVA NISHTA', '1503', 'OSP'),
('THE NEWS TRAIL', '1503', 'OSP'),
('RAJYADHARMA - MYSORE', '1505', 'OSP'),
('HELLO MYSORE - MYSORE', '1505', 'OSP'),
('PRATHINIDHI - MYSORE', '1505', 'OSP'),
('MYS KANNADIGARA PRAJANUDI', '1505', 'OSP'),
('MYS VISHWADHUTHA', '1505', 'OSP'),
('MYS MYSORE VIJAYA', '1505', 'OSP'),
('SAMYUKTHA KARNATAKA - BAGALKOT', '1506', 'OSP'),
('GVT HAMPI TIMES', '1507', 'OSP'),
('GVT LOKA DWANI', '1507', 'OSP'),
('ECHHARIKE - SHIMOGA', '1508', 'OSP'),
('KRANTHI DEEPA - SHIMOGA', '1508', 'OSP'),
('JANA HORATA - SHIMOGA', '1508', 'OSP'),
('JAI KARUNADU KALA - SHIMOGA', '1508', 'OSP'),
('KANNADA PRABHA - SHIMOGA', '1508', 'OSP'),
('SMG MALENADU MITRA', '1508', 'OSP'),
('SHIVAMOGGA TIMES - SHIMOGA', '1508', 'OSP'),
('SAMYUKTA KARNATAKA - GULBARGA', '1509', 'OSP'),
('GLB MALLAMMANA NUDI', '1509', 'OSP'),
('NISARGA SARATHYA DAILY NEWS - GLB', '1509', 'OSP'),
('GLB SALAR DAILY', '1509', 'OSP'),
('VAARTHA BHARATHI', '1509', 'OSP'),
('SAMYUKTA KARNATAKA - BELAGAVI', '1511', 'OSP');

-- Insert VK Publications
INSERT INTO publications (name, code, publication_type) VALUES
('VK student Edition', '1501', 'VK'),
('Lavala VK', '1501', 'VK'),
('BLG VKMINI SPLIT', '1501', 'VK'),
('BELGAVI VKMINI', '1501', 'VK'),
('HBL VKMINI SPLIT', '1501', 'VK'),
('HUBLI VKMINI', '1501', 'VK'),
('Vk Main', '1501', 'VK'),
('Vkmnc', '1501', 'VK'),
('MANGALORE VKMINI', '1501', 'VK'),
('MNG VKMINI SPLIT', '1501', 'VK'),
('MYSORE VKMINI', '1501', 'VK'),
('MYSSPL', '1501', 'VK'),
('VKGAN', '1501', 'VK'),
('VK CTDMAIN', '1501', 'VK'),
('CTD VKMINI SPLIT', '1501', 'VK');

-- Insert NAMMA Publications
INSERT INTO publications (name, code, publication_type) VALUES
('Bengaluru Rural', '1501', 'NAMMA'),
('Bengaluru city', '1501', 'NAMMA'),
('Karwara', '1501', 'NAMMA'),
('Belagavi Main', '1501', 'NAMMA'),
('Namma Chikkodi', '1501', 'NAMMA'),
('Namma Belagavi', '1501', 'NAMMA'),
('Namma BailaHongala', '1501', 'NAMMA'),
('Namma Haveri', '1501', 'NAMMA'),
('Namma Karawara', '1501', 'NAMMA'),
('Namma Gadag', '1501', 'NAMMA'),
('Namma Mahanagara', '1501', 'NAMMA'),
('Hubballi', '1501', 'NAMMA'),
('HBL VKMINI SPLIT', '1501', 'NAMMA'),
('HUBLI VKMINI', '1501', 'NAMMA'),
('Vk Main', '1501', 'NAMMA'),
('Namma Kasargod', '1501', 'NAMMA'),
('Namma Puttur', '1501', 'NAMMA'),
('Namma Mangalore', '1501', 'NAMMA'),
('Namma Udupi', '1501', 'NAMMA'),
('Vkmnc', '1501', 'NAMMA'),
('MANGALORE VKMINI', '1501', 'NAMMA'),
('MNG VKMINI SPLIT', '1501', 'NAMMA'),
('Namma Bantwala', '1501', 'NAMMA'),
('Namma Kundapur', '1501', 'NAMMA'),
('MYSORE', '1501', 'NAMMA'),
('Hassan', '1501', 'NAMMA'),
('MYSORE VKMINI', '1501', 'NAMMA'),
('MYSSPL', '1501', 'NAMMA'),
('VKGAN', '1501', 'NAMMA'),
('Namma Vijayanagara', '1501', 'NAMMA'),
('Namma Raichur', '1501', 'NAMMA'),
('Namma Bellary', '1501', 'NAMMA'),
('VK CTDMAIN', '1501', 'NAMMA'),
('Namma Chitradurga', '1501', 'NAMMA');

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
('alvin.pinto@timosofindia.com', 'Alwin Pinto', 'Mmcl1502', '9964023020', 'Mangalore', 'MNG1502', 'user'),
('sanjay.k@timesofindia.com', 'Sanjay Kanekal', 'Mmcl1503', '9341111918', 'Hubli', 'HBL1503', 'user'),
('shivaprasad.n@timesofindia.com', 'Shivprasad', 'Mmcl1505', '9876543212', 'Mysore', 'MYS1505', 'user'),
('gururaj.r@timesofindia.com', 'Gururaj R', 'Mmcl1506', '9483905222', 'Bagalkote', 'BKT1506', 'user'),
('hiremath.s@timeofindia.com', 'Shiv Kumar hiremath', 'Mmcl1507', '9341110974', 'Gangavati', 'GVT1507', 'user'),
('narappa.gowdru@timesofindia.com', 'Narappa GP', 'Mmcl1508', '9845238195', 'Shimoga', 'SMG1508', 'user'),
('raghavendraorao.inamdar@timesofindia.com', 'Raghavendra', 'Mmcl1509', '9341110885', 'Gulbarga', 'GLB1509', 'user'),
('shiddappa.kashibadiger@timesofindia.com', 'Shiddappa', 'Mmcl1511', '9739996689', 'Belgaum', 'BGM1511', 'user'),
('vinay.gh@timesofindia.com', 'Vinay', 'Mmcl1501', '9739948515', 'Bengaluru', 'BNG1501', 'user'),
('user@gmail.com', 'Generic User', 'user123', '9000000000', 'Generic Location', 'GL0001', 'user');

-- Insert 3 Hardcoded Admins (Role: admin)
INSERT INTO users (email, name, password, phone_number, location, location_code, role) VALUES
('deepak.saluja@timesofindia.com', 'deepak saluja', 'Admin@123', '9999999991', 'Banglore', 'HO001', 'admin'),
('girish.k@timesofindia.com', 'Girish Bhat', 'Admin@123', '9999999992', 'Banglore', 'CORP001', 'admin'),
('lokesh.vgowda@timesofindia.com', 'Lokesh', 'admin123', '9999999993', 'Banglore', 'RO001', 'admin');
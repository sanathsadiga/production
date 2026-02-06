-- Seed: Users Master Data
-- These use INSERT IGNORE to safely skip duplicates if re-run
-- Regular users: 8 | Admins: 2

USE mmcl_production;

INSERT IGNORE INTO users (email, name, password, phone_number, location, location_code, role) VALUES
-- Regular Users
('alvin.pinto@timosofindia.com', 'Alwin Pinto', 'Mmcl1502', '9964023020', 'Mangalore', 'MNG1502', 'user'),
('sanjay.k@timesofindia.com', 'Sanjay Kanekal', 'Mmcl1503', '9341111918', 'Hubli', 'HBL1503', 'user'),
('shivaprasad.n@timesofindia.com', 'Shivprasad', 'Mmcl1505', '9876543212', 'Mysore', 'MYS1505', 'user'),
('gururaj.r@timesofindia.com', 'Gururaj R', 'Mmcl1506', '9483905222', 'Bagalkote', 'BKT1506', 'user'),
('hiremath.s@timeofindia.com', 'Shiv Kumar hiremath', 'Mmcl1507', '9341110974', 'Gangavati', 'GVT1507', 'user'),
('narappa.gowdru@timesofindia.com', 'Narappa GP', 'Mmcl1508', '9845238195', 'Shimoga', 'SMG1508', 'user'),
('raghavendraorao.inamdar@timesofindia.com', 'Raghavendra', 'Mmcl1509', '9341110885', 'Gulbarga', 'GLB1509', 'user'),
('shiddappa.kashibadiger@timesofindia.com', 'Shiddappa', 'Mmcl1511', '9739996689', 'Belgaum', 'BGM1511', 'user'),
('vinay.gh@timesofindia.com', 'Vinay', 'Mmcl1501', '9739948515', 'Bengaluru', 'BNG1501', 'user'),
('user@gmail.com', 'Generic User', 'user123', '9000000000', 'Generic Location', 'GL0001', 'user'),
-- Admin Users
('deepak.saluja@timesofindia.com', 'deepak saluja', 'Admin123', '9999999991', 'Bangalore', 'HO001', 'admin'),
('girish.k@timesofindia.com', 'Girish Bhat', 'Admin123', '9999999992', 'Bangalore', 'CORP001', 'admin'),
('lokesh.vgowda@timesofindia.com', 'Lokesh', 'admin123', '9999999993', 'Bangalore', 'RO001', 'admin');

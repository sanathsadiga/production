USE mmcl_production;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS=0;

DELETE FROM users WHERE id > 0;

-- Insert regular users
INSERT INTO users (email, password, name, phone_number, location, location_code, role) VALUES
('user1@mmcl.com', 'user123', 'User One', '9876543210', 'Mumbai', 'MUM', 'user'),
('user2@mmcl.com', 'user123', 'User Two', '9876543211', 'Delhi', 'DEL', 'user'),
('user3@mmcl.com', 'user123', 'User Three', '9876543212', 'Bangalore', 'BLR', 'user'),
('user4@mmcl.com', 'user123', 'User Four', '9876543213', 'Chennai', 'CHE', 'user'),
('user5@mmcl.com', 'user123', 'User Five', '9876543214', 'Hyderabad', 'HYD', 'user'),
('user6@mmcl.com', 'user123', 'User Six', '9876543215', 'Pune', 'PUN', 'user'),
('user7@mmcl.com', 'user123', 'User Seven', '9876543216', 'Kolkata', 'KOL', 'user'),
('user8@mmcl.com', 'user123', 'User Eight', '9876543217', 'Ahmedabad', 'AHM', 'user'),

-- Insert admin users
('admin1@mmcl.com', 'admin123', 'Admin One', '9876543290', 'Mumbai', 'MUM', 'admin'),
('admin2@mmcl.com', 'admin123', 'Admin Two', '9876543291', 'Delhi', 'DEL', 'admin'),
('admin3@mmcl.com', 'admin123', 'Admin Three', '9876543292', 'Bangalore', 'BLR', 'admin'),

-- Insert test users
('alvin.pinto@timosofindia.com', 'Mmcl@1502', 'Alvin Pinto', '9876543300', 'Mumbai', 'MUM', 'user'),
('deepak.saluja@timesofindia.com', 'Admin@123', 'Deepak Saluja', '9876543301', 'Mumbai', 'MUM', 'admin');

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;
-- Seed: Downtime Reasons Master Data
-- These use INSERT IGNORE to safely skip duplicates if re-run

USE mmcl_production;

INSERT IGNORE INTO downtime_reasons (reason, code) VALUES
('Mechanical down time', 'MDT'),
('Electrical', 'EDT'),
('Ink Issues', 'IK'),
('Web brake', 'WB'),
('Reel change', 'RC'),
('Cleaning', 'CL');

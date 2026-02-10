-- Seed: Newsprint Types Master Data
-- These use INSERT IGNORE to safely skip duplicates if re-run

USE mmcl_production;

INSERT IGNORE INTO newsprint_types (name, code) VALUES
('Ramdas', 'RMD'),
('Shree Lakshmi Tulasi', 'SLT'),
('Imported', 'IMP');

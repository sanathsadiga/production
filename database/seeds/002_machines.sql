-- Seed: Machines Master Data
-- These use INSERT IGNORE to safely skip duplicates if re-run

USE mmcl_production;

INSERT IGNORE INTO machines (name, code) VALUES
('City Line', 'CL'),
('High Line', 'HL'),
('Eco Line', 'EL'),
('News line s30', 'NL');

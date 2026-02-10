USE mmcl_production;-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS=0;DELETE FROM machines WHERE id > 0;INSERT INTO machines (name, code) VALUES('Machine A', 'MA'),('Machine B', 'MB'),('Machine C', 'MC'),('Machine D', 'MD');-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;
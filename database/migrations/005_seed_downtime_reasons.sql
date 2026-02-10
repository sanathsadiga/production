USE mmcl_production;-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS=0;DELETE FROM downtime_reasons WHERE id > 0;INSERT INTO downtime_reasons (reason, code) VALUES('Mechanical Issue', 'MI'),('Software Issue', 'SI'),('Maintenance', 'MT'),('Other', 'OT'),('Power Failure', 'PF'),('Paper Jam', 'PJ');-- Re-enable foreign key checks  
SET FOREIGN_KEY_CHECKS=1;
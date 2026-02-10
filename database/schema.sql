-- MMCL Production Database Schema
-- Version: 2.1.0
-- Created: 2026-02-03

-- Create Database
CREATE DATABASE IF NOT EXISTS mmcl_production;
USE mmcl_production;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS=0;

-- Drop existing tables if they exist (in correct order)
DROP TABLE IF EXISTS downtime_entries;
DROP TABLE IF EXISTS production_records;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS machines;
DROP TABLE IF EXISTS downtime_reasons;
DROP TABLE IF EXISTS newsprint_types;
DROP TABLE IF EXISTS publications;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  location VARCHAR(255),
  location_code VARCHAR(50),
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_location (location)
);

-- Publications Table
CREATE TABLE IF NOT EXISTS publications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(50),
  publication_type ENUM('VK', 'OSP', 'NAMMA') DEFAULT 'OSP',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_type (publication_type)
);

-- Downtime Reasons Table
CREATE TABLE IF NOT EXISTS downtime_reasons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reason VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Machines Table
CREATE TABLE IF NOT EXISTS machines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Newsprint Types Table
CREATE TABLE IF NOT EXISTS newsprint_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Production Records Table
CREATE TABLE IF NOT EXISTS production_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  publication_id INT NULL,
  custom_publication_name VARCHAR(255) NULL,
  po_number INT NOT NULL,
  color_pages INT DEFAULT 0,
  bw_pages INT DEFAULT 0,
  total_pages INT DEFAULT 0,
  machine_id INT NOT NULL,
  lprs_time TIME NOT NULL,
  page_start_time TIME NOT NULL,
  page_end_time TIME NOT NULL,
  newsprint_id INT NULL,
  newsprint_kgs DECIMAL(10, 2) DEFAULT 0,
  plate_consumption INT DEFAULT 0,
  remarks VARCHAR(100),
  record_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE SET NULL,
  FOREIGN KEY (machine_id) REFERENCES machines(id),
  FOREIGN KEY (newsprint_id) REFERENCES newsprint_types(id) ON DELETE SET NULL,
  KEY idx_user_date (user_id, record_date),
  KEY idx_record_date (record_date),
  KEY idx_publication (publication_id),
  KEY idx_machine (machine_id),
  KEY idx_custom_pub (custom_publication_name)
);

-- Downtime Entries Table (stores multiple downtime reasons per production record)
CREATE TABLE IF NOT EXISTS downtime_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  production_record_id INT NOT NULL,
  downtime_reason_id INT NOT NULL,
  downtime_duration TIME NOT NULL DEFAULT '00:00:00',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (production_record_id) REFERENCES production_records(id) ON DELETE CASCADE,
  FOREIGN KEY (downtime_reason_id) REFERENCES downtime_reasons(id) ON DELETE RESTRICT,
  KEY idx_record (production_record_id),
  KEY idx_reason (downtime_reason_id)
);
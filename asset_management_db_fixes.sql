-- Asset Management Database Schema Fixes
-- Run this file to add missing columns and fix database schema issues

-- Add missing branch_id column to asset_categories table
ALTER TABLE elite_yazid.asset_categories ADD COLUMN IF NOT EXISTS branch_id VARCHAR(20) NULL AFTER school_id;

-- Add missing branch_id column to facility_rooms table  
ALTER TABLE elite_yazid.facility_rooms ADD COLUMN IF NOT EXISTS branch_id VARCHAR(20) NULL AFTER school_id;

-- Add missing branch_id column to assets table
ALTER TABLE elite_yazid.assets ADD COLUMN IF NOT EXISTS branch_id VARCHAR(20) NULL AFTER school_id;

-- Ensure all required tables exist with basic structure
CREATE TABLE IF NOT EXISTS elite_yazid.asset_categories (
  category_id VARCHAR(20) PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  parent_category_id VARCHAR(20),
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elite_yazid.facility_rooms (
  room_id VARCHAR(20) PRIMARY KEY,
  room_name VARCHAR(100) NOT NULL,
  room_code VARCHAR(10) NOT NULL,
  description TEXT,
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elite_yazid.assets (
  asset_id VARCHAR(20) PRIMARY KEY,
  asset_name VARCHAR(100) NOT NULL,
  asset_code VARCHAR(20) NOT NULL,
  category_id VARCHAR(20),
  room_id VARCHAR(20),
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20),
  status ENUM('Active', 'Inactive', 'Under Maintenance', 'Damaged') DEFAULT 'Active',
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

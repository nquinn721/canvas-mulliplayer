-- Setup script for local MySQL database
-- Run this in MySQL to create the database and user

-- Create database
CREATE DATABASE IF NOT EXISTS space_fighters CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (if you want to use admin/password as in .env)
CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY 'password';

-- Grant privileges
GRANT ALL PRIVILEGES ON space_fighters.* TO 'admin'@'localhost';

-- Also grant privileges to root user for convenience
GRANT ALL PRIVILEGES ON space_fighters.* TO 'root'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Use the database
USE space_fighters;

-- Show status
SELECT 'Database setup complete!' as Status;
SELECT DATABASE() as CurrentDatabase;
SHOW TABLES;

-- Tables will be created automatically by TypeORM synchronize

-- Space Fighters Database Setup - Production Version
-- Run these commands in your Google Cloud SQL MySQL database

-- Create the database (if not already created)
CREATE DATABASE IF NOT EXISTS space_fighters;
USE space_fighters;

-- Create users table with proper indexes for production
CREATE TABLE IF NOT EXISTS user (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NULL,
    password VARCHAR(255) NULL,
    authProvider ENUM('local', 'google', 'facebook', 'guest') DEFAULT 'local',
    googleId VARCHAR(255) NULL,
    facebookId VARCHAR(255) NULL,
    avatar TEXT NULL,
    displayName VARCHAR(100) DEFAULT 'Unnamed Player',
    role ENUM('guest', 'user', 'admin', 'super_admin') DEFAULT 'user',
    isAdmin BOOLEAN DEFAULT FALSE,
    isActive BOOLEAN DEFAULT TRUE,
    
    -- Game Statistics
    gamesPlayed INT DEFAULT 0,
    gamesWon INT DEFAULT 0,
    totalKills INT DEFAULT 0,
    totalDeaths INT DEFAULT 0,
    totalScore INT DEFAULT 0,
    playerLevel INT DEFAULT 1,
    experience INT DEFAULT 0,
    
    -- Timestamps
    lastLoginAt DATETIME NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_auth_provider (authProvider),
    INDEX idx_google_id (googleId),
    INDEX idx_facebook_id (facebookId),
    INDEX idx_role (role),
    INDEX idx_created_at (createdAt),
    INDEX idx_active_users (isActive, role),
    INDEX idx_game_stats (totalScore, playerLevel),
    INDEX idx_last_login (lastLoginAt)
);

-- Create a production admin user
-- Password is a secure generated password - change this!
INSERT INTO user (
    username, 
    email, 
    password, 
    role, 
    isAdmin, 
    authProvider,
    displayName
) VALUES (
    'admin', 
    'admin@spacefighters.app', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeAn8aQD.cyHy1zAe', -- Change this password!
    'admin', 
    TRUE, 
    'local',
    'Space Fighters Admin'
) ON DUPLICATE KEY UPDATE id=id;

-- Add performance optimization for Cloud SQL
SET GLOBAL innodb_buffer_pool_size = 134217728; -- Adjust based on your instance size

COMMIT;

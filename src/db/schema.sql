-- Jeel Backend Database Schema
-- PostgreSQL Database Setup

-- ============================================
-- Create Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Create Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);

-- ============================================
-- Sample Queries
-- ============================================

-- Find user by email
SELECT * FROM users WHERE LOWER(email) = LOWER('user@example.com');

-- Find user by UUID
SELECT * FROM users WHERE uuid = 'some-uuid-here';

-- Get all users
SELECT id, uuid, name, email, created_at FROM users;

-- Update user
UPDATE users SET name = 'New Name', updated_at = CURRENT_TIMESTAMP WHERE uuid = 'some-uuid-here';

-- Delete user
DELETE FROM users WHERE uuid = 'some-uuid-here';

-- Count total users
SELECT COUNT(*) as total_users FROM users;

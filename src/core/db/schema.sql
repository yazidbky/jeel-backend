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
-- Create OTPs Table
-- ============================================
CREATE TABLE IF NOT EXISTS otps (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otps_user_purpose ON otps(user_id, purpose);

-- ============================================
-- Create Password Reset Tokens Table
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS pending_registrations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);

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

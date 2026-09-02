# PostgreSQL Database Setup Guide

## Overview

Your backend now uses PostgreSQL for data persistence instead of in-memory storage.

# Database Setup Guide

This backend uses MySQL/MariaDB through `mysql2`. The messaging migration adds conversations, participants, messages, attachments, and delivery status tables.

- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (jeel_db)
- `DB_PORT`: Database port (default: 3306)
- `DB_NAME`: Database name (jeel_db)
- `DB_USER`: Database user
## Database Files

### `/src/db/connection.js`

Establishes and manages the PostgreSQL connection pool. All database queries use this connection.

### `/src/db/init.js`

Automatically initializes the database schema when the server starts:
1. **Install MySQL or MariaDB** (if not already installed)
- Creates an index on the email column for faster lookups

### `/src/db/schema.sql`

SQL file containing all table definitions, indexes, and sample queries for reference.

## Setup Steps

1. **Install PostgreSQL** (if not already installed)
   - Download from: https://www.postgresql.org/download/

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Create Database**

   ```sql
   CREATE DATABASE jeel_db;
   ```

4. **Update `.env` file**
   - Set `DB_USER`, `DB_PASSWORD`, and other connection details as needed

5. **Start the Server**

   ```bash
   npm start
   ```

   The database schema will be created automatically on first run.

## Model Functions

### Auth Model (`/src/features/auth/model.js`)

- `findUserByEmail(email)` - Find user by email
- `createUser({ name, email, password })` - Register new user
- `verifyUser(email, password)` - Authenticate user
- `generateToken(user)` - Generate JWT token
- `getUserById(id)` - Get user by UUID

### Users Model (`/src/features/users/model.js`)

- `getAllUsers()` - Get all users
- `getUserByUUID(uuid)` - Get specific user
- `updateUser(uuid, { name, email })` - Update user
- `deleteUser(uuid)` - Delete user
- `getUserCount()` - Get total user count

## Tables

### Users Table

```
Column      | Type                | Details
------------|---------------------|---------------------------------------------
id          | SERIAL PRIMARY KEY  | Auto-incremented integer ID
uuid        | VARCHAR(255)        | Unique identifier for each user
name        | VARCHAR(255)        | User's full name
email       | VARCHAR(255)        | User's email (unique)
password    | VARCHAR(255)        | Hashed password (bcrypt)
created_at  | TIMESTAMP           | Account creation timestamp
updated_at  | TIMESTAMP           | Last update timestamp
```

## Key Features

✅ Persistent data storage with PostgreSQL
✅ UUID-based user identification
✅ Automatic password hashing with bcrypt
✅ JWT token generation for authentication
✅ Email indexing for fast lookups
✅ Automatic database initialization on server start
✅ Connection pooling for better performance

## Troubleshooting

**Connection refused**

- Ensure PostgreSQL is running
- Check DB_HOST, DB_PORT, DB_USER, and DB_PASSWORD in .env

**Database doesn't exist**

- Create it manually: `CREATE DATABASE jeel_db;`
- Or let the init script create tables (database must exist first)

**Permission denied**

- Verify PostgreSQL credentials in .env
- Check that the database user has permission to create tables

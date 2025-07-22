# MySQL Setup Instructions

## Prerequisites

1. **Install MySQL Server** (if not already installed)
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Or use package manager:
     - Windows: `winget install Oracle.MySQL`
     - macOS: `brew install mysql`
     - Ubuntu/Debian: `sudo apt install mysql-server`

2. **Start MySQL Service**
   - Windows: `net start mysql`
   - macOS: `brew services start mysql`
   - Linux: `sudo systemctl start mysql`

## Database Setup

### Option 1: Automated Setup (Recommended)

**Windows:**

```bash
setup-mysql.bat
```

**macOS/Linux:**

```bash
./setup-mysql.sh
```

### Option 2: Manual Setup

1. **Connect to MySQL as root:**

   ```bash
   mysql -u root -p
   ```

2. **Run the setup SQL:**

   ```sql
   source setup-local-db.sql
   ```

3. **Verify setup:**
   ```sql
   USE space_fighters;
   SHOW TABLES;
   ```

## Configuration

The application uses these MySQL settings from `.env`:

```properties
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=admin
DB_PASSWORD=password
DB_DATABASE=space_fighters
```

## Troubleshooting

### Connection Issues

1. **"Access denied for user" errors:**
   - Verify MySQL is running: `mysql --version`
   - Check credentials in `.env` file
   - Ensure user `admin` exists with correct password

2. **"Can't connect to MySQL server" errors:**
   - Start MySQL service
   - Check if port 3306 is available
   - Verify MySQL is bound to localhost

3. **"Unknown database" errors:**
   - Run the setup script again
   - Manually create database: `CREATE DATABASE space_fighters;`

### Reset Database

To completely reset the database:

```sql
DROP DATABASE IF EXISTS space_fighters;
DROP USER IF EXISTS 'admin'@'localhost';
```

Then run the setup script again.

## Starting the Application

Once MySQL is set up:

```bash
npm run start:dev
```

The server should now connect to MySQL successfully!

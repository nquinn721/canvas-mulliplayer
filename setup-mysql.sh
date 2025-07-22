#!/bin/bash

echo "Setting up MySQL database for Space Fighters..."
echo ""
echo "Please make sure MySQL is running and you have root access."
echo ""

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL command line client not found!"
    echo "Please install MySQL and make sure it's in your PATH."
    exit 1
fi

# Run the setup script
echo "Running MySQL setup script..."
mysql -u root -p < setup-local-db.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup completed successfully!"
    echo ""
    echo "You can now start the server with: npm run start:dev"
    echo ""
else
    echo ""
    echo "❌ Database setup failed!"
    echo ""
    echo "Please check:"
    echo "1. MySQL is running"
    echo "2. You have root access"
    echo "3. Root password is correct"
    echo ""
    exit 1
fi

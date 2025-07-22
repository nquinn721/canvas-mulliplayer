#!/bin/bash

# Kill any existing server processes
echo "Killing existing server processes..."

# Kill processes using port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Kill Node.js processes running our server
pkill -f "nest start" 2>/dev/null || true
pkill -f "ts-node src/main.ts" 2>/dev/null || true
pkill -f "canvas-multiplayer-server" 2>/dev/null || true

echo "Existing server processes killed."
echo "You can now start the server safely with: npm run start:dev"

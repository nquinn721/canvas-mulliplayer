# 🚀 Space Fighters Authentication Setup Guide

## 🔧 Database Setup

### 1. MySQL Database Configuration

1. **Create the Database:**

   ```bash
   mysql -u root -p
   ```

   Then run the setup script:

   ```sql
   source database/setup.sql
   ```

2. **Update Environment Variables:**
   Edit `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_DATABASE=space_fighters
   ```

### 2. JWT Configuration

Generate a secure JWT secret:

```bash
# Linux/macOS
openssl rand -base64 32

# Windows
# Use an online generator or set manually
```

Update in `.env`:

```env
JWT_SECRET=your-very-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d
```

### 3. OAuth Setup (Optional)

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
6. Update `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

#### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Set valid redirect URI: `http://localhost:3001/auth/facebook/callback`
5. Update `.env`:
   ```env
   FACEBOOK_APP_ID=your-facebook-app-id
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   ```

## 🏃‍♂️ Running the Application

### Backend (Server)

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev
```

### Frontend (Client)

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🎮 Authentication Features

### ✅ Implemented Features

1. **User Registration & Login**
   - Email/username + password authentication
   - Input validation and secure password hashing
   - JWT token-based sessions

2. **Guest Play**
   - Anonymous users can play without registration
   - Temporary usernames for guest sessions
   - JWT tokens for guest users

3. **Social Authentication (Ready)**
   - Google OAuth integration
   - Facebook OAuth integration
   - Automatic account linking for existing users

4. **Username as Ship Name**
   - Authenticated users' usernames appear as ship names
   - Real-time username updates in game
   - Settings integration for username changes

5. **Admin System**
   - Role-based access control
   - Admin user management endpoints
   - User statistics tracking

### 🎯 Game Integration

- **Ship Names:** Your username becomes your ship name in multiplayer
- **Settings Menu:** Change username anytime (logged-in users only)
- **Guest Mode:** Play immediately without registration
- **Statistics:** Game tracks kills, deaths, level, experience points
- **Reconnection:** Maintains session across game restarts

## 📝 API Endpoints

### Authentication

- `POST /auth/register` - Create new account
- `POST /auth/login` - Sign in
- `POST /auth/guest` - Guest login
- `GET /auth/profile` - Get user profile
- `PUT /auth/username` - Update username
- `GET /auth/verify` - Verify JWT token

### Social Auth

- `POST /auth/google` - Google OAuth login
- `POST /auth/facebook` - Facebook OAuth login

### Admin (Protected)

- `GET /auth/admin/users` - List all users
- `PUT /auth/admin/users/:id/role` - Update user role

## 🎮 WebSocket Events

### Client → Server

- `joinGame` - Join multiplayer game
- `updateUsername` - Change username in real-time
- `heartbeat` - Connection health check

### Server → Client

- `authStatus` - Authentication status
- `usernameUpdated` - Username change confirmation
- `playerId` - Player connection ID

## 🔒 Security Features

- **Password Hashing:** bcrypt with 12 rounds
- **JWT Tokens:** Secure session management
- **Input Validation:** Comprehensive DTO validation
- **Role-Based Access:** Admin vs User permissions
- **Guest Restrictions:** Limited capabilities for guests
- **CORS Protection:** Configured for development/production

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u your_username -p -h localhost space_fighters
```

### JWT Token Issues

- Ensure JWT_SECRET is set in `.env`
- Check token expiration time
- Verify server time synchronization

### WebSocket Connection Issues

- Check CORS configuration in app.module.ts
- Verify client/server ports match
- Check firewall settings

## 📊 Default Admin Account

- **Username:** admin
- **Password:** admin123
- **Email:** admin@spacefighters.local
- ⚠️ **Change password in production!**

## 🚀 Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use secure JWT_SECRET (32+ characters)
3. Configure production database
4. Set up SSL certificates
5. Update CORS origins for your domain
6. Change default admin password

Happy gaming! 🎮✨

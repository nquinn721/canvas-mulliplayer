# OAuth Setup Guide

## Google OAuth Setup

### Step 1: Create Google Cloud Console Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** or **Google OAuth2 API**

### Step 2: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: Canvas Multiplayer Game
   - **Authorized JavaScript origins**:
     - `http://localhost:3001`
     - `http://localhost:5173`
   - **Authorized redirect URIs**:
     - `http://localhost:3001/auth/google/callback`

### Step 3: Get Your Credentials

1. Copy the **Client ID** and **Client Secret**
2. Update your `.env` file:

```properties
GOOGLE_CLIENT_ID=your-actual-google-client-id-here
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret-here
```

## Facebook OAuth Setup

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **Create App** → **Consumer** → **Next**
3. Enter app name: "Canvas Multiplayer Game"

### Step 2: Configure Facebook Login

1. Add **Facebook Login** product to your app
2. Go to **Facebook Login** → **Settings**
3. Add **Valid OAuth Redirect URIs**:
   - `http://localhost:3001/auth/facebook/callback`

### Step 3: Get Your Credentials

1. Go to **Settings** → **Basic**
2. Copy **App ID** and **App Secret**
3. Update your `.env` file:

```properties
FACEBOOK_APP_ID=your-actual-facebook-app-id-here
FACEBOOK_APP_SECRET=your-actual-facebook-app-secret-here
```

## Testing OAuth

After updating your `.env` file:

1. **Restart the server**: `npm run start:dev`
2. **Test Google**: Visit `http://localhost:3001/auth/google`
3. **Test Facebook**: Visit `http://localhost:3001/auth/facebook`

Both should redirect you to the respective OAuth providers.

## Production Notes

- Use HTTPS URLs for production
- Update redirect URIs to match your production domain
- Keep credentials secure and never commit them to version control

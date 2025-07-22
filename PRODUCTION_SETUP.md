# Production Setup Guide

## Google Cloud Configuration

### 1. Set up Google Cloud Secrets

Store sensitive environment variables as secrets in Google Cloud Secret Manager:

```bash
# Set project
gcloud config set project heroic-footing-460117-k8

# Create secrets
echo "your-super-secure-jwt-secret-key" | gcloud secrets create JWT_SECRET --data-file=-
echo "F4~2(DA.J&4ce{[" | gcloud secrets create DB_PASSWORD --data-file=-

# For OAuth (when ready)
echo "your-google-client-id" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo "your-google-client-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
echo "your-facebook-app-id" | gcloud secrets create FACEBOOK_APP_ID --data-file=-
echo "your-facebook-app-secret" | gcloud secrets create FACEBOOK_APP_SECRET --data-file=-
```

### 2. Update Cloud Run to use secrets

Modify the deploy.sh script or Cloud Build to include secret access:

```bash
gcloud run deploy space-fighters-game \
  --set-secrets JWT_SECRET=JWT_SECRET:latest \
  --set-secrets DB_PASSWORD=DB_PASSWORD:latest \
  # ... other configurations
```

### 3. Database Setup

The Cloud SQL instance is already configured:

- **Instance**: heroic-footing-460117-k8:us-central1:stocktrader
- **Database**: space_fighters
- **User**: RStockTrader
- **Connection**: Socket-based via /cloudsql/ path

## Environment Variables

### Production Environment (.env.production)

```
NODE_ENV=production
PORT=3001

# Database (Cloud SQL)
DB_TYPE=mysql
DB_HOST=/cloudsql/heroic-footing-460117-k8:us-central1:stocktrader
DB_PORT=3306
DB_NAME=space_fighters
DB_USERNAME=RStockTrader
DB_PASSWORD=F4~2(DA.J&4ce{[

# JWT (use Secret Manager in production)
JWT_SECRET=your-super-secure-jwt-secret-key

# OAuth (configure when ready)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

## Deployment Process

### Automatic Deployment (Recommended)

The Cloud Build is configured for auto-deploy from your main branch. Simply push to trigger deployment.

### Manual Deployment

```bash
chmod +x deploy.sh
./deploy.sh
```

## Database Migration

Run the database setup script against your Cloud SQL instance:

```bash
# Connect to Cloud SQL
gcloud sql connect stocktrader --user=RStockTrader --database=space_fighters

# Then run the contents of database/setup.sql
```

## Security Checklist

- [ ] JWT_SECRET stored in Secret Manager
- [ ] Database password in Secret Manager
- [ ] OAuth credentials in Secret Manager (when configured)
- [ ] Cloud SQL instance has proper firewall rules
- [ ] Service account has minimal required permissions
- [ ] CORS configured for your domain
- [ ] Rate limiting enabled

## Monitoring

- Health check endpoint: `/health`
- Error logging: Automatically logged to Cloud Logging
- Performance monitoring: Built-in decorators for critical endpoints

## OAuth Setup (Social Login)

### Google OAuth Setup

1. **Google Cloud Console Setup**:

   ```bash
   # Go to https://console.cloud.google.com
   # Enable Google+ API and Google OAuth2 API
   # Create OAuth 2.0 credentials
   ```

2. **Configure OAuth Consent Screen**:
   - Application name: "Space Fighters Game"
   - Authorized domains: your-domain.com
   - Scopes: email, profile

3. **Create OAuth Client ID**:
   - Application type: Web application
   - Authorized redirect URIs:
     - Development: `http://localhost:3001/auth/google/callback`
     - Production: `https://your-cloud-run-service-url/auth/google/callback`

4. **Add to Secret Manager**:
   ```bash
   echo "your-google-client-id" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
   echo "your-google-client-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
   ```

### Facebook OAuth Setup

1. **Facebook Developers Console**:

   ```bash
   # Go to https://developers.facebook.com
   # Create a new app
   # Add Facebook Login product
   ```

2. **Configure Facebook Login**:
   - Valid OAuth Redirect URIs:
     - Development: `http://localhost:3001/auth/facebook/callback`
     - Production: `https://your-cloud-run-service-url/auth/facebook/callback`

3. **Add to Secret Manager**:
   ```bash
   echo "your-facebook-app-id" | gcloud secrets create FACEBOOK_APP_ID --data-file=-
   echo "your-facebook-app-secret" | gcloud secrets create FACEBOOK_APP_SECRET --data-file=-
   ```

### Update Cloud Run Deployment

Add OAuth secrets to your deployment:

```bash
gcloud run deploy space-fighters-game \
  --set-secrets GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest \
  --set-secrets GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest \
  --set-secrets FACEBOOK_APP_ID=FACEBOOK_APP_ID:latest \
  --set-secrets FACEBOOK_APP_SECRET=FACEBOOK_APP_SECRET:latest \
  # ... other configurations
```

## Domain Configuration

To use a custom domain:

1. Map your domain in Cloud Run
2. Update CORS settings in main.ts
3. Update client configuration to point to your domain

## SSL/TLS

Cloud Run automatically provides SSL certificates for your service URL and custom domains.

# Cloud Run Deployment Guide

## Environmental Variables for Production

### Required Secrets (Store in Google Secret Manager)
```bash
# Create these secrets in Google Cloud Secret Manager:
gcloud secrets create JWT_SECRET --data-file=- <<EOF
your-super-secure-jwt-secret-key-minimum-32-characters
EOF

gcloud secrets create DB_PASSWORD --data-file=- <<EOF
your-cloud-sql-database-password
EOF

# Optional: If using OAuth in production
gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=- <<EOF
your-google-oauth-client-secret
EOF

gcloud secrets create FACEBOOK_APP_SECRET --data-file=- <<EOF
your-facebook-app-secret
EOF
```

### Environment Variables Set in Cloud Run

The following environment variables are automatically set by `cloudbuild.yaml`:

#### Database Configuration
- `NODE_ENV=production`
- `PORT=3001`
- `DB_HOST=/cloudsql/heroic-footing-460117-k8:us-central1:stocktrader`
- `DB_SOCKET_PATH=/cloudsql/heroic-footing-460117-k8:us-central1:stocktrader`
- `DB_USERNAME=RStockTrader`
- `DB_DATABASE=space_fighters`

#### Secrets (Retrieved from Secret Manager)
- `DB_PASSWORD` (from Secret Manager)
- `JWT_SECRET` (from Secret Manager)

### Manual Configuration Required

#### OAuth Configuration (if using social login)
```bash
# Update these in Cloud Run service after deployment:
gcloud run services update space-fighters-game \
  --region=us-central1 \
  --set-env-vars="GOOGLE_CLIENT_ID=your-google-client-id,FACEBOOK_APP_ID=your-facebook-app-id,FRONTEND_URL=https://your-frontend-domain.com,GOOGLE_CALLBACK_URL=https://your-backend-domain.com/auth/google/callback,FACEBOOK_CALLBACK_URL=https://your-backend-domain.com/auth/facebook/callback"
```

#### CORS Configuration
```bash
# Update CORS origin for production frontend
gcloud run services update space-fighters-game \
  --region=us-central1 \
  --set-env-vars="CORS_ORIGIN=https://your-frontend-domain.com"
```

## Deployment Process

### 1. Setup Secrets (One-time)
```bash
./setup-secrets.sh
```

### 2. Deploy to Cloud Run
```bash
# Automatic deployment via GitHub push (Cloud Build trigger)
git push origin main

# OR manual deployment
./deploy.sh
```

### 3. Configure Database
```bash
# Connect to Cloud SQL and run setup script
gcloud sql connect stocktrader --user=RStockTrader --database=space_fighters
```
Then run the contents of `database/setup.sql`

### 4. Verify Deployment
```bash
./check-deployment.sh
```

## Environment Variables Mapping

| Variable | Development | Production |
|----------|-------------|------------|
| NODE_ENV | development | production |
| PORT | 3001 | 3001 |
| DB_HOST | localhost | /cloudsql/... |
| DB_PORT | 3306 | undefined (socket) |
| DB_USERNAME | admin | RStockTrader |
| DB_PASSWORD | password | Secret Manager |
| DB_DATABASE | space_fighters | space_fighters |
| JWT_SECRET | dev-secret | Secret Manager |
| FRONTEND_URL | http://localhost:5173 | https://... |

## Security Notes

1. **Never commit real secrets to git**
2. **Use Secret Manager for sensitive data**
3. **Update OAuth callback URLs for production domains**
4. **Configure CORS for production frontend domain**
5. **Use strong JWT secrets (minimum 32 characters)**

## Troubleshooting

### Database Connection Issues
- Verify Cloud SQL instance is running
- Check Cloud SQL connection name matches environment variables
- Ensure Cloud Run service account has Cloud SQL Client role

### OAuth Issues
- Update callback URLs in Google/Facebook developer consoles
- Verify CLIENT_ID and CLIENT_SECRET are correctly set
- Check FRONTEND_URL matches your actual frontend domain

### Secret Manager Issues
- Verify secrets exist: `gcloud secrets list`
- Check service account permissions
- Ensure secret versions are accessible

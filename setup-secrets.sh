#!/bin/bash

# Google Cloud Secrets Setup Script
# Run this once to set up production secrets

set -e

PROJECT_ID="heroic-footing-460117-k8"

echo "🔐 Setting up Google Cloud Secrets for Space Fighters Game..."

# Set the project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "📡 Enabling required APIs..."
gcloud services enable secretmanager.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com

# Create JWT secret (you should replace this with a strong secret)
echo "🔑 Creating JWT_SECRET..."
if ! gcloud secrets describe JWT_SECRET >/dev/null 2>&1; then
  echo "Please enter a strong JWT secret key:"
  read -s JWT_SECRET
  echo "$JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=-
  echo "✅ JWT_SECRET created"
else
  echo "ℹ️ JWT_SECRET already exists"
fi

# Create database password secret
echo "🔑 Creating DB_PASSWORD..."
if ! gcloud secrets describe DB_PASSWORD >/dev/null 2>&1; then
  echo "F4~2(DA.J&4ce{[" | gcloud secrets create DB_PASSWORD --data-file=-
  echo "✅ DB_PASSWORD created"
else
  echo "ℹ️ DB_PASSWORD already exists"
fi

# Grant Cloud Run access to secrets
echo "🔐 Setting up IAM permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant Cloud Build access to secrets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

echo ""
echo "✅ Secrets setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Push your code to trigger auto-deployment"
echo "2. Or run './deploy.sh' for manual deployment"
echo "3. Configure OAuth credentials when ready (see PRODUCTION_SETUP.md)"
echo ""
echo "🌐 Your Cloud SQL instance: heroic-footing-460117-k8:us-central1:stocktrader"
echo "📊 Your database: space_fighters"

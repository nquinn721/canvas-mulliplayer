#!/bin/bash

# Deployment Status Checker
# Checks the status of your Space Fighters Game deployment

PROJECT_ID="heroic-footing-460117-k8"
SERVICE_NAME="space-fighters-game"
REGION="us-central1"

echo "🚀 Space Fighters Game - Deployment Status"
echo "=========================================="

# Set the project
gcloud config set project $PROJECT_ID >/dev/null 2>&1

# Check Cloud Run service
echo ""
echo "🌐 Cloud Run Service Status:"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)' 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$SERVICE_URL" ]; then
  echo "✅ Service deployed: $SERVICE_URL"
  
  # Check service health
  echo ""
  echo "🏥 Health Check:"
  HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/health" || echo "000")
  
  if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Service is healthy"
  else
    echo "❌ Service health check failed (HTTP $HEALTH_STATUS)"
  fi
  
  # Check if game is accessible
  echo ""
  echo "🎮 Game Accessibility:"
  GAME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/" || echo "000")
  
  if [ "$GAME_STATUS" = "200" ]; then
    echo "✅ Game is accessible"
  else
    echo "❌ Game not accessible (HTTP $GAME_STATUS)"
  fi
  
else
  echo "❌ Service not found or not deployed"
fi

# Check Cloud SQL instance
echo ""
echo "🗄️  Cloud SQL Status:"
SQL_STATUS=$(gcloud sql instances describe stocktrader --format 'value(state)' 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "✅ Cloud SQL instance 'stocktrader' is $SQL_STATUS"
else
  echo "❌ Cloud SQL instance 'stocktrader' not found or inaccessible"
fi

# Check recent builds
echo ""
echo "🔨 Recent Cloud Builds:"
gcloud builds list --limit=3 --format="table(id,status,createTime.date('%Y-%m-%d %H:%M:%S'),source.repoSource.branchName)" 2>/dev/null || echo "❌ Unable to fetch build history"

# Check secrets
echo ""
echo "🔐 Required Secrets:"
for secret in JWT_SECRET DB_PASSWORD; do
  if gcloud secrets describe $secret >/dev/null 2>&1; then
    echo "✅ $secret exists"
  else
    echo "❌ $secret missing"
  fi
done

echo ""
echo "📋 Quick Actions:"
echo "- View logs: gcloud logs tail projects/$PROJECT_ID/logs/run.googleapis.com%2Frequests --filter='resource.labels.service_name=\"$SERVICE_NAME\"'"
echo "- Redeploy: ./deploy.sh"
echo "- Setup secrets: ./setup-secrets.sh"
echo ""

if [ ! -z "$SERVICE_URL" ]; then
  echo "🎮 Play the game: $SERVICE_URL"
fi

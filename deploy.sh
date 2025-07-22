#!/bin/bash

# Canvas Multiplayer Game - Manual Deployment Script
# This script builds and deploys the application to Google Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    print_error "No GCP project configured. Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_status "Using project: $PROJECT_ID"

# Check if required APIs are enabled
print_status "Checking required APIs..."

REQUIRED_APIS=("run.googleapis.com" "cloudbuild.googleapis.com" "containerregistry.googleapis.com")

for api in "${REQUIRED_APIS[@]}"; do
    if ! gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        print_warning "API $api is not enabled. Enabling..."
        gcloud services enable "$api"
    else
        print_status "API $api is already enabled"
    fi
done

# Build and deploy
print_status "Building Docker image..."
IMAGE_NAME="gcr.io/$PROJECT_ID/canvas-multiplayer"
TIMESTAMP=$(date +%s)
TAG="$IMAGE_NAME:$TIMESTAMP"

docker build -t "$TAG" -t "$IMAGE_NAME:latest" .

print_status "Pushing image to Container Registry..."
docker push "$TAG"
docker push "$IMAGE_NAME:latest"

print_status "Deploying to Cloud Run..."
#!/bin/bash

# Production deployment script for Google Cloud Run
set -e

PROJECT_ID="heroic-footing-460117-k8"
SERVICE_NAME="space-fighters-game"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Starting production deployment..."

# Set the project
gcloud config set project $PROJECT_ID

# Build and submit to Cloud Build
echo "📦 Building container image..."
gcloud builds submit --tag $IMAGE_NAME

# Deploy to Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME 
  --image $IMAGE_NAME 
  --platform managed 
  --region $REGION 
  --allow-unauthenticated 
  --port 3001 
  --memory 1Gi 
  --cpu 1 
  --max-instances 10 
  --min-instances 0 
  --concurrency 80 
  --timeout 3600 
  --add-cloudsql-instances $PROJECT_ID:$REGION:stocktrader 
  --set-env-vars NODE_ENV=production 
  --set-env-vars DB_HOST=/cloudsql/$PROJECT_ID:$REGION:stocktrader 
  --set-env-vars DB_NAME=space_fighters 
  --set-env-vars DB_USERNAME=RStockTrader

echo "✅ Deployment complete!"
echo "🌍 Service URL: $(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')"

# Get the service URL
SERVICE_URL=$(gcloud run services describe canvas-multiplayer --region=us-central1 --format="value(status.url)")

print_status "Deployment completed!"
print_status "Your game is available at: $SERVICE_URL"
print_status "Health check: $SERVICE_URL/health"

# Test the health endpoint
print_status "Testing health endpoint..."
if curl -f "$SERVICE_URL/health" > /dev/null 2>&1; then
    print_status "Health check passed!"
else
    print_warning "Health check failed. The service might still be starting up."
    print_status "You can check the logs with: gcloud logs tail run.googleapis.com/request --project=$PROJECT_ID"
fi

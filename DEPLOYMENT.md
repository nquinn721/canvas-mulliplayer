# Canvas Multiplayer Game - Cloud Deployment

This repository contains a multiplayer canvas game with automatic Cloud Run deployment.

## Architecture

- **Backend**: NestJS with Socket.IO for real-time multiplayer gameplay
- **Frontend**: React with Vite, served as static files by the backend in production
- **Deployment**: Google Cloud Run with automatic deployments via Cloud Build

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. **Start the development server:**
   ```bash
   npm run start:dev
   ```

3. **Start the client development server:**
   ```bash
   cd client && npm run dev
   ```

4. **Access the game:**
   - Client: http://localhost:5173
   - Server: http://localhost:3001

## Google Cloud Deployment

### Prerequisites

1. Google Cloud Project with billing enabled
2. Enable the following APIs:
   - Cloud Run API
   - Cloud Build API
   - Container Registry API

### Setup Cloud Build Trigger

1. **Connect your repository to Cloud Build:**
   ```bash
   gcloud builds triggers create github \
     --repo-name=canvas-mulliplayer \
     --repo-owner=nquinn721 \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml \
     --description="Deploy Canvas Multiplayer to Cloud Run"
   ```

2. **Grant Cloud Build permissions:**
   ```bash
   # Get your project number
   PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
   
   # Grant Cloud Run Admin role to Cloud Build
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
     --role=roles/run.admin
   
   # Grant IAM Service Account User role
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
     --role=roles/iam.serviceAccountUser
   ```

### Manual Deployment

If you prefer to deploy manually:

1. **Build and deploy:**
   ```bash
   # Set your project ID
   export PROJECT_ID=your-project-id
   
   # Build and push the image
   docker build -t gcr.io/$PROJECT_ID/canvas-multiplayer .
   docker push gcr.io/$PROJECT_ID/canvas-multiplayer
   
   # Deploy to Cloud Run
   gcloud run deploy canvas-multiplayer \
     --image=gcr.io/$PROJECT_ID/canvas-multiplayer \
     --region=us-central1 \
     --platform=managed \
     --allow-unauthenticated \
     --memory=1Gi \
     --cpu=1 \
     --max-instances=10 \
     --set-env-vars=NODE_ENV=production
   ```

### Environment Variables

The following environment variables are available:

- `NODE_ENV`: Set to `production` for production deployment
- `PORT`: Automatically set by Cloud Run
- `FRONTEND_URL`: Optional, for CORS configuration in production

## Features

- Real-time multiplayer gameplay with Socket.IO
- AI bots for single-player and enhanced multiplayer experience
- Experience and leveling system
- Power-ups and weapon upgrades
- Shield system with visual effects
- Persistent audio settings
- Particle effects and smooth animations

## Game Controls

- **Movement**: WASD or Arrow Keys
- **Aim**: Mouse
- **Shoot**: Left Mouse Button (hold for continuous fire)
- **Missile**: Spacebar or 1 key
- **Boost**: Shift key
- **Strafe**: A/D keys (with cooldown)

## Technical Details

### Production Build Process

1. Client is built using Vite and placed in `client/dist`
2. Server is built using NestJS and TypeScript
3. Docker image combines both client and server
4. Static files are served by the NestJS server in production
5. WebSocket connections are handled by Socket.IO

### Health Checks

The application includes health checks for Cloud Run:
- Endpoint: `/health`
- Returns: `{ status: 'healthy', timestamp: 'ISO-8601' }`

### Auto-scaling

Cloud Run configuration:
- Min instances: 0 (scales to zero when not in use)
- Max instances: 10
- Concurrency: 80 requests per instance
- Memory: 1GB per instance
- CPU: 1 vCPU per instance

## Monitoring

Monitor your deployment:
- Cloud Run console: https://console.cloud.google.com/run
- Logs: `gcloud logs tail projects/$PROJECT_ID/logs/run.googleapis.com%2Frequest`

## Troubleshooting

### Common Issues

1. **Build Timeout**: Increase timeout in `cloudbuild.yaml` if needed
2. **Memory Issues**: Increase memory allocation in Cloud Run configuration
3. **CORS Issues**: Check `FRONTEND_URL` environment variable
4. **WebSocket Issues**: Ensure Cloud Run allows WebSocket connections (enabled by default)

### Debugging

View logs:
```bash
gcloud logs tail run.googleapis.com/request --project=$PROJECT_ID
```

### Cost Optimization

- Application scales to zero when not in use
- Pay only for requests and compute time used
- Estimated cost: ~$0.50-2.00/month for light usage

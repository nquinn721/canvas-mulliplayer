import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for development and production
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || true  // Allow configured frontend URL in production
      : 'http://localhost:5173', // Vite dev server for development
    methods: ['GET', 'POST'],
    credentials: true,
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const clientPath = join(process.cwd(), 'client', 'dist');
    app.use(express.static(clientPath));
    
    // Handle client-side routing - serve index.html for non-API routes
    app.getHttpAdapter().get('*', (req, res, next) => {
      if (req.path.startsWith('/socket.io') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(join(clientPath, 'index.html'));
    });
  }

  // Add health check endpoint for Cloud Run
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Use PORT environment variable for Cloud Run or default to 3001
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0'); // Bind to all interfaces for Cloud Run
  console.log(`Game server running on http://0.0.0.0:${port}`);
}

bootstrap();

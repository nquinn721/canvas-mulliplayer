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
    console.log(`Serving static files from: ${clientPath}`);
    
    // Serve static assets (CSS, JS, images, etc.)
    app.use('/assets', express.static(join(clientPath, 'assets')));
    app.use('/vite.svg', express.static(join(clientPath, 'vite.svg')));
    
    // Serve other static files with proper cache headers
    app.use(express.static(clientPath, {
      maxAge: '1d', // Cache static assets for 1 day
      setHeaders: (res, path) => {
        // Don't cache index.html
        if (path.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));
  }

  // Use PORT environment variable for Cloud Run or default to 3001
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0'); // Bind to all interfaces for Cloud Run
  console.log(`Game server running on http://0.0.0.0:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();

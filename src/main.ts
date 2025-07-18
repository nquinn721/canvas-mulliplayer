import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for development
  app.enableCors({
    origin: 'http://localhost:5173', // Vite dev server
    methods: ['GET', 'POST'],
    credentials: true,
  });

  await app.listen(3001);
  console.log('Game server running on http://localhost:3001');
}

bootstrap();

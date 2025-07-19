import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  @Get()
  root(@Res() res: Response) {
    // In production, serve the client app
    if (process.env.NODE_ENV === 'production') {
      res.sendFile(join(process.cwd(), 'client', 'dist', 'index.html'));
    } else {
      // In development, return a simple message
      res.json({ 
        message: 'Canvas Multiplayer Game Server',
        environment: 'development',
        clientUrl: 'http://localhost:5173'
      });
    }
  }

  @Get('health')
  health() {
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

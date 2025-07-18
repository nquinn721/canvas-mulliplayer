import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Canvas Multiplayer Server is running!';
  }
}

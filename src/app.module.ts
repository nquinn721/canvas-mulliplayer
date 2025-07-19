import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { GameGateway } from './game/game.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [GameGateway],
})
export class AppModule {}

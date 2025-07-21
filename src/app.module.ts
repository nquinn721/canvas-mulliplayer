import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AppController } from "./app.controller";
import { ErrorsController } from "./controllers/errors.controller";
import { GlobalExceptionFilter } from "./filters/global-exception.filter";
import { GameGateway } from "./game/game.gateway";
import { ErrorLoggerService } from "./services/error-logger.service";

@Module({
  imports: [],
  controllers: [AppController, ErrorsController],
  providers: [
    GameGateway,
    ErrorLoggerService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}

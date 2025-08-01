import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AuthController } from "./controllers/auth.controller";
import { ErrorsController } from "./controllers/errors.controller";
import { LeaderboardController } from "./controllers/leaderboard.controller";
import { Leaderboard } from "./entities/leaderboard.entity";
import { User } from "./entities/user.entity";
import { GlobalExceptionFilter } from "./filters/global-exception.filter";
import { GameGateway } from "./game/game.gateway";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { AuthService } from "./services/auth.service";
import { ErrorLoggerService } from "./services/error-logger.service";
import { LeaderboardService } from "./services/leaderboard.service";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get("NODE_ENV") === "production";

        const config = {
          type: "mysql" as const,
          username:
            configService.get("SPACE_FIGHTER_DB_USERNAME") ||
            configService.get("DB_USERNAME") ||
            "SpaceFighter",
          password:
            configService.get("SPACE_FIGHTER_DB_PASSWORD") ||
            configService.get("DB_PASSWORD") ||
            "",
          database:
            configService.get("SPACE_FIGHTER_DB_DATABASE") ||
            configService.get("DB_DATABASE") ||
            "space_fighters",
          entities: [User, Leaderboard],
          synchronize: true, // Always enable synchronization
          logging: false, // Disabled SQL logging
          migrations: ["dist/migrations/*.js"],
          migrationsTableName: "migrations",
        };

        if (isProduction) {
          const socketPath =
            configService.get("SPACE_FIGHTER_DB_SOCKET_PATH") ||
            configService.get("DB_SOCKET_PATH") ||
            "/cloudsql/heroic-footing-460117-k8:us-central1:stocktrader";

          return {
            ...config,
            socketPath: socketPath,
            // Remove host and port for production to ensure socket connection
          };
        } else {
          return {
            ...config,
            host: configService.get("DB_HOST") || "localhost",
            port: parseInt(configService.get("DB_PORT")) || 3306,
          };
        }
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Leaderboard]),

    // Authentication modules
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret:
        process.env.SPACE_FIGHTER_JWT_SECRET ||
        process.env.JWT_SECRET ||
        "fallback-secret-key",
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    }),
  ],
  controllers: [
    AppController,
    ErrorsController,
    AuthController,
    LeaderboardController,
  ],
  providers: [
    GameGateway,
    ErrorLoggerService,
    AuthService,
    LeaderboardService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}

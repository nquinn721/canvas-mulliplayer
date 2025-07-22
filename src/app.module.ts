import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AuthController } from "./controllers/auth.controller";
import { ErrorsController } from "./controllers/errors.controller";
import { User } from "./entities/user.entity";
import { GlobalExceptionFilter } from "./filters/global-exception.filter";
import { GameGateway } from "./game/game.gateway";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { AuthService } from "./services/auth.service";
import { ErrorLoggerService } from "./services/error-logger.service";
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
          host: isProduction
            ? configService.get("DB_SOCKET_PATH") ||
              configService.get("DB_HOST")
            : configService.get("DB_HOST") || "localhost",
          port: isProduction
            ? undefined
            : parseInt(configService.get("DB_PORT")) || 3306,
          username: configService.get("DB_USERNAME") || "root",
          password: configService.get("DB_PASSWORD") || "",
          database: configService.get("DB_DATABASE") || "space_fighters",
          entities: [User],
          synchronize: !isProduction,
          logging: !isProduction,
          migrations: ["dist/migrations/*.js"],
          migrationsTableName: "migrations",
        };

        if (isProduction) {
          return {
            ...config,
            extra: {
              socketPath: configService.get("DB_SOCKET_PATH"),
              connectionLimit: 5,
              acquireTimeout: 60000,
              timeout: 60000,
            },
          };
        }

        return config;
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),

    // Authentication modules
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "fallback-secret-key",
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    }),
  ],
  controllers: [AppController, ErrorsController, AuthController],
  providers: [
    GameGateway,
    ErrorLoggerService,
    AuthService,
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

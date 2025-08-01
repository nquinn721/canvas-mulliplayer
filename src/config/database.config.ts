import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: "mysql",
  username:
    process.env.SPACE_FIGHTER_DB_USERNAME || process.env.DB_USERNAME || "admin",
  password:
    process.env.SPACE_FIGHTER_DB_PASSWORD ||
    process.env.DB_PASSWORD ||
    "password",
  database:
    process.env.SPACE_FIGHTER_DB_DATABASE ||
    process.env.DB_DATABASE ||
    "space_fighters",
  entities: [User],
  synchronize: process.env.NODE_ENV !== "production", // Only in development
  logging: false, // Disabled SQL logging
  migrations: ["dist/migrations/*.js"],
  migrationsTableName: "migrations",

  // Production vs development configuration
  ...(process.env.NODE_ENV === "production"
    ? {
        // Cloud SQL configuration - use socketPath directly
        socketPath:
          process.env.SPACE_FIGHTER_DB_SOCKET_PATH ||
          process.env.DB_SOCKET_PATH ||
          "/cloudsql/heroic-footing-460117-k8:us-central1:stocktrader",
        // Remove host and port for production to force socket connection
      }
    : {
        // Development configuration
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT) || 3306,
      }),
};

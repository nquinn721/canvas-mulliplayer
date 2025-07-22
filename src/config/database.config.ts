import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: "mysql",
  host:
    process.env.NODE_ENV === "production"
      ? process.env.DB_SOCKET_PATH || process.env.DB_HOST
      : process.env.DB_HOST || "localhost",
  port:
    process.env.NODE_ENV === "production"
      ? undefined
      : parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_DATABASE || "space_fighters",
  entities: [User],
  synchronize: process.env.NODE_ENV !== "production", // Only in development
  logging: process.env.NODE_ENV === "development",
  migrations: ["dist/migrations/*.js"],
  migrationsTableName: "migrations",

  // Cloud SQL configuration for production
  ...(process.env.NODE_ENV === "production" && {
    extra: {
      socketPath: process.env.DB_SOCKET_PATH,
      connectionLimit: 5,
      acquireTimeout: 60000,
      timeout: 60000,
    },
  }),

  // SSL configuration
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
          ca: undefined,
        }
      : false,

  // Connection pooling for production
  ...(process.env.NODE_ENV === "production" && {
    poolSize: 5,
    keepConnectionAlive: true,
    retryAttempts: 3,
    retryDelay: 3000,
  }),
};

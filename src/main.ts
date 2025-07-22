import { NestFactory } from "@nestjs/core";
import * as express from "express";
import { join } from "path";
// Ensure crypto is available for TypeORM
import { webcrypto } from "crypto";
import { AppModule } from "./app.module";
import { ErrorLoggerService } from "./services/error-logger.service";
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as any;
}

// Check if port is available
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = require("net").createServer();
    server.listen(port, () => {
      server.once("close", () => resolve(true));
      server.close();
    });
    server.on("error", () => resolve(false));
  });
}

// Find next available port
async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    console.log(`Port ${port} is busy, trying ${port + 1}...`);
    port++;
    if (port > startPort + 10) {
      throw new Error(`No available ports found after ${startPort}`);
    }
  }
  return port;
}

async function bootstrap() {
  let errorLogger: ErrorLoggerService;

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nReceived SIGINT, shutting down gracefully...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\nReceived SIGTERM, shutting down gracefully...");
    process.exit(0);
  });

  try {
    const app = await NestFactory.create(AppModule);

    // Get error logger service from the application context
    errorLogger = app.get(ErrorLoggerService);

    // Enable CORS for development and production
    app.enableCors({
      origin:
        process.env.NODE_ENV === "production"
          ? process.env.FRONTEND_URL || true // Allow configured frontend URL in production
          : [
              "http://localhost:5173", // Default Vite dev server
              "http://localhost:5174", // Alternative Vite dev server port
              /^http:\/\/localhost:\d+$/, // Allow any localhost port in development
            ],
      methods: ["GET", "POST"],
      credentials: true,
    });

    // Serve static files in production
    if (process.env.NODE_ENV === "production") {
      const clientPath = join(process.cwd(), "client", "dist");
      console.log(`Serving static files from: ${clientPath}`);

      // Serve static assets (CSS, JS, images, etc.)
      app.use("/assets", express.static(join(clientPath, "assets")));
      app.use("/vite.svg", express.static(join(clientPath, "vite.svg")));

      // Serve other static files with proper cache headers
      app.use(
        express.static(clientPath, {
          maxAge: "1d", // Cache static assets for 1 day
          setHeaders: (res, path) => {
            // Don't cache index.html
            if (path.endsWith("index.html")) {
              res.setHeader(
                "Cache-Control",
                "no-cache, no-store, must-revalidate"
              );
            }
          },
        })
      );
    }

    // Use PORT environment variable for Cloud Run or default to 3001
    const preferredPort = process.env.PORT ? parseInt(process.env.PORT) : 3001;

    // In production (Cloud Run), don't try to find alternative ports
    const port =
      process.env.NODE_ENV === "production"
        ? preferredPort
        : await findAvailablePort(preferredPort);

    if (port !== preferredPort && process.env.NODE_ENV !== "production") {
      console.log(
        `Warning: Preferred port ${preferredPort} was unavailable, using port ${port}`
      );
      await errorLogger.logError({
        type: "SYSTEM",
        severity: "MEDIUM",
        message: `Port conflict: using ${port} instead of ${preferredPort}`,
        metadata: { preferredPort, actualPort: port },
      });
    }

    await app.listen(port, "0.0.0.0"); // Bind to all interfaces for Cloud Run
    console.log(`Game server running on http://0.0.0.0:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

    // Log successful startup
    await errorLogger.logError({
      type: "SYSTEM",
      severity: "LOW",
      message: `Server started successfully on port ${port}`,
      metadata: {
        port,
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        uptime: process.uptime(),
      },
    });
  } catch (error) {
    console.error("Failed to start server:", error);

    // Try to log the error if possible
    if (errorLogger) {
      await errorLogger.logSystemError(error, "CRITICAL");
    } else {
      // Fallback error logging to file if service isn't available
      const fs = require("fs");
      const path = require("path");
      const errorDir = path.join(process.cwd(), "errors");

      if (!fs.existsSync(errorDir)) {
        fs.mkdirSync(errorDir, { recursive: true });
      }

      const errorLog = {
        timestamp: new Date().toISOString(),
        type: "SYSTEM",
        severity: "CRITICAL",
        message: `Bootstrap failed: ${error.message}`,
        stack: error.stack,
        metadata: {
          source: "bootstrap",
          nodeVersion: process.version,
          platform: process.platform,
        },
      };

      fs.appendFileSync(
        path.join(
          errorDir,
          `system-${new Date().toISOString().split("T")[0]}.log`
        ),
        JSON.stringify(errorLog) + "\n"
      );
    }

    process.exit(1);
  }
}

bootstrap();

// Ensure crypto is available for TypeORM - MUST BE FIRST
const crypto = require("crypto");

// Polyfill crypto for the container environment
if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto || {
    randomUUID: () => crypto.randomUUID(),
    getRandomValues: (arr) => crypto.getRandomValues(arr),
    ...crypto,
  };
}

// Also ensure crypto.randomUUID is available at global level
if (!global.crypto) {
  global.crypto = globalThis.crypto;
}

// Global error handlers to catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED PROMISE REJECTION ===');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  if (reason && typeof reason === 'object' && 'stack' in reason) {
    console.error('Stack:', (reason as Error).stack);
  }
});

process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
});

import { NestFactory } from "@nestjs/core";
import * as express from "express";
import { Request, Response } from "express";
import { join } from "path";
import { AppModule } from "./app.module";
import { ErrorLoggerService } from "./services/error-logger.service";

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

    // Set global prefix for API routes to avoid conflicts with static files
    app.setGlobalPrefix("api");

    // Add global exception filter to catch and log all unhandled exceptions
    app.useGlobalFilters({
      catch: (exception: any, host: any) => {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        
        console.error('=== GLOBAL EXCEPTION FILTER ===');
        console.error('Request URL:', request.url);
        console.error('Request method:', request.method);
        console.error('Exception:', exception);
        console.error('Exception stack:', exception?.stack);
        console.error('Exception message:', exception?.message);
        
        const status = exception?.getStatus ? exception.getStatus() : 500;
        response.status(status).json({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: exception?.message || 'Internal server error',
        });
      }
    });

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
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      credentials: true,
    });

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

    // Serve static files in production - BEFORE listening but AFTER NestJS routes
    if (process.env.NODE_ENV === "production") {
      const clientPath = join(process.cwd(), "client", "dist");
      const expressApp = app.getHttpAdapter().getInstance();
      
      console.log(`Setting up static file serving from: ${clientPath}`);

      // Serve static assets (CSS, JS, images, etc.)
      expressApp.use("/assets", express.static(join(clientPath, "assets")));
      expressApp.use("/vite.svg", express.static(join(clientPath, "vite.svg")));

      // Serve other static files with proper cache headers
      expressApp.use(
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

      // SPA fallback - serve index.html for all non-API routes
      // This must come LAST to catch everything not handled by API or static routes
      expressApp.get(/^(?!\/api).*/, (req: Request, res: Response) => {
        console.log(`SPA fallback serving index.html for route: ${req.path}`);
        res.sendFile(join(clientPath, "index.html"));
      });
      
      console.log(`Static file serving configured for production`);
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
